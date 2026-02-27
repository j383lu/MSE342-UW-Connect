import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import theme from './Theme';
import Navbar from './Navbar';
import LogInAndRegister from './LogIn/LogInAndRegister';

// Import groups components
import GroupsPage from "./Groups/GroupsPage";
import CreateGroupForm from "./Groups/CreateGroupForm";
import GroupDetailsPage from "./Groups/GroupDetailsPage";
import EditGroupForm from "./Groups/EditGroupForm";

// placeholders (optional)
const HomePage = () => <div>Home</div>;
const ProfilePage = () => <div>Profile</div>;
const EventsPage = () => <div>Events</div>;

export default function App() {
  return (
    <div>
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
            
            {/* Other routes */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/events" element={<EventsPage />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}