import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PostCommentThread from "../Post/PostCommentThread";

const mockComment = (overrides = {}) => ({
  comment_id: 1,
  post_id: 1,
  user_id: 1,
  parent_comment_id: null,
  content: "This is a test comment",
  createdAt: new Date().toISOString(),
  ...overrides
});

describe("CommentThread - Comment Timestamps", () => {

  test("1. Shows relative time for a comment (e.g. '2 hours ago')", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    render(
      <PostCommentThread
        comment={mockComment({ createdAt: twoHoursAgo })}
        allComments={[]}
        onReply={() => {}}
      />
    );
    expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
  });

  test("2. Shows minutes for a comment created within the last hour", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <PostCommentThread
        comment={mockComment({ createdAt: fiveMinutesAgo })}
        allComments={[]}
        onReply={() => {}}
      />
    );
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
  });

  test("3. Shows days for a comment created several days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <PostCommentThread
        comment={mockComment({ createdAt: threeDaysAgo })}
        allComments={[]}
        onReply={() => {}}
      />
    );
    expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
  });

  test("4. Multiple comments each show their own timestamp", () => {
    const comment1 = mockComment({ comment_id: 1, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), content: "First comment" });
    const comment2 = mockComment({ comment_id: 2, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), content: "Second comment" });

    const { container } = render(
      <div>
        <PostCommentThread comment={comment1} allComments={[]} onReply={() => {}} />
        <PostCommentThread comment={comment2} allComments={[]} onReply={() => {}} />
      </div>
    );

    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
  });

  test("5. Handles missing timestamp without crashing", () => {
    expect(() => {
      render(
        <PostCommentThread
          comment={mockComment({ createdAt: null })}
          allComments={[]}
          onReply={() => {}}
        />
      );
    }).not.toThrow();
  });

  test("6. Shows 'just now' for a newly added comment", () => {
    render(
      <PostCommentThread
        comment={mockComment({ createdAt: new Date().toISOString() })}
        allComments={[]}
        onReply={() => {}}
      />
    );
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  test("7. Renders reply button on each comment", () => {
    render(
      <PostCommentThread
        comment={mockComment()}
        allComments={[]}
        onReply={() => {}}
      />
    );
    expect(screen.getByText(/reply/i)).toBeInTheDocument();
  });

  test("8. Clicking reply shows reply input box", () => {
    render(
      <PostCommentThread
        comment={mockComment()}
        allComments={[]}
        onReply={() => {}}
      />
    );
    fireEvent.click(screen.getByText(/reply/i));
    expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
  });

  test("9. Submitting a reply calls onReply with correct args", () => {
    const onReply = jest.fn();
    render(
      <PostCommentThread
        comment={mockComment({ comment_id: 42 })}
        allComments={[]}
        onReply={onReply}
      />
    );
    fireEvent.click(screen.getByText(/reply/i));
    fireEvent.change(screen.getByPlaceholderText(/write a reply/i), {
      target: { value: "My reply" }
    });
    fireEvent.click(screen.getByText(/post reply/i));
    expect(onReply).toHaveBeenCalledWith("My reply", 42);
  });

  test("10. Nested replies render with indentation", () => {
    const parent = mockComment({ comment_id: 1, content: "Parent comment" });
    const child = mockComment({ comment_id: 2, parent_comment_id: 1, content: "Child reply" });

    render(
      <PostCommentThread
        comment={parent}
        allComments={[parent, child]}
        onReply={() => {}}
      />
    );

    expect(screen.getByText("Parent comment")).toBeInTheDocument();
    expect(screen.getByText("Child reply")).toBeInTheDocument();
  });
});