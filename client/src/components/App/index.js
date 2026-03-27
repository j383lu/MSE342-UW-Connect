import * as React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import theme from './Theme';
import Navbar from './Navbar';
import LogInAndRegister from './LogIn/LogInAndRegister';
import Post from '../Post'
import PostDetailPage from '../Post/PostDetailPage'
import Firebase, { FirebaseContext } from '../Firebase';
import { useState, useEffect, useContext } from 'react';
import PrivateRoute from '../Navigation/PrivateRoute';
import { UserProvider, useUser } from '../../contexts/UserContext';

// Import groups components
import GroupsPage from "./Groups/GroupsPage";
import CreateGroupForm from "./Groups/CreateGroupForm";
import GroupDetailsPage from "./Groups/GroupDetailsPage";
import EditGroupForm from "./Groups/EditGroupForm";

// Import events components
import EventsPage from "./Events/EventsPage";
import CreateEventForm from "./Events/CreateEventForm";

import CalendarPage from "./Calendar/CalendarPage";

// Import profile components
import ProfilePage from "./Profile/Profile";
import EditProfile from "./Profile/EditProfile";
import FollowingList from "./Profile/FollowingList";
import ProgramStudents from "./Profile/ProgramStudents";
import ProfileSearch from "./Profile/ProfileSearch";
import UserProfileView from "./Profile/UserProfileView";

// Import notifications
import Notifications from "./Notifications/Notifications";

function AppContent() {
  const location = useLocation();
  const { dbUser, loading } = useUser()

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Syncing with UW Connect...</div>;
  }

  const isLoginPage = location.pathname === "/";
  const authenticated = !!dbUser;

  return (
    <ThemeProvider theme={theme}>
      {!isLoginPage && authenticated && <Navbar authUser={dbUser} />}
      <Routes>
        <Route path="/" element={authenticated ? <Navigate to="/feed" /> : <LogInAndRegister />} />

        {/* authenticated routes */}
        <Route path="/feed" element={authenticated ? <Post /> : <Navigate to="/" />} />
        <Route path="/feed/:postId" element={authenticated ? <PostDetailPage /> : <Navigate to="/"/>} />
        <Route path="/profile" element={authenticated ? <ProfilePage /> : <Navigate to="/" />} />
        <Route path="/edit-profile" element={authenticated ? <EditProfile /> : <Navigate to="/" />} />
        <Route
          path="/profile/following"
          element={authenticated ? <FollowingList /> : <Navigate to="/" />}
        />
        <Route
          path="/programs/:programId/students"
          element={authenticated ? <ProgramStudents /> : <Navigate to="/" />}
        />
        <Route
          path="/profile-search"
          element={authenticated ? <ProfileSearch /> : <Navigate to="/" />}
        />
        <Route
          path="/users/:userId"
          element={authenticated ? <UserProfileView /> : <Navigate to="/" />}
        />
        <Route path="/groups" element={authenticated ? <GroupsPage /> : <Navigate to="/" />} />
        <Route path="/groups/new" element={authenticated ? <CreateGroupForm /> : <Navigate to="/" />} />
        <Route path="/groups/:groupId" element={authenticated ? <GroupDetailsPage /> : <Navigate to="/" />} />
        <Route path="/groups/:groupId/edit" element={authenticated ? <EditGroupForm /> : <Navigate to="/" />} />
        <Route path="/events" element={authenticated ? <EventsPage /> : <Navigate to="/" />} />
        <Route path="/events/new" element={authenticated ? <CreateEventForm /> : <Navigate to="/" />} />
        <Route path="/calendar" element={authenticated ? <CalendarPage /> : <Navigate to="/" />} />
        <Route path="/notifications" element={authenticated ? <Notifications /> :<Navigate to="/"/>}/>
      </Routes>
    </ThemeProvider>
  );
}

const firebase = new Firebase();

const App = () => {
  // const [authUser, setAuthUser] = useState(null);
  // useEffect(() => {
  //   const listener = firebase.auth.onAuthStateChanged(user => {
  //     setAuthUser(user || null);
  //   });
  //   return () => listener();
  // }, []);


  return (
    <FirebaseContext.Provider value={firebase}>
      <BrowserRouter>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </BrowserRouter>
    </FirebaseContext.Provider>
  );
};

export default App;
