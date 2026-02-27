import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import PostList from "../Post/PostList";

describe("PostList", () => {
  const mockPosts = [
    {
      post_id: 1,
      title: "Co-op Opportunity",
      description: "Looking for co-op students",
      createdAt: new Date().toISOString(),
      tags: []
    },
    {
      post_id: 2,
      title: "Intramural Soccer",
      description: "Need 2 more players",
      createdAt: new Date().toISOString(),
      tags: []
    }
  ];

  function renderComponent(props = {}) {
    render(<PostList posts={mockPosts} {...props} />);
  }

  it("renders all posts", () => {
    renderComponent();

    expect(screen.getByText("Co-op Opportunity")).toBeInTheDocument();
    expect(screen.getByText("Looking for co-op students")).toBeInTheDocument();
    expect(screen.getByText("Intramural Soccer")).toBeInTheDocument();
    expect(screen.getByText("Need 2 more players")).toBeInTheDocument();
  });
});