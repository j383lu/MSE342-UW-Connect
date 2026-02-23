import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./Layout";
import EventsPage from "./EventsPage";
import CreateEventForm from "./CreateEventForm";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<CreateEventForm />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}