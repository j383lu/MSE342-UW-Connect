import React, {useState} from "react";
import { Card, CardContent, CardHeader, CardActions,
  Typography, Stack, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions 
} from "@mui/material";

const currentUser = { id : 1};

function PostCard({ post, onDeletePost, onEditPost }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isAuthor = post.author_id === currentUser.id;

  const handleDeleteConfirm = () => {
    onDeletePost(post.post_id);
    setConfirmOpen(false);
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={post.title}
          subheader={new Date(post.createdAt).toLocaleString()}
        />

        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {post.description}
          </Typography>

          {post.tags && post.tags.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {post.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" sx={{ mb: 1 }} />
              ))}
            </Stack>
          )}
        </CardContent>

        {/*only show delete button if current user is the author */}
        {isAuthor && (
          <CardActions>
            <Button size="small" onClick={() => onEditPost(post)}>
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              onClick={() => setConfirmOpen(true)}
            >
              Delete
            </Button>
          </CardActions>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{post.title}"? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PostCard;