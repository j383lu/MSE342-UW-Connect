import React from "react";
import 'whatwg-fetch';
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import PostList from "../Post/PostList";

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

const renderList = (props = {}) => {
  render(
    <MemoryRouter>
      <PostList {...defaultProps} {...props} />
    </MemoryRouter>
  );
};

const mockPosts = [
  {
    post_id: 1,
    author_id: 1,
    title: "Co-op Opportunity",
    description: "Looking for co-op students",
    createdAt: new Date().toISOString(),
    tags: [],
    like_count: 0,
    liked_by_me: false,
    comment_count: 0
  },
  {
    post_id: 2,
    author_id: 1,
    title: "Intramural Soccer",
    description: "Need 2 more players",
    createdAt: new Date().toISOString(),
    tags: [],
    like_count: 0,
    liked_by_me: false,
    comment_count: 0
  }
];

const defaultProps = {
  posts: mockPosts,
  onDeletePost: jest.fn(),
  onEditPost: jest.fn(),
  onLikePost: jest.fn(),
  onTagFilter: jest.fn()
};

describe("PostList", () => {

  it("renders all posts", () => {
    renderList();
    expect(screen.getByText("Co-op Opportunity")).toBeInTheDocument();
    expect(screen.getByText("Looking for co-op students")).toBeInTheDocument();
    expect(screen.getByText("Intramural Soccer")).toBeInTheDocument();
    expect(screen.getByText("Need 2 more players")).toBeInTheDocument();
  });

  it("renders empty list without crashing", () => {
    renderList({ posts: [] });
    expect(screen.queryByText("Co-op Opportunity")).not.toBeInTheDocument();
  });

  it("renders correct number of posts", () => {
    renderList();
    expect(screen.getAllByText(/just now/i)).toHaveLength(2);
  });
});