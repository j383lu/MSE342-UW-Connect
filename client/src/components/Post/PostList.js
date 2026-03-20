import React from "react";
import PostCard from "./PostCard";
import { Grid, Box, Typography } from "@mui/material";



function PostList({ posts, onDeletePost, onEditPost, onLikePost, onTagFilter }) {
  if (!Array.isArray(posts)) {
    return (
      <Box sx={{ textAlign: 'center', py: 5 }}>
        <Typography variant="h6" color="text.secondary">
          Unable to load posts. Please check your login status.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {posts.map((post, index) => (
        <Grid item xs={12} key={index}>
          <PostCard 
            post={post} 
            onDeletePost={onDeletePost}
            onEditPost={onEditPost}
            onLikePost={onLikePost}
            onTagFilter={onTagFilter}
            />
        </Grid>
      ))}
    </Grid>
  );
}

export default PostList;