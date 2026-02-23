import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography
} from "@mui/material";


function CreatePostForm({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState({
    title: "",
    description: "",
  });

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

    setError({
      title: "",
      description: ""
    });

    const tagArray = tags.split(",").map(tag => tag.trim());

    onSubmit({
      title,
      description,
      tags: tagArray
    });
    
    setTitle("");
    setDescription("");
    setTags("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="h6">
          Create a New Post
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(prev => ({ ...prev, title: "" }));
              }}
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
              onChange={(e) => {
                setDescription(e.target.value);
                setError(prev => ({ ...prev, description: "" }));
              }}
              error={Boolean(error.description)} 
              helperText={error.description}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </Grid>

        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreatePostForm;