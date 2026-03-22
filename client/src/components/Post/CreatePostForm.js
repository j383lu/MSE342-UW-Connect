import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Autocomplete,
  FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { useUser } from "../../contexts/UserContext"; // adjust path if needed
import { withFirebase } from "../Firebase";           // adjust path if needed

function CreatePostForm({ open, onClose, onSubmit, firebase }) {
  const predefined_Tags = [
    "FreeFood", "Events", "StudyGroups", "Housing",
    "Jobs", "Sports", "Clubs", "Intramurals", "Tutoring"
  ];
  const max_tags = 5;

  const { dbUser } = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setTags] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [userGroups, setUserGroups] = useState([]);
  const [error, setError] = useState({ title: "", description: "", tags: "" });

  // Fetch the groups this user belongs to when the form opens
  useEffect(() => {
    if (!open || !dbUser?.userId) return;

    const fetchGroups = async () => {
        try {
            const token = await firebase.auth.currentUser?.getIdToken();
            const response = await fetch(`/api/users/${dbUser.userId}/groups/member`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUserGroups(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching groups:", err);
        }
    };

    fetchGroups();
}, [open, dbUser, firebase.auth.currentUser]);

  const handleSubmit = () => {
    if (!title.trim()) {
      setError(prev => ({ ...prev, title: "Title is a required field" }));
      return;
    }
    if (title.length > 100) {
      setError(prev => ({ ...prev, title: "Title exceeds maximum length" }));
      return;
    }
    if (title.length < 3) {
      setError(prev => ({ ...prev, title: "Title must be at least 3 characters" }));
      return;
    }
    if (!description.trim()) {
      setError(prev => ({ ...prev, description: "Description is a required field" }));
      return;
    }
    if (description.length > 500) {
      setError(prev => ({ ...prev, description: "You have exceeded the character limit of 500 characters" }));
      return;
    }

    setError({ title: "", description: "", tags: "" });
    onSubmit({
      title,
      description,
      tags: selectedTags,
      group_id: selectedGroup || null  // null if no group selected
    });

    // reset form
    setTitle("");
    setDescription("");
    setTags([]);
    setSelectedGroup("");
  };

  const handleTagChange = (event, newValue) => {
    if (newValue.length > max_tags) {
      setError(prev => ({ ...prev, tags: `You can select up to ${max_tags} tags` }));
      return;
    }
    setTags(newValue);
    setError(prev => ({ ...prev, tags: "" }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create a New Post</DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(prev => ({ ...prev, title: "" })); }}
              error={Boolean(error.title)}
              helperText={error.title}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setError(prev => ({ ...prev, description: "" })); }}
              error={Boolean(error.description)}
              helperText={error.description}
            />
          </Grid>

          {/* Group dropdown — only shows if user belongs to at least one group */}
          {userGroups.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Link to a Group (optional)</InputLabel>
                <Select
                  value={selectedGroup}
                  label="Link to a Group (optional)"
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {userGroups.map(group => (
                    <MenuItem key={group.group_id} value={group.group_id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={predefined_Tags}
              value={selectedTags}
              onChange={handleTagChange}
              filterSelectedOptions
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  error={Boolean(error.tags)}
                  helperText={error.tags}
                />
              )}
            />
          </Grid>

        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}

export default withFirebase(CreatePostForm);