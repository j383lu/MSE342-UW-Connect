import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import theme from './Theme';
import Navbar from './Navbar';
import LogInAndRegister from './LogIn/LogInAndRegister';
import Layout from './Layout';
import Post from '../Post'

// Import groups components
import GroupsPage from "./Groups/GroupsPage";
import CreateGroupForm from "./Groups/CreateGroupForm";
import GroupDetailsPage from "./Groups/GroupDetailsPage";
import EditGroupForm from "./Groups/EditGroupForm";

// Import events components
import EventsPage from "./Events/EventsPage";
import CreateEventForm from "./Events/CreateEventForm";

// Import profile components
import ProfilePage from "./Profile/Profile";
import EditProfile from "./Profile/EditProfile";  
import ProgramStudents from "./Profile/ProgramStudents";

// placeholders (optional)
const HomePage = () => <div>Home</div>;

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

          {/* Post route */}
          <Route path="/feed" element={<Post />} />
          
          {/* Groups routes */}
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/new" element={<CreateGroupForm />} />
          <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
          <Route path="/groups/:groupId/edit" element={<EditGroupForm />} />
          
          {/* Events routes */}
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<CreateEventForm />} />
          
          {/* Profile routes */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/programs/:programId/students" element={<ProgramStudents />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}
