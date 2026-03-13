import * as React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./Theme";
import Navbar from "./Navbar";
import LogInAndRegister from "./LogIn/LogInAndRegister";
import Post from "../Post";
import { FirebaseContext } from "../Firebase";
import { useState, useEffect, useContext } from "react";

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
import ProfileSearch from "./Profile/ProfileSearch";

function AppContent({ authUser }) {
  const location = useLocation();

  const isLoginPage = location.pathname === "/";
  const authenticated = !!authUser;

  return (
    <ThemeProvider theme={theme}>
      {!isLoginPage && authenticated && <Navbar authUser={authUser} />}
      <Routes>
        {/* login is the default page */}
        <Route path="/" element={<LogInAndRegister />} />

        {/* authenticated routes */}
        <Route path="/feed" element={authenticated ? <Post /> : <Navigate to="/" />} />
        <Route path="/profile" element={authenticated ? <ProfilePage /> : <Navigate to="/" />} />
        <Route path="/edit-profile" element={authenticated ? <EditProfile /> : <Navigate to="/" />} />
        <Route
          path="/programs/:programId/students"
          element={authenticated ? <ProgramStudents /> : <Navigate to="/" />}
        />
        <Route
          path="/profile-search"
          element={authenticated ? <ProfileSearch /> : <Navigate to="/" />}
        />
        <Route path="/groups" element={authenticated ? <GroupsPage /> : <Navigate to="/" />} />
        <Route path="/groups/new" element={authenticated ? <CreateGroupForm /> : <Navigate to="/" />} />
        <Route path="/groups/:groupId" element={authenticated ? <GroupDetailsPage /> : <Navigate to="/" />} />
        <Route path="/groups/:groupId/edit" element={authenticated ? <EditGroupForm /> : <Navigate to="/" />} />
        <Route path="/events" element={authenticated ? <EventsPage /> : <Navigate to="/" />} />
        <Route path="/events/new" element={authenticated ? <CreateEventForm /> : <Navigate to="/" />} />
      </Routes>
    </ThemeProvider>
  );
}

const App = () => {
  const [authUser, setAuthUser] = useState(null);
  const firebase = useContext(FirebaseContext);

  useEffect(() => {
    if (firebase) {
      const unsubscribe = firebase.auth.onAuthStateChanged((user) => {
        user ? setAuthUser(user) : setAuthUser(null);
      });
      return () => unsubscribe();
    }
  }, [firebase]);

  return (
    <BrowserRouter>
      <AppContent authUser={authUser} />
    </BrowserRouter>
  );
};

export default App;