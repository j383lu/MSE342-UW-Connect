import mysql from 'mysql';
import config from './config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, "client/build")));

// API Routes
// TODO: Implement the following endpoints:
// GET /api/movies - retrieve all movies from database  
// POST /api/reviews - create a new movie review

// Post /api/posts - create a new post
app.post('/api/posts', (req, res) => {
    let connection = mysql.createConnection(config);


    let { title, content, group_id = null, is_anonymous = 0, image_url = null, tags = [] } = req.body;
    let author_id = 1; // Placeholder for now, should be replaced with actual user ID from authentication

    let postSql = 'INSERT INTO Posts (author_id, group_id, title, content, is_anonymous, image_url) VALUES (?, ?, ?, ?, ?, ?)';
    let postData = [author_id, group_id, title, content, is_anonymous, image_url];
    
    connection.query(postSql, postData, (err, result) => {
        if (err) {
            console.error(err);
            connection.end();
            return res.status(500).send('Error creating post');
        } 

        let postId = result.insertId;

        // Insert tags into post_tags table
        if (tags.length > 0) {
            let placeholders = tags.map(() => '?').join(', ');
            let tagSql = 'SELECT tag_id, tag_name FROM Tags WHERE tag_name IN (' + placeholders + ')';


            //let tagData = tags.map(tag => [postId, tag]);
            connection.query(tagSql, tags, (err, tagResult) => {
                if (err) {
                    console.error(err);
                    connection.end();
                    return res.status(500).send('Error creating post tags');
                }

                let postTagData = tagResult.map(tag => [postId, tag.tag_id]);
                if (postTagData.length > 0) {
                    let postTagSql = 'INSERT INTO post_tags (post_id, tag_id) VALUES ?';
                    connection.query(postTagSql, [postTagData], (err) => {
                        connection.end();
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Error creating post tags');
                        } 
                        res.json({
                            post: {
                                post_id: postId,
                                title,
                                description: content,
                                tags: tagResult.map(t => t.tag_name),
                                createdAt: new Date().toISOString()
                            },
                            message: 'Post created successfully with tags'  
                        });                  
                    });
                } else {
                    connection.end();
                    res.json({
                        post: { post_id: postId, title, description: content, tags: [], createdAt: new Date().toISOString() },
                        message: 'Post created successfully but no valid tags found'
                    });                
                }
            });
        } else {
            connection.end();
            res.json({
                post: { post_id: postId, title, description: content, tags: [], createdAt: new Date().toISOString() },
                message: 'Post created successfully without tags'
            });
        }

    });
});

// GET API for posts
app.get('/api/posts', (req, res) => {
    let connection = mysql.createConnection(config);

    let sql = `
         SELECT p.post_id, p.title, p.content, p.author_id, p.group_id,
               p.is_anonymous, p.image_url, p.created_at AS createdAt,
               GROUP_CONCAT(t.tag_name) AS tags
        FROM Posts p
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        GROUP BY p.post_id
        ORDER BY p.post_id DESC
    `;

    connection.query(sql, (err, results) => {
        connection.end();

        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving posts');
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            title: post.title,
            description: post.content, // <-- map content to description
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null

        }));

        res.json(formattedPosts);
    });
});

// GET API for seraching posts
app.get('/api/posts/search', (req, res) => {
    const { keyword } = req.query;

    if (!keyword || keyword.trim() === "") {
        return res.status(400).json({ error: "Please enter a keyword to search" });
    }

    const connection = mysql.createConnection(config);

    const searchSql = `
        SELECT p.post_id, p.title, p.content AS description, p.created_at AS createdAt,
        GROUP_CONCAT(t.tag_name) AS tags
        FROM Posts p
        LEFT JOIN post_tags pt ON p.post_id = pt.post_id
        LEFT JOIN Tags t ON pt.tag_id = t.tag_id
        WHERE LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?
        GROUP BY p.post_id
        ORDER BY p.created_at DESC
        LIMIT 50
    `;

    const keywordParam = `%${keyword.toLowerCase()}%`;

    connection.query(searchSql, [keywordParam, keywordParam], (err, results) => {
        connection.end();
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while searching posts" });
        }

        const formattedPosts = results.map(post => ({
            post_id: post.post_id,
            title: post.title,
            description: post.description,
            tags: post.tags ? post.tags.split(',') : [],
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null
        }));

        if (formattedPosts.length === 0) {
            return res.json({ message: "No results found.", posts: [] });
        }

        res.json({ posts: formattedPosts });
    });
});


app.listen(port, () => console.log(`Listening on port ${port}`)); //for the dev version
