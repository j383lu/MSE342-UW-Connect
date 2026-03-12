import * as React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import theme from './Theme';
import Navbar from './Navbar';
import LogInAndRegister from './LogIn/LogInAndRegister';
import Post from '../Post'
import { FirebaseContext } from '../Firebase';
import { useState, useEffect, useContext } from 'react';

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

// placeholders (optional)
const HomePage = () => <div>Home</div>;

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
        
        {/* when authenticated */}
        <Route path="/feed" element={authenticated ? <Post /> : <Navigate to="/" />} />
        <Route path="/profile" element={authenticated ? <ProfilePage /> : <Navigate to="/" />} />
        <Route path="/edit-profile" element={authenticated ? <EditProfile /> : <Navigate to="/" />} />
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
      const unsubscribe = firebase.auth.onAuthStateChanged(user => {
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

// export default function App() {
//   return (
//     <BrowserRouter>
//       <AppContent />
//     </BrowserRouter>
//   );
// }

// export default function App() {
//   return (
//     <BrowserRouter>
//       <ThemeProvider theme={theme}>
//         <Navbar />
//         <Routes>
//           {/* Login route */}
//           <Route path="/login" element={<LogInAndRegister />} />
          
//           {/* Home route */}
//           <Route path="/" element={<HomePage />} />

//           {/* Post route */}
//           <Route path="/feed" element={<Post />} />
          
//           {/* Groups routes */}
//           <Route path="/groups" element={<GroupsPage />} />
//           <Route path="/groups/new" element={<CreateGroupForm />} />
//           <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
//           <Route path="/groups/:groupId/edit" element={<EditGroupForm />} />
          
//           {/* Events routes */}
//           <Route path="/events" element={<EventsPage />} />
//           <Route path="/events/new" element={<CreateEventForm />} />
          
//           {/* Profile routes */}
//           <Route path="/profile" element={<ProfilePage />} />
//           <Route path="/edit-profile" element={<EditProfile />} />
//         </Routes>
//       </ThemeProvider>
//     </BrowserRouter>
//   );
// }
