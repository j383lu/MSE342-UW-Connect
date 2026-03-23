import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Grid, Typography, Card, CardContent, CardHeader,
    Stack, Chip, Button, TextField, Divider, IconButton, Box
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PostCommentThread from "./PostCommentThread";
import { getAuth } from 'firebase/auth';

//make util file for this
const getRelativeTime = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now - created) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
};

function PostDetailPage() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        fetchPost();
        fetchComments();
    }, [postId]);

    const getToken = async () => {
    const auth = getAuth();
    return await auth.currentUser?.getIdToken();
    };

    const fetchPost = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`/api/posts/${postId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setPost(data);
        } catch (err) {
            console.error("Error fetching post:", err);
        }
    };

    const fetchComments = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`/api/posts/${postId}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setComments(data);
        } catch (err) {
            console.error("Error fetching comments:", err);
        }
    };

    //handler for adding new comments
   const handleAddComment = async (content, parentCommentId = null) => {
    try {
        const token = await getToken();
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ content, parent_comment_id: parentCommentId })
        });
        const data = await response.json();
        if (!response.ok) { console.error(data.error); return; }
        setComments(prev => [...prev, data]);
        setNewComment("");
    } catch (err) {
        console.error("Error adding comment:", err);
    }
    };

    const topLevelComments = comments.filter(c => c.parent_comment_id === null);

    if (!post) return <Typography sx={{ p: 3 }}>Loading...</Typography>;

    return (
        <Grid container spacing={3} sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>

            <Grid item xs={12}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/feed')}>
                    Back to Feed
                </Button>
            </Grid>

            {/* Original post */}
            <Grid item xs={12}>
                <Card>
                    <CardHeader
                        title={post.title}
                        subheader={getRelativeTime(post.createdAt)}
                    />
                    <CardContent>
                        <Typography variant="body1" sx={{ mb: 2 }}>{post.description}</Typography>

                        {post.tags && post.tags.length > 0 && (
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {post.tags.map((tag, index) => (
                                    <Chip key={index} label={`#${tag}`} size="small" sx={{ mb: 1 }} />
                                ))}
                            </Stack>
                        )}

                        <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                            <IconButton size="small">
                                {post.liked_by_me
                                    ? <FavoriteIcon fontSize="small" color="error" />
                                    : <FavoriteBorderIcon fontSize="small" />}
                            </IconButton>
                            <Typography variant="body2">{post.like_count}</Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {/* Comments section */}
            <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Comments ({comments.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1} sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Box>
                        <Button
                            variant="contained"
                            onClick={() => handleAddComment(newComment)}
                            disabled={!newComment.trim()}
                        >
                            Post Comment
                        </Button>
                    </Box>
                </Stack>

                {topLevelComments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No comments yet. Be the first to comment!
                    </Typography>
                ) : (
                    topLevelComments.map(comment => (
                        <PostCommentThread
                            key={comment.comment_id}
                            comment={comment}
                            allComments={comments}
                            onReply={handleAddComment}
                        />
                    ))
                )}
            </Grid>
        </Grid>
    );
}

export default PostDetailPage;