import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Profile from "./Profile";
import EditProfile from "./EditProfile";
import { Routes, Route, MemoryRouter } from "react-router-dom";

describe("Update Display Name ", () => {
  beforeEach(() => {
    global.fetch = jest.fn();

    global.fetch
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({
          name: "OriginalName",
          bio: "",
          program_id: "",
          courses: []
        })
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ([
          { program_id: 1, program_name: "Management Engineering" }
        ])
      });
  });

  test("1. Empty name shows 'Name cannot be empty.'", async () => {
    render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>);

    const input = await screen.findByTestId("display-name-input");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Name cannot be empty.")).toBeInTheDocument();
  });
   test("2. Special characters show correct error message", async () => {
    render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>);

    const input = await screen.findByTestId("display-name-input");
    fireEvent.change(input, { target: { value: "Bad#Name%" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText("Only alphanumeric characters and spaces are allowed.")
    ).toBeInTheDocument();
  });

  test("3. Name longer than 30 characters shows length error", async () => {
    render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>);

    const input = await screen.findByTestId("display-name-input");
    fireEvent.change(input, { target: { value: "a".repeat(31) } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText("Name must be 30 characters or fewer.")
    ).toBeInTheDocument();
  });

  test("4. Valid name shows no validation error", async () => {
    render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>);

    const input = await screen.findByTestId("display-name-input");
    fireEvent.change(input, { target: { value: "NewName" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      screen.queryByText("Name cannot be empty.")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Only alphanumeric characters and spaces are allowed.")
    ).not.toBeInTheDocument();
  });

  test("5. Leading/trailing spaces are allowed (no validation error)", async () => {
    render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>);

    const input = await screen.findByTestId("display-name-input");
    fireEvent.change(input, { target: { value: "  Name  " } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      screen.queryByText("Name cannot be empty.")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Only alphanumeric characters and spaces are allowed.")
    ).not.toBeInTheDocument();
  });
  
  test("6. Saving a valid new name shows updated name on Profile page", async () => {
    // Mock PUT /api/profile success (3rd fetch call after the 2 GETs in beforeEach)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "ok" }),
    });

    // Mock GET /api/profile for the Profile page after navigation (4th fetch call)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: "NewName",
        program: "Management Engineering",
        bio: "",
        courses: [],
      }),
    });

    render(
      <MemoryRouter initialEntries={["/edit-profile"]}>
        <Routes>
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    );

    const input = await screen.findByLabelText(/Display Name/i);
    fireEvent.change(input, { target: { value: "NewName" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Wait for the PUT request to have been made
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    // Render the Profile page 
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    // Wait for Profile to fetch and render the updated name
    await waitFor(() => {
      expect(screen.getByText("NewName")).toBeInTheDocument();
    });
  });
});
