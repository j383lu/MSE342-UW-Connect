 import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Profile from "./Profile";
import ProgramStudents from "./ProgramStudents";
import ProfileSearch from "./ProfileSearch";

describe("Profile feature tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn((url) => {
      switch (url) {
        case "/api/profile":
          return Promise.resolve({
            ok: true,
            json: async () => ({
              name: "Alex Chen",
              bio: "Management Engineering student",
              role: "Student",
              gender: "Woman",
              birthday: "2005-12-19",
              phone_number: "519-555-1234",
              email: "alex@uwaterloo.ca",
              department: "",
              program_id: 1,
              program: "Management Engineering",
              courses: [1, 2],
            }),
          });

        case "/api/profile/user-courses":
          return Promise.resolve({
            ok: true,
            json: async () => [
              { course_id: 1, course_code: "MSE342" },
              { course_id: 2, course_code: "STAT231" },
            ],
          });

        case "/api/profile/programs/1/students":
          return Promise.resolve({
            ok: true,
            json: async () => ({
              program_name: "Management Engineering",
              students: [
                {
                  user_id: 1,
                  display_name: "Alex Chen",
                  bio: "Management Engineering student",
                  role: "Student",
                  program_name: "Management Engineering",
                  courses: [
                    { course_id: 1, course_code: "MSE342" },
                    { course_id: 2, course_code: "STAT231" },
                  ],
                },
                {
                  user_id: 2,
                  display_name: "Sarah Patel",
                  bio: "Interested in UX",
                  role: "Student",
                  program_name: "Management Engineering",
                  courses: [{ course_id: 3, course_code: "MSCI211" }],
                },
              ],
            }),
          });

        case "/api/profile/search-users":
          return Promise.resolve({
            ok: true,
            json: async () => ({
              users: [
                {
                  user_id: 1,
                  display_name: "Alex Chen",
                  bio: "Management Engineering student",
                  role: "Student",
                  program_name: "Management Engineering",
                  department: "",
                },
                {
                  user_id: 2,
                  display_name: "Sarah Patel",
                  bio: "Interested in UX",
                  role: "Student",
                  program_name: "Management Engineering",
                  department: "",
                },
                {
                  user_id: 3,
                  display_name: "Jordan Lee",
                  bio: "Registrar staff member",
                  role: "Staff",
                  program_name: "",
                  department: "Registrar",
                },
              ],
            }),
          });

        default:
          if (typeof url === "string" && url.startsWith("/api/profile/search-users?query=")) {
            const query = decodeURIComponent(url.split("query=")[1]).toLowerCase();

            const allUsers = [
              {
                user_id: 1,
                display_name: "Alex Chen",
                bio: "Management Engineering student",
                role: "Student",
                program_name: "Management Engineering",
                department: "",
              },
              {
                user_id: 2,
                display_name: "Sarah Patel",
                bio: "Interested in UX",
                role: "Student",
                program_name: "Management Engineering",
                department: "",
              },
              {
                user_id: 3,
                display_name: "Jordan Lee",
                bio: "Registrar staff member",
                role: "Staff",
                program_name: "",
                department: "Registrar",
              },
            ];

            return Promise.resolve({
              ok: true,
              json: async () => ({
                users: allUsers.filter((u) =>
                  u.display_name.toLowerCase().includes(query)
                ),
              }),
            });
          }

          return Promise.resolve({
            ok: true,
            json: async () => ({}),
          });
      }
    });
  });

  test("1. Profile shows error message when profile fails to load", async () => {
    global.fetch = jest.fn((url) => {
      if (url === "/api/profile") {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Failed to fetch profile" }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Profile failed to load.")).toBeInTheDocument();
  });

  test("2. Profile displays gender when gender is not 'Prefer not to say'", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Woman")).toBeInTheDocument();
  });

  test("3. Profile hides gender when gender is 'Prefer not to say'", async () => {
    global.fetch = jest.fn((url) => {
      if (url === "/api/profile") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            name: "Alex Chen",
            bio: "Management Engineering student",
            role: "Student",
            gender: "Prefer not to say",
            birthday: "2005-12-19",
            phone_number: "519-555-1234",
            department: "",
            program_id: 1,
            program: "Management Engineering",
            courses: [1, 2],
          }),
        });
      }

      if (url === "/api/profile/user-courses") {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { course_id: 1, course_code: "MSE342" },
          ],
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await screen.findByText("Alex Chen");
    expect(screen.queryByText("Prefer not to say")).not.toBeInTheDocument();
  });

  test("4. Profile displays email, phone number, and birthday under Bio", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Email: alex@uwaterloo.ca")).toBeInTheDocument();
    expect(screen.getByText("Phone Number: 519-555-1234")).toBeInTheDocument();
    expect(screen.getByText("Birthday: 12/19/2005")).toBeInTheDocument();
  });

  test("5. Staff profile displays Staff label and Staff Department", async () => {
    global.fetch = jest.fn((url) => {
      if (url === "/api/profile") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            name: "Jordan Lee",
            bio: "Registrar staff member",
            role: "Staff",
            gender: "Man",
            birthday: "1990-03-10",
            phone_number: "",
            department: "Registrar",
            program_id: 1,
            program: "Management Engineering",
            courses: [],
          }),
        });
      }

      if (url === "/api/profile/user-courses") {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Staff Department")).toBeInTheDocument();
    expect(screen.getByText("Registrar")).toBeInTheDocument();
  });

  test("6. Clicking program chip routes to the program students page", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/programs/:programId/students" element={<ProgramStudents />} />
        </Routes>
      </MemoryRouter>
    );

    const programChip = await screen.findByText("Management Engineering");
    fireEvent.click(programChip);

    expect(await screen.findByText("Program Students")).toBeInTheDocument();
  });

  test("7. ProgramStudents page displays users and their current courses", async () => {
    render(
      <MemoryRouter initialEntries={["/programs/1/students"]}>
        <Routes>
          <Route path="/programs/:programId/students" element={<ProgramStudents />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Sarah Patel")).toBeInTheDocument();
    expect(screen.getByText("MSE342")).toBeInTheDocument();
    expect(screen.getByText("STAT231")).toBeInTheDocument();
    expect(screen.getByText("MSCI211")).toBeInTheDocument();
  });

  test("8. ProfileSearch shows full list of users when search bar is empty", async () => {
    render(
      <MemoryRouter>
        <ProfileSearch />
      </MemoryRouter>
    );

    expect(await screen.findByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Sarah Patel")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
  });

  test("9. ProfileSearch filters users by typed text", async () => {
    render(
      <MemoryRouter>
        <ProfileSearch />
      </MemoryRouter>
    );

    const input = await screen.findByTestId("user-search-input");
    fireEvent.change(input, { target: { value: "Alex" } });

    await waitFor(() => {
      expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    });

    expect(screen.queryByText("Sarah Patel")).not.toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
  });
});