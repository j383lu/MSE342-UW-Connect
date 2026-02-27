import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Profile from "./Profile";
import EditProfile from "./EditProfile";
import { Routes, Route, MemoryRouter } from "react-router-dom";

describe("Update Display Name ", () => {
  beforeEach(() => {
    // generic fetch mock that returns sensible defaults per-endpoint
    global.fetch = jest.fn((url, opts) => {
      // handle PUT separately to allow overriding in individual tests
      if (opts && opts.method && opts.method.toUpperCase() === "PUT") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: "ok" }),
        });
      }

      switch (url) {
        case "/api/profile":
          // when called on mount return original profile, tests may mock again later
          return Promise.resolve({
            ok: true,
            json: async () => ({
              name: "OriginalName",
              bio: "",
              program_id: 1,            // ensure a program is already selected
              courses: [],
            }),
          });
        case "/api/profile/programs":
          return Promise.resolve({
            ok: true,
            json: async () => [
              { program_id: 1, program_name: "Management Engineering" },
            ],
          });
        case "/api/profile/courses":
          return Promise.resolve({
            ok: true,
            json: async () => [
              { course_id: 1, course_code: "MATH101" },
            ],
          });
        case "/api/profile/user-courses":
          return Promise.resolve({ ok: true, json: async () => [] });
        default:
          // any other request just succeed with an empty result
          return Promise.resolve({ ok: true, json: async () => ({}) });
      }
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
    // override fetch implementation so that after saving the profile
    // subsequent GET /api/profile returns the updated name
    const originalFetch = global.fetch;
    global.fetch = jest.fn((url, opts) => {
      if (opts && opts.method && opts.method.toUpperCase() === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "ok" }) });
      }
      if (url === "/api/profile") {
        // simulate updated data on second profile request
        return Promise.resolve({
          ok: true,
          json: async () => ({
            name: "NewName",
            program: "Management Engineering",
            bio: "",
            courses: [],
          }),
        });
      }
      // delegate other requests to the original mock from beforeEach
      return originalFetch(url, opts);
    });

    render(
      <MemoryRouter initialEntries={["/edit-profile"]}>
        <Routes>
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    );

    const input = await screen.findByTestId("display-name-input");
    fireEvent.change(input, { target: { value: "NewName" } });

    // program selection is required before saving
    fireEvent.mouseDown(screen.getByLabelText(/Program/i));
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText(/Management Engineering/i));

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // ensure the PUT request was fired with correct payload
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({ method: 'PUT' })
      )
    );

    // finally render profile page to verify name updated
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("NewName")).toBeInTheDocument();
    });
  });
});
