import React, { useState } from "react";
import {
  Card, CardContent, CardHeader, CardActions,
  Typography, Stack, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Divider, Box, Avatar, Menu, MenuItem
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { getRelativeTime } from "../../utils/timeUtils";
import { renderTextWithLinks } from "../../utils/linkUtils";
import { withFirebase } from "../Firebase";

function PostCard({ post, onDeletePost, onEditPost, onLikePost, onTagFilter, firebase }) {
  const navigate = useNavigate();
  const { dbUser } = useUser();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [likedByUsers, setLikedByUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const isAuthor = dbUser?.userId === post.author_id;

  const handleDeleteConfirm = () => {
    onDeletePost(post.post_id);
    setConfirmOpen(false);
  };

  const handleOpenLikes = async () => {
    if (post.like_count === 0) return;
    try {
      const token = await firebase.auth.currentUser?.getIdToken();
      const response = await fetch(`/api/posts/${post.post_id}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setLikedByUsers(data);
      setLikesOpen(true);
    } catch (err) {
      console.error("Error fetching likes:", err);
    }
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={post.title}
          subheader={`${post.is_anonymous ? 'Anonymous' : (post.author_name ?? 'Unknown')} · ${getRelativeTime(post.createdAt)}`}
          action={
            isAuthor && (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    sx: {
                      boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
                      border: '1px solid #D6DFE2',
                      borderRadius: 2,
                      minWidth: 130
                    }
                  }}
                >
                  <MenuItem
                    onClick={() => { onEditPost(post); setAnchorEl(null); }}
                    sx={{ fontSize: '14px', justifyContent: 'space-between' }}
                  >
                    Edit
                    <EditIcon fontSize="small" />
                  </MenuItem>

                  <MenuItem
                    onClick={() => { setConfirmOpen(true); setAnchorEl(null); }}
                    sx={{ fontSize: '14px', justifyContent: 'space-between', color: 'error.main' }}
                  >
                    Delete
                    <DeleteIcon fontSize="small" />
                  </MenuItem>
                </Menu>
              </>
            )
          }
        />

        <CardContent>
          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {renderTextWithLinks(post.description)}
          </Typography>

          {post.image_url && (
            <Box sx={{ mb: 2 }}>
              <img
                src={`/uploads/${post.image_url}`}
                alt="post attachment"
                style={{
                  maxWidth: '100%',
                  borderRadius: 8,
                  maxHeight: 300,
                  objectFit: 'cover'
                }}
              />
            </Box>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {post.group_id && post.group_name && (
              <Chip
                label={post.group_name}
                size="small"
                color="primary"
                onClick={() => navigate(`/groups/${post.group_id}`)}
                sx={{ mb: 1, cursor: 'pointer' }}
              />
            )}

            {post.tags?.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{ mb: 1 }}
                onClick={() => onTagFilter?.(tag)}
              />
            ))}
          </Stack>
        </CardContent>

        <CardActions>
          <IconButton
            data-testid="like-button"
            onClick={() => onLikePost?.(post.post_id)}
            size="small"
          >
            {post.liked_by_me
              ? <FavoriteIcon fontSize="small" color="error" />
              : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>

          <Typography
            variant="body2"
            sx={{
              mr: 1,
              cursor: post.like_count > 0 ? 'pointer' : 'default',
              textDecoration: post.like_count > 0 ? 'underline' : 'none'
            }}
            onClick={handleOpenLikes}
          >
            {post.like_count}
          </Typography>

          <IconButton
            size="small"
            onClick={() => navigate(`/feed/${post.post_id}`)}
          >
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>

          <Typography variant="body2">
            {post.comment_count ?? 0}
          </Typography>
        </CardActions>
      </Card>

      {/* Delete Dialog */}
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

      {/* Likes Dialog */}
      <Dialog
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
        PaperProps={{
          sx: { width: 400, maxWidth: '90vw', borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontSize: '0.95rem'
        }}>
          Likes
          <IconButton onClick={() => setLikesOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 0, maxHeight: 350, overflowY: 'auto' }}>
          {likedByUsers.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">
              No likes yet
            </Typography>
          ) : (
            likedByUsers.map(user => (
              <Box
                key={user.user_id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.2
                }}
              >
                <Avatar
                  src={user.avatar_url ? `/uploads/${user.avatar_url}` : undefined}
                >
                  {!user.avatar_url && (user.display_name?.[0]?.toUpperCase() ?? '?')}
                </Avatar>

                <Typography variant="body2">
                  {user.display_name ?? `User ${user.user_id}`}
                </Typography>
              </Box>
            ))
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withFirebase(PostCard);