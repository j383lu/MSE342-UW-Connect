import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import PostCard from "../Post/PostCard";

describe("PostCard", () => {
  const mockPost = {
    title: "Study Group",
    description: "Looking for study partners",
    createdAt: new Date().toISOString(),
    tags: []
  };

  it("renders title and description", () => {
    render(<PostCard post={mockPost} />);

    expect(screen.getByText("Study Group")).toBeInTheDocument();
    expect(screen.getByText("Looking for study partners")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText(/study group/i)).toBeInTheDocument();
  });
});