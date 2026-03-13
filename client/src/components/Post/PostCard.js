import React, {useState} from "react";
import { Card, CardContent, CardHeader, CardActions,
  Typography, Stack, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"; 
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useNavigate } from "react-router-dom";

const currentUser = { id : 1};

function PostCard({ post, onDeletePost, onEditPost, onLikePost, onTagFilter }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isAuthor = post.author_id === currentUser.id;

  const handleDeleteConfirm = () => {
    onDeletePost(post.post_id);
    setConfirmOpen(false);
  };

  const getRelativeTime = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const seconds = Math.floor((now - created) / 1000);

    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={post.title}
          subheader={getRelativeTime(post.createdAt)}
        />

        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {post.description}
          </Typography>

          {post.tags && post.tags.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {post.tags.map((tag, index) => (
                <Chip 
                  key={index} 
                  label={tag} 
                  size="small" 
                  sx={{ mb: 1 }} 
                  onClick={() => onTagFilter(tag)}
                  />
              ))}
            </Stack>
          )}
        </CardContent>

        <CardActions>
          {/* Like button - visible to everyone */}
          <IconButton data-testid="like-button" onClick={() => onLikePost(post.post_id)} size="small">
            {post.liked_by_me
              ? <FavoriteIcon fontSize="small" color="error" />
              : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {post.like_count}
          </Typography>

          <IconButton size="small" onClick={() => navigate(`/feed/${post.post_id}`)}>
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ mr: 1 }}>
              {post.comment_count ?? 0}
          </Typography>


        {/*only show delete button if current user is the author */}
        {isAuthor && (
          <>
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
          </>
        )}
        </CardActions>
      </Card>

      {/* Confirmation message */}
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