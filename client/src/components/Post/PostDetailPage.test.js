import React from "react";
import 'whatwg-fetch';
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PostDetailPage from "./PostDetailPage";


jest.mock('../Firebase', () => ({
  withFirebase: (Component) => {
    const Wrapped = (props) => (
      <Component
        {...props}
        firebase={{
          auth: {
            currentUser: { getIdToken: jest.fn().mockResolvedValue('mock-token') }
          }
        }}
      />
    );
    Wrapped.displayName = Component.displayName || Component.name;
    return Wrapped;
  }
}));

//mock data

const mockPost = {
  post_id: 1,
  author_id: 1,
  title: "Test Post",
  description: "Test description",
  tags: ["Events"],
  createdAt: new Date().toISOString(),
  like_count: 0,
  liked_by_me: false
};

const mockComments = [
  {
    comment_id: 1,
    post_id: 1,
    user_id: 1,
    parent_comment_id: null,
    content: "First comment",
    createdAt: new Date().toISOString()
  },
  {
    comment_id: 2,
    post_id: 1,
    user_id: 2,
    parent_comment_id: null,
    content: "Second comment",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];



const makeFetch = ({ comments = mockComments, post = mockPost, newComment = null } = {}) =>
  jest.fn((url, options = {}) => {
    if (options?.method === 'POST' && newComment) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(newComment) });
    }
    if (url.includes('/comments')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(comments) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(post) });
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/feed/1"]}>
      <Routes>
        <Route path="/feed/:postId" element={<PostDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

// setup

beforeEach(() => {
  global.fetch = makeFetch();
});

afterEach(() => {
  jest.resetAllMocks();
});

// Tests

describe("PostDetailPage - Comments", () => {

  test("1. Renders post title and description", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Test Post")).toBeInTheDocument());
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  test("2. Renders all comments", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("First comment")).toBeInTheDocument());
    expect(screen.getByText("Second comment")).toBeInTheDocument();
  });

  test("3. Shows empty state when no comments exist", async () => {
    global.fetch = makeFetch({ comments: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
    );
  });

  test("4. Comment count updates after new comment is posted", async () => {
    const newComment = {
      comment_id: 3,
      post_id: 1,
      user_id: 1,
      parent_comment_id: null,
      content: "Brand new comment",
      createdAt: new Date().toISOString()
    };
    global.fetch = makeFetch({ newComment });

    renderPage();
    await waitFor(() => expect(screen.getByText("First comment")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/write a comment/i), {
      target: { value: "Brand new comment" }
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/post comment/i));
    });

    await waitFor(() =>
      expect(screen.getByText("Brand new comment")).toBeInTheDocument()
    );
  });

  test("5. Post Comment button is disabled when input is empty", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Test Post")).toBeInTheDocument());
    expect(screen.getByText(/post comment/i)).toBeDisabled();
  });

  test("6. Empty comment with only spaces cannot be submitted", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Test Post")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/write a comment/i), {
      target: { value: "   " }
    });
    expect(screen.getByText(/post comment/i)).toBeDisabled();
  });

  test("7. Back to Feed button navigates back", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/back to feed/i)).toBeInTheDocument());
  });

});