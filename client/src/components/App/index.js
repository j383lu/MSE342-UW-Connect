import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Profile from "./Profile/Profile";
import EditProfile from "./Profile/EditProfile";

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;