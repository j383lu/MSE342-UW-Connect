import React from "react";
import 'whatwg-fetch';
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import PostCard from "./PostCard";

jest.mock('../../contexts/UserContext', () => ({
  useUser: jest.fn(() => ({
    dbUser: { userId: 1, displayName: 'Test User' },
    loading: false
  }))
}));

jest.mock('../Firebase', () => ({
  withFirebase: (Component) => {
    const Wrapped = (props) => (
      <Component
        {...props}
        firebase={{ auth: { currentUser: { getIdToken: jest.fn(() => Promise.resolve('mock-token')) } } }}
      />
    );
    Wrapped.displayName = `withFirebase(${Component.name})`;
    return Wrapped;
  }
}));



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

const renderCard = (props = {}) => {
  render(
    <MemoryRouter>
      <PostCard {...defaultProps} {...props} />
    </MemoryRouter>
  );
};

// Helper: opens the kebab menu (MoreHorizIcon button)
const openMenu = () => {
  fireEvent.click(screen.getByTestId('MoreHorizIcon').closest('button'));
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

  // Delete/Edit live inside the kebab Menu — must open it first
  it("shows delete and edit buttons for post author", () => {
    renderCard();
    openMenu();
    expect(screen.getByText(/delete/i)).toBeInTheDocument();
    expect(screen.getByText(/edit/i)).toBeInTheDocument();
  });

  it("does not show delete or edit buttons for non-author", () => {
    renderCard({ post: { ...mockPost, author_id: 99 } });
    // Menu button shouldn't even exist for non-authors
    expect(screen.queryByTestId('MoreHorizIcon')).not.toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
  });

  it("shows confirmation dialog when delete is clicked", () => {
    renderCard();
    openMenu();
    fireEvent.click(screen.getByText(/delete/i));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it("cancelling delete keeps post visible", () => {
    renderCard();
    openMenu();
    fireEvent.click(screen.getByText(/delete/i));
    fireEvent.click(screen.getByText(/cancel/i));
    expect(screen.getByText("Study Group")).toBeInTheDocument();
  });

  it("calls onLikePost when like button is clicked", () => {
    const onLikePost = jest.fn();
    renderCard({ onLikePost });
    fireEvent.click(screen.getByTestId("like-button"));
    expect(onLikePost).toHaveBeenCalledWith(1);
  });

});