import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Grid, Typography, Card, CardContent, CardHeader,
    Stack, Chip, Button, TextField, Divider, IconButton, Box, Avatar
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PostCommentThread from "./PostCommentThread";
import { withFirebase } from '../Firebase';
import { getRelativeTime } from "../../utils/timeUtils";
import { renderTextWithLinks } from "../../utils/linkUtils";

function PostDetailPage({ firebase }) {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        fetchPost();
        fetchComments();
    }, [postId]);

    const getToken = async () => {
        return await firebase.auth.currentUser?.getIdToken();
    };

    const fetchPost = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`/api/posts/${postId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setPost(data);
        } catch (err) {
            console.error("Error fetching post:", err);
        }
    };

    const fetchComments = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`/api/posts/${postId}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setComments(data);
        } catch (err) {
            console.error("Error fetching comments:", err);
        }
    };

    // Like toggle - handler for adding new comments
    const handleLikePost = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) { console.error(data.error); return; }
            // Update only the like fields so the rest of the post stays intact
            setPost(prev => ({
                ...prev,
                like_count: data.like_count,
                liked_by_me: data.liked_by_me
            }));
        } catch (err) {
            console.error("Error liking post:", err);
        }
    };

    const handleAddComment = async (content, parentCommentId = null) => {
        try {
            const token = await getToken();
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, parent_comment_id: parentCommentId })
            });
            const data = await response.json();
            if (!response.ok) { console.error(data.error); return; }
            setComments(prev => [...prev, data]);
            setNewComment("");
        } catch (err) {
            console.error("Error adding comment:", err);
        }
    };

    const topLevelComments = comments.filter(c => c.parent_comment_id === null);

    if (!post) return <Typography sx={{ p: 3 }}>Loading...</Typography>;

    return (
        <Grid container spacing={3} sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>

            <Grid item xs={12}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/feed')}>
                    Back to Feed
                </Button>
            </Grid>

            {/* Original post */}
            <Grid item xs={12}>
                <Card>
                    <CardHeader
                        avatar={
                            <Avatar
                                src={post.author_avatar ? `/uploads/${post.author_avatar}` : undefined}
                                sx={{ width: 36, height: 36, bgcolor: '#5D6C5C', fontSize: '0.9rem' }}
                            >
                                {!post.author_avatar && (post.author_name?.[0]?.toUpperCase() ?? '?')}
                            </Avatar>
                        }
                        title={post.title}
                        subheader={`${post.is_anonymous ? 'Anonymous' : (post.author_name ?? 'Unknown')} · ${getRelativeTime(post.createdAt)}`}
                        titleTypographyProps={{
                            variant: 'h6',
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            color: '#17292B'
                        }}
                        subheaderTypographyProps={{
                            fontSize: '0.8rem',
                            color: '#686967'
                        }}
                    />
                    <CardContent>
                        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                            {renderTextWithLinks(post.description)}
                        </Typography>

                        {/* Post image if present */}
                        {post.image_url && (
                            <Box sx={{ mb: 2 }}>
                                <img
                                    src={`/uploads/${post.image_url}`}
                                    alt="post attachment"
                                    style={{
                                        maxWidth: '100%',
                                        borderRadius: 8,
                                        maxHeight: 400,
                                        objectFit: 'cover'
                                    }}
                                />
                            </Box>
                        )}

                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                            {/* Group chip */}
                            {post.group_id && post.group_name && (
                                <Chip
                                    label={post.group_name}
                                    size="small"
                                    color="primary"
                                    //  change
                                    onClick={() => navigate(`/groups/${post.group_id}`)}
                                    sx={{ mb: 1, cursor: 'pointer' }}
                                />
                            )}
                            {/* Regular Tags */}
                            {post.tags && post.tags.length > 0 && (
                                post.tags.map((tag, index) => (
                                    <Chip key={index} label={tag} size="small" sx={{ mb: 1 }} />
                                ))
                            )}
                        </Stack>

                        {/* Like button */}
                        <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                            <IconButton size="small" onClick={handleLikePost}>
                                {post.liked_by_me
                                    ? <FavoriteIcon fontSize="small" color="error" />
                                    : <FavoriteBorderIcon fontSize="small" />}
                            </IconButton>
                            <Typography variant="body2">{post.like_count ?? 0}</Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {/* Comments section */}
            <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Comments ({comments.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1} sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Box>
                        <Button
                            variant="contained"
                            onClick={() => handleAddComment(newComment)}
                            disabled={!newComment.trim()}
                        >
                            Post Comment
                        </Button>
                    </Box>
                </Stack>

                {topLevelComments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No comments yet. Be the first to comment!
                    </Typography>
                ) : (
                    topLevelComments.map(comment => (
                        <PostCommentThread
                            key={comment.comment_id}
                            comment={comment}
                            allComments={comments}
                            onReply={handleAddComment}
                        />
                    ))
                )}
            </Grid>
        </Grid>
    );
}

export default withFirebase(PostDetailPage);