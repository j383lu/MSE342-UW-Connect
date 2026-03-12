import React from "react";
import PostCard from "./PostCard";
import { Grid } from "@mui/material";



function PostList({ posts, onDeletePost, onEditPost, onLikePost, onTagFilter }) {
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