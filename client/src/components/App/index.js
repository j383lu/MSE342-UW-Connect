import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import theme from './Theme';
import Navbar from './Navbar';
import LogInAndRegister from './LogIn/LogInAndRegister';

// Import groups components
import GroupsPage from "./Groups/GroupsPage";
import CreateGroupForm from "./Groups/CreateGroupForm";
import GroupDetailsPage from "./Groups/GroupDetailsPage";
import EditGroupForm from "./Groups/EditGroupForm";

// Import events components
import EventsPage from "./Events/EventsPage";
import CreateEventForm from "./Events/CreateEventForm";

// placeholders (optional)
const HomePage = () => <div>Home</div>;
const ProfilePage = () => <div>Profile</div>;

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Navbar />
        <Routes>
          {/* Login route */}
          <Route path="/login" element={<LogInAndRegister />} />
          
          {/* Home route */}
          <Route path="/" element={<HomePage />} />
          
          {/* Groups routes */}
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/new" element={<CreateGroupForm />} />
          <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
          <Route path="/groups/:groupId/edit" element={<EditGroupForm />} />
          
          {/* Events routes */}
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<CreateEventForm />} />
          
          {/* Other routes */}
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}