import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddTodoModal from "../AddTodoModal";
import apiRequest from "../../../../utils/api";

jest.mock("../../../../utils/api");

describe("AddTodoModal", () => {
  const contacts = [
    { user_id: 2, email: "jane@uwaterloo.ca", display_name: "Jane Smith" },
    { user_id: 3, email: "david@uwaterloo.ca", display_name: "David Brown" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads categories when opened", async () => {
    apiRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ tag_name: "Sports" }, { tag_name: "Clubs" }],
    });

    render(<AddTodoModal open onClose={jest.fn()} onCreated={jest.fn()} contacts={contacts} />);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/categories");
    });
  });

  test("submits group private event with selected attendees", async () => {
    apiRequest
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ tag_name: "Sports" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 10, message: "Event created successfully." }),
      });

    render(<AddTodoModal open onClose={jest.fn()} onCreated={jest.fn()} contacts={contacts} />);

    // Wait for categories to load and default selection to be applied.
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/categories");
    });

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Test Group Calendar Event" } });
    fireEvent.click(screen.getByRole("button", { name: "Group" }));
    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    fireEvent.click(screen.getByText("Jane Smith"));
    fireEvent.click(screen.getByRole("button", { name: "Add Event" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledTimes(2);
    });

    const postCall = apiRequest.mock.calls[1];
    expect(postCall[0]).toBe("/api/calendar/todos");
    expect(postCall[1].method).toBe("POST");
    const body = JSON.parse(postCall[1].body);
    expect(body.scope).toBe("group");
    expect(body.visibility).toBe("private");
    expect(body.participant_user_ids).toContain(2);
  });
});

