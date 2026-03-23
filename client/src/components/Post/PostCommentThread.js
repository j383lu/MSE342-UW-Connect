import React, { useState } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, Stack } from "@mui/material";
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

    return (
        <Box sx={{ mt: 1 }}>
            <Card variant="outlined" sx={{ mb: 1 }}>
                <CardContent sx={{ pb: '8px !important' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {comment.author_name ?? `User ${comment.user_id}` } · {getRelativeTime(comment.createdAt)}
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