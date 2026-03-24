import React, { useState, useEffect } from "react";
import { Grid, Button, Typography, TextField, Stack, Chip, Box } from "@mui/material";
import PostList from "./PostList";
import CreatePostForm from "./CreatePostForm";
import EditPostForm from "./EditPostForm";
import { withFirebase } from "../Firebase";
import { useUser } from "../../contexts/UserContext";

function Post({ firebase }) {
  const { dbUser, loading } = useUser();
  const [posts, setPosts] = useState([]);
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchError, setSearchError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [activeView, setActiveView] = useState('all');

  useEffect(() => {
    if (!loading && dbUser) {
      fetchPosts();
    }
  }, [dbUser, loading, activeView]);

  const fetchPosts = async () => {
    try {
      const token = await firebase.auth.currentUser?.getIdToken();
      const url = activeView === 'groups'
        ? '/api/posts?filter=mygroups'
        : '/api/posts';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]); // Fallback to empty array if 401 or error
      }

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
      const token = await firebase.auth.currentUser?.getIdToken();
      const response = await fetch(`/api/posts/search?keyword=${encodeURIComponent(searchKeyword)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

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
      const token = await firebase.auth.currentUser?.getIdToken();

      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('content', newPost.description);
      formData.append('tags', JSON.stringify(newPost.tags));
      formData.append('is_anonymous', newPost.is_anonymous ?? 0);
      if (newPost.group_id) {
        formData.append('group_id', newPost.group_id); // only append if actually set
      }
      if (newPost.imageFile) {
        formData.append('image', newPost.imageFile);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          //'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        return;
      }

      // After successful insert, refresh posts
      //setPosts([data.post, ...posts]);\
      await fetchPosts();

      setOpen(false);

    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  // handler for liking posts
  const handleLikePost = async (postId) => {
    try {
      const token = await firebase.auth.currentUser?.getIdToken();
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) { console.error(data.error); return; }
      setPosts(prev => prev.map(p =>
        p.post_id === postId
          ? { ...p, like_count: data.like_count, liked_by_me: data.liked_by_me }
          : p
      ));
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleEditPost = async (updatedFields) => {
    try {
      const token = await firebase.auth.currentUser?.getIdToken();

      const formData = new FormData();
      formData.append('title', updatedFields.title);
      formData.append('content', updatedFields.description);
      formData.append('tags', JSON.stringify(updatedFields.tags));
      formData.append('is_anonymous', updatedFields.is_anonymous ?? 0);
      formData.append('remove_image', updatedFields.removeImage ? '1' : '0');
      if (updatedFields.group_id) {
        formData.append('group_id', updatedFields.group_id);
      }
      if (updatedFields.imageFile) {
        formData.append('image', updatedFields.imageFile);
      }

      const response = await fetch(`/api/posts/${editingPost.post_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) { console.error(data.error); return; }
      await fetchPosts();
      setEditOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error("Error editing post:", error);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const token = await firebase.auth.currentUser?.getIdToken();
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        console.error("Delete failed:", data.error);
        return;
      }
      setPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleTagFilter = async (tagName) => {
    try {
      const token = await firebase.auth.currentUser?.getIdToken();
      const response = await fetch(`/api/posts/tag/${encodeURIComponent(tagName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
    <Grid container spacing={3} sx={{ maxWidth: 800, margin: '0 auto', px: 2 }}>

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
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch();}}
            error={Boolean(searchError)}
            helperText={searchError}
            sx={{
              width: '50%',
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


      <Grid item xs={12}>
        <Box sx={{
          display: 'flex',
          width: '100%',
          background: '#F0F3F0',
          border: '1px solid #D6DFE2',
          borderRadius: '800px',
          padding: '3px',
          gap: '2px'
        }}>
          <Button
            fullWidth
            onClick={() => { setActiveView('all'); setActiveTag(null); }}
            sx={{
              borderRadius: '30px',
              padding: '4px 20px',
              fontSize: '13px',
              textTransform: 'none',
              fontWeight: activeView === 'all' ? 600 : 400,
              background: activeView === 'all' ? '#5D6C5C' : 'transparent',
              color: activeView === 'all' ? '#FDFDF6' : '#686967',
            }}
          >
            All posts
          </Button>

          <Button
            fullWidth
            onClick={() => { setActiveView('groups'); setActiveTag(null); }}
            sx={{
              borderRadius: '30px',
              padding: '4px 20px',
              fontSize: '13px',
              textTransform: 'none',
              fontWeight: activeView === 'groups' ? 600 : 400,
              background: activeView === 'groups' ? '#5D6C5C' : 'transparent',
              color: activeView === 'groups' ? '#FDFDF6' : '#686967',
            }}
          >
            My Groups
          </Button>
        </Box>
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
        firebase={firebase}
      />
    </Grid>
  );
}

export default withFirebase(Post);