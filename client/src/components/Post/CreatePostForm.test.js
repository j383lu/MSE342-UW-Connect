import React from "react";
import 'whatwg-fetch';
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreatePostForm from "./CreatePostForm";


jest.mock('../../contexts/UserContext', () => ({
  useUser: () => ({
    dbUser: { userId: 1, displayName: 'Test User' },
    loading: false
  })
}));

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


const mockOnSubmit = jest.fn();
const mockOnClose = jest.fn();

const renderForm = (props = {}) => {
  render(
    <CreatePostForm
      open={true}
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      {...props}
    />
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CreatePostForm", () => {

  test("1. Renders title and description fields when open", () => {
    renderForm();

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  test("2. Shows error when submitting with no title", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Some description" }
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(screen.getByText(/title is a required field/i)).toBeInTheDocument();
  });

  test("3. Shows error when submitting with no description", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Valid Title" }
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(screen.getByText(/description is a required field/i)).toBeInTheDocument();
  });


  test("4. Shows error when title is only spaces", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "   " }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description" }
    });
    fireEvent.click(screen.getByText(/submit/i));
    expect(screen.getByText(/title is a required field/i)).toBeInTheDocument();
  });

  test("5. Shows error when title is too short", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Hi" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description" }
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
  });

  test("6. Shows error when title exceeds 100 characters", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "a".repeat(101) }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description" }
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(screen.getByText(/title exceeds maximum length/i)).toBeInTheDocument();
  });


  test("7. Shows error when description exceeds 500 characters", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Valid title" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "a".repeat(501) }
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(screen.getByText(/you have exceeded the character limit/i)).toBeInTheDocument();
  });

  test("8. Calls onSubmit with correct data when form is valid", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Valid Title" }
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description" }
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Valid Title",
        description: "Valid description"
      })
    );
  });

  test("9. Calls onClose when Cancel is clicked", () => {
    renderForm();
    fireEvent.click(screen.getByText(/cancel/i));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("10. Form fields are empty on initial render", () => {
    renderForm();
    
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });

});