import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Post from "../Post";

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

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

  test("5. Cancel closes form and does not create post", () => {
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

  test("7. Shows error when title is too long", () => {
    render(<Post />);
    
    fireEvent.click(screen.getByText(/create post/i));

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Hi" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description" }
    });

    fireEvent.click(screen.getByText(/submit/i));

    expect(
      screen.getByText(/title must be at least 3 characters/i)
    ).toBeInTheDocument();
  });

  test("8. Shows error when title exceeds maximum length", () => {
    render(<Post />);

    fireEvent.click(screen.getByText(/create post/i));

    const longTitle = "a".repeat(101);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: longTitle }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description" }
    });

    fireEvent.click(screen.getByText(/submit/i));

    expect(
      screen.getByText(/title exceeds maximum length/i)
    ).toBeInTheDocument();
});

test("9. Shows error when title contains only spaces", () => {
  render(<Post />);

  fireEvent.click(screen.getByText(/create post/i));

  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: "   " }
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: "Valid description" }
  });

  fireEvent.click(screen.getByText(/submit/i));

  expect(
    screen.getByText(/title is a required field/i)
  ).toBeInTheDocument();
});

});