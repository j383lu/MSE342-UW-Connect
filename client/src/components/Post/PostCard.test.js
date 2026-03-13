import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import PostCard from "../Post/PostCard";


const renderCard = (props = {}) => {
  render(
    <MemoryRouter>
      <PostCard {...defaultProps} {...props} />
    </MemoryRouter>
  );
};

const mockPost = {
  post_id: 1,
  author_id: 1,
  title: "Study Group",
  description: "Looking for study partners",
  createdAt: new Date().toISOString(),
  tags: ["Events", "StudyGroups"],
  like_count: 5,
  liked_by_me: false,
  comment_count: 3
};

const defaultProps = {
  post: mockPost,
  onDeletePost: jest.fn(),
  onEditPost: jest.fn(),
  onLikePost: jest.fn(),
  onTagFilter: jest.fn()
};

describe("PostCard", () => {

  it("renders title and description", () => {
    renderCard();
    expect(screen.getByText("Study Group")).toBeInTheDocument();
    expect(screen.getByText("Looking for study partners")).toBeInTheDocument();
  });

  it("renders relative timestamp", () => {
    renderCard();
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderCard();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("StudyGroups")).toBeInTheDocument();
  });

  it("renders like count", () => {
    renderCard();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows delete and edit buttons for post author", () => {
    renderCard();
    expect(screen.getByText(/delete/i)).toBeInTheDocument();
    expect(screen.getByText(/edit/i)).toBeInTheDocument();
  });

  it("does not show delete or edit buttons for non-author", () => {
    renderCard({ post: { ...mockPost, author_id: 99 } });
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
  });

  it("shows confirmation dialog when delete is clicked", () => {
    renderCard();
    fireEvent.click(screen.getByText(/delete/i));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it("cancelling delete keeps post visible", () => {
    renderCard();
    fireEvent.click(screen.getByText(/delete/i));
    fireEvent.click(screen.getByText(/cancel/i));
    expect(screen.getByText("Study Group")).toBeInTheDocument();
  });

  it("calls onLikePost when like button is clicked", () => {
    const onLikePost = jest.fn();
    renderCard({onLikePost});
    fireEvent.click(screen.getByTestId("like-button"));
    expect(onLikePost).toHaveBeenCalledWith(1);
  });

});