import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CalendarPage from "../CalendarPage";
import apiRequest from "../../../../utils/api";

jest.mock("../../../../utils/api");
jest.mock("../../../../contexts/UserContext", () => ({
  useUser: () => ({ dbUser: { userId: 1 }, loading: false }),
}));

describe("CalendarPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiRequest.mockImplementation(async (url) => {
      if (String(url).startsWith("/api/calendar/contacts")) {
        return {
          ok: true,
          json: async () => [
            { user_id: 2, email: "derrick@uwaterloo.ca", display_name: "d3rr1ck lu" },
          ],
        };
      }
      if (String(url).startsWith("/api/calendar/events")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 201,
              title: "Derrick Personal Event",
              description: "desc",
              event_date: "2026-03-26",
              event_time: "09:00",
              end_date: "2026-03-26",
              end_time: "10:00",
              category: "Sports",
              created_by: 2,
              creator_name: "d3rr1ck lu",
              tags: "__calendar__,__calscope__:personal,__calvisibility__:private,__calcolor__:blue",
              is_past: 0,
              is_overdue: 0,
            },
          ],
        };
      }
      if (String(url).startsWith("/api/events/201/attendees")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => [] };
    });
  });

  test("renders calendar sections and shows owner text on personal event card", async () => {
    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText(/Upcoming/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Derrick Personal Event")).toBeInTheDocument();
    expect(screen.getByText("d3rr1ck lu")).toBeInTheDocument();
  });

  test("opens details dialog when event card is clicked", async () => {
    render(<CalendarPage />);

    const eventTitle = await screen.findByText("Derrick Personal Event");
    fireEvent.click(eventTitle);

    await waitFor(() => {
      expect(screen.getByText("Event Details")).toBeInTheDocument();
    });
  });
});

