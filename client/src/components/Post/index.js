import React, { useState, useEffect } from "react";
import { Grid, Button, Typography } from "@mui/material";
import PostList from "./PostList";
import CreatePostForm from "./CreatePostForm";

function Post() {
  const [posts, setPosts] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (newPost) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.description, // backend expects "content"
          tags: newPost.tags
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        return;
      }

      // After successful insert, refresh posts
      fetchPosts();

      setOpen(false);

  } catch (error) {
    console.error("Error creating post:", error);
  }
};

  return (
    <Grid container spacing={3}>

      {/* Header Section */}
      <Grid item xs={12}>
        <Typography variant="h4">
          Posts
        </Typography>
      </Grid>

      {/* Create Button */}
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
        >
          Create Post
        </Button>
      </Grid>

      {/* Post List */}
      <Grid item xs={12}>
        <PostList posts={posts} />
      </Grid>

      <CreatePostForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleCreatePost}
      />
    </Grid>
  );
}

export default Post;