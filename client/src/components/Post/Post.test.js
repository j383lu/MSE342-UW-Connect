import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Post from "../Post";

describe("Create Text Post", () => {

  test("1. Clicking Create Post opens empty form", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });

  test("2. Shows error when title is missing", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test body" }
    });

    fireEvent.click(screen.getByText(/submit/i));

    expect(screen.getByText(/title is a required field/i)).toBeInTheDocument();
  });

  test("3. Shows error when description is missing", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Test title" }
    });

    fireEvent.click(screen.getByText(/submit/i));

    expect(screen.getByText(/description is a required field/i)).toBeInTheDocument();
  });

  test("4. Shows error when character limit exceeded", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    const longText = "a".repeat(501);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Valid title" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: longText }
    });

    fireEvent.click(screen.getByText(/submit/i));

    expect(screen.getByText(/you have exceeded the character limit/i)).toBeInTheDocument();
  });

  test("5. Cancel closes modal and does not create post", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Test Title" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Test Body" }
    });

    fireEvent.click(screen.getByText(/cancel/i));

    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
  });

  test("6. Successful post appears in feed", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Group wanted for intramurals" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Hello everyone I need 3 more members for an intramural team!" }
    });

    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: "sports, intramurals" }
    });

    fireEvent.click(screen.getByText(/submit/i));

    expect(screen.getByText("Group wanted for intramurals")).toBeInTheDocument();
    expect(screen.getByText("Hello everyone I need 3 more members for an intramural team!")).toBeInTheDocument();
    expect(screen.getByText("sports")).toBeInTheDocument();
    expect(screen.getByText("intramurals")).toBeInTheDocument();
  });

});