import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button, TextField, Stack, Avatar, Link } from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";
import { getRelativeTime } from "../../utils/timeUtils";

function CommentThread({ comment, allComments, onReply }) {
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyContent, setReplyContent] = useState("");

    const replies = allComments.filter(c => c.parent_comment_id === comment.comment_id);

    //handler for replying to comments
    const handleReplySubmit = () => {
        if (!replyContent.trim()) return;
        onReply(replyContent, comment.comment_id);
        setReplyContent("");
        setShowReplyBox(false);
    };

    const authorLabel = comment.author_name ?? `User ${comment.user_id}`;
    const profilePath = `/users/${comment.user_id}`;

    return (
        <Box sx={{ mt: 1 }}>
            <Card variant="outlined" sx={{ mb: 1 }}>
                <CardContent sx={{ pb: '8px !important' }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Avatar
                            component={RouterLink}
                            to={profilePath}
                            src={comment.avatar_url ? `/uploads/${comment.avatar_url}` : undefined}
                            alt=""
                            aria-label={`View ${authorLabel}'s profile`}
                            sx={{
                                width: 40,
                                height: 40,
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {!comment.avatar_url &&
                                (authorLabel.trim()?.[0]?.toUpperCase() ?? '?')}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                <Link
                                    component={RouterLink}
                                    to={profilePath}
                                    underline="hover"
                                    color="inherit"
                                    sx={{ fontWeight: 600 }}
                                >
                                    {authorLabel}
                                </Link>
                                {' · '}
                                {getRelativeTime(comment.createdAt)}
                            </Typography>
                            <Typography variant="body1">{comment.content}</Typography>
                            <Button
                                size="small"
                                startIcon={<ReplyIcon />}
                                onClick={() => setShowReplyBox(!showReplyBox)}
                                sx={{ mt: 0.5 }}
                            >
                                Reply
                            </Button>

                            {showReplyBox && (
                                <Stack spacing={1} sx={{ mt: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Write a reply..."
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        multiline
                                        rows={2}
                                    />
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" variant="contained" onClick={handleReplySubmit}>
                                            Post Reply
                                        </Button>
                                        <Button size="small" onClick={() => setShowReplyBox(false)}>
                                            Cancel
                                        </Button>
                                    </Stack>
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {replies.length > 0 && (
                <Box sx={{ pl: 3, borderLeft: '2px solid #e0e0e0', ml: 1 }}>
                    {replies.map(reply => (
                        <CommentThread
                            key={reply.comment_id}
                            comment={reply}
                            allComments={allComments}
                            onReply={onReply}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}

export default CommentThread;