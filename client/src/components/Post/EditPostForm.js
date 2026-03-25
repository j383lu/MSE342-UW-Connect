import React, { useState, useEffect } from "react"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Typography, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, Switch,
  FormControlLabel, Box
} from "@mui/material";
//import { withFirebase } from "../Firebase";
import { useUser } from "../../contexts/UserContext";

const predefinedTags = ["FreeFood", "Events", "StudyGroups", "Housing", "Jobs", "Sports", "Clubs", "Intramurals", "Tutoring"];
const MAX_TAGS = 5;

function EditPostForm({ open, onClose, onSubmit, post, firebase }) {
  const { dbUser } = useUser();
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState({ title: "", description: "", tags: "" });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

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

  //pre-populate the fields from the post to edit
  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setDescription(post.description || "");
      setSelectedTags(post.tags || []);
      setSelectedGroup(post.group_id || "");
      setIsAnonymous(post.is_anonymous || false);
      setImageFile(null);
      setRemoveImage(false);
      setImagePreview(post.image_url ? `/uploads/${post.image_url}` : null);
      setError({ title: "", description: "", tags: "" });
    }
  }, [post]);

  const handleSubmit = () => {
    if (!title.trim()) return setError(prev => ({ ...prev, title: "Title is required" }));
    if (title.length < 3) return setError(prev => ({ ...prev, title: "Title must be at least 3 characters" }));
    if (title.length > 100) return setError(prev => ({ ...prev, title: "Title exceeds 100 characters" }));
    if (!description.trim()) return setError(prev => ({ ...prev, description: "Description is required" }));
    if (description.length > 500) return setError(prev => ({ ...prev, description: "Description exceeds 500 characters" }));

    onSubmit({
      title,
      description,
      tags: selectedTags,
      group_id: selectedGroup || null,
      is_anonymous: isAnonymous ? 1 : 0,
      imageFile,
      removeImage
    });
  };

  const handleTagChange = (event, newValue) => {
    if (newValue.length > MAX_TAGS) {
      return setError(prev => ({ ...prev, tags: `You can select up to ${MAX_TAGS} tags` }));
    }
    setSelectedTags(newValue);
    setError(prev => ({ ...prev, tags: "" }));
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Edit Post
      </DialogTitle>

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
            <FormControlLabel
              control={
                <Switch
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
              }
              label="Post anonymously"
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

          {userGroups.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Group</InputLabel>
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
              options={predefinedTags}
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

          <Grid item xs={12}>
            {/* Show current image if exists and no new one selected */}
            {imagePreview && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {imageFile ? "New image:" : "Current image:"}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <img src={imagePreview} alt="preview"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                </Box>
                <Button size="small" color="error" onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  setRemoveImage(true);
                }}>
                  Remove Image
                </Button>
              </Box>
            )}
            <Button variant="outlined" component="label" fullWidth>
              {imagePreview ? "Change Image" : "Attach Image (optional)"}
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }} />
            </Button>
          </Grid>


        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditPostForm;