import React from "react";
import { Card, CardContent, Typography, CardActions, Button, Stack, Chip, CardHeader } from "@mui/material";


function PostCard({ post }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={post.title}
        subheader={new Date(post.createdAt).toLocaleString()}
      />

      <CardContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {post.description}
        </Typography>

        {/* TAGS SECTION */}
        {post.tags && post.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {post.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default PostCard;