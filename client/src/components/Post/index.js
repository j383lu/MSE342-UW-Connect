import React, { useState, useEffect } from "react";
import { Grid, Button, Typography, TextField, Stack, Chip } from "@mui/material";
import PostList from "./PostList";
import CreatePostForm from "./CreatePostForm";
import EditPostForm from "./EditPostForm";

function Post() {
  const [posts, setPosts] = useState([]);
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchError, setSearchError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

   useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  // to update the reset button
  const handleReset = () => {
    fetchPosts();
    setActiveTag(null);
    setSearchKeyword("");
    setSearchError("");
};

  // Search function
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchError("Please enter a keyword to search");
      return;
    }

    try {
      const response = await fetch(`/api/posts/search?keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await response.json();
      console.log(data)

      if (data.posts) {
        setPosts(data.posts);
        setSearchError("");
      } else {
        setPosts([]);
        setSearchError(data.message || "No results found.");
      }
    } catch (err) {
      console.error("Error searching posts:", err);
      setSearchError("Error occurred while searching.");
    }
  };


  // create post
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
      setPosts([data.post, ...posts]);

      setOpen(false);

    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  // handler for liking posts
  const handleLikePost = async (postId) => {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        const data = await response.json();

        if (!response.ok) {
            console.error(data.error);
            return;
        }

        setPosts(prev => prev.map(p =>
            p.post_id === postId
                ? { ...p, like_count: data.like_count, liked_by_me: data.liked_by_me }
                : p
        ));
    } catch (error) {
        console.error("Error liking post:", error);
    }
  };

  // edit post handler
  const handleEditPost = async (updatedFields) => {
    try {
        const response = await fetch(`/api/posts/${editingPost.post_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: updatedFields.title,
                content: updatedFields.description, // backend expects "content"
                tags: updatedFields.tags
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(data.error);
            return;
        }

        // Update just that post in state
        setPosts(prev => prev.map(p =>
            p.post_id === editingPost.post_id ? { ...p, ...data.post } : p
        ));
        setEditOpen(false);
        setEditingPost(null);
    } catch (error) {
        console.error("Error editing post:", error);
    }
  };

   // to delete the post
  const handleDeletePost = async (postId) => {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error("Delete failed:", data.error);
            return;
        }

        //remove deleted post from state
        setPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (error) {
        console.error("Error deleting post:", error);
    }
  };  

  // for tag filtering
  const handleTagFilter = async (tagName) => {
    try {
        const response = await fetch(`/api/posts/tag/${encodeURIComponent(tagName)}`);
        const data = await response.json();

        if (data.posts && data.posts.length > 0) {
            setPosts(data.posts);
            setActiveTag(tagName);
            setSearchError("");
        } else {
            setPosts([]);
            setActiveTag(tagName);
            setSearchError(`No posts found for #${tagName}`);
        }
    } catch (err) {
        console.error("Error filtering by tag:", err);
        setSearchError("Error occurred while filtering.");
    }
};

  return (
    <Grid container spacing={3} sx={{ maxWidth: 800, margin: '0 auto', px:2}}>

      {/* Header Section */}
      <Grid item xs={12}>
        <Typography variant="h4">
          Posts
        </Typography>
      </Grid>

      {/* Search Bar */}
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <TextField
            label="Search posts..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            error={Boolean(searchError)}
            helperText={searchError}
            sx={{ width: '50%', 
                  '& .MuiOutlinedInput-root': {
                  borderRadius: '50px',    
                },
              }}
          />
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Reset
          </Button>
        </Stack>
        {/* Active tag indicator */}
        {activeTag && (
          <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
            Filtering by:
            </Typography>
            <Chip
                label={`#${activeTag}`}
                onDelete={handleReset}
                color="primary"
                size="small"
            />
        </Stack>
      )}

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
        <PostList 
        posts={posts}
        onDeletePost={handleDeletePost}
        onEditPost={(post) => { setEditingPost(post); setEditOpen(true); }}
        onLikePost={handleLikePost}
        onTagFilter={handleTagFilter}
        />
      </Grid>

      <CreatePostForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleCreatePost}
      />

      <EditPostForm
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditingPost(null); }}
        onSubmit={handleEditPost}
        post={editingPost}
      />
    </Grid>
  );
}

export default Post;