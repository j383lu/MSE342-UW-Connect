import React, {useState} from "react";
import { Card, CardContent, CardHeader, CardActions,
  Typography, Stack, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"; 
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { getRelativeTime } from "../../utils/timeUtils";
import { renderTextWithLinks } from "../../utils/linkUtils";

//const currentUser = { id : 1};

function PostCard({ post, onDeletePost, onEditPost, onLikePost, onTagFilter }) {
  const navigate = useNavigate();
  const { dbUser } = useUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

// uses real numeric user ID from UserContext instead of hardcoded 1
  const isAuthor = dbUser && post.author_id === dbUser.userId;

  const handleDeleteConfirm = () => {
    onDeletePost(post.post_id);
    setConfirmOpen(false);
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={post.title}
          subheader={`${post.author_name ?? 'Unknown'} · ${getRelativeTime(post.createdAt)}`}
        />

        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {renderTextWithLinks(post.description)}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {/* Group chip — navigates to group page */}
            {post.group_id && post.group_name && (
              <Chip
                label={`${post.group_name}`}
                size="small"
                color="primary"
                //edit this to go to actual group page
                onClick={() => navigate(`/groups/${post.group_id}`)}
                sx={{ mb: 1, cursor: 'pointer' }}
              />
            )}

            {/* Regular tags */}
            {post.tags && post.tags.length > 0 && (
              post.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{ mb: 1 }}
                  onClick={() => onTagFilter(tag)}
                />
              ))
            )}
          </Stack>
        </CardContent>

        <CardActions>
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

          {/* Edit/Delete only shown to the actual author */}
          {isAuthor && (
            <>
              <Button size="small" onClick={() => onEditPost(post)}>Edit</Button>
              <Button size="small" color="error" onClick={() => setConfirmOpen(true)}>Delete</Button>
            </>
          )}
        </CardActions>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{post.title}"? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PostCard;