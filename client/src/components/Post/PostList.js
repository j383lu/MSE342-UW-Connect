import React from "react";
import PostCard from "./PostCard";
import { Grid } from "@mui/material";



function PostList({ posts, onDeletePost }) {
  return (
    <Grid container spacing={2}>
      {posts.map((post, index) => (
        <Grid item xs={12} key={index}>
          <PostCard post={post} onDeletePost={onDeletePost}/>
        </Grid>
      ))}
    </Grid>
  );
}

export default PostList;