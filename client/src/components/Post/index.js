import React, { useState } from "react";
import { Grid, Button, Typography } from "@mui/material";
import PostList from "./PostList";
import CreatePostForm from "./CreatePostForm";

function Post() {
  const [posts, setPosts] = useState([]);
  const [open, setOpen] = useState(false);

  const handleCreatePost = (newPost) => {
    const postWithDate = {
      ...newPost,
      createdAt: new Date().toISOString()
    };

    setPosts([postWithDate, ...posts]);
    setOpen(false);
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