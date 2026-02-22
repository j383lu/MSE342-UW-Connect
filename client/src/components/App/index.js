// import * as React from 'react';
// import GroupsPage from './GroupsPage';


// const App = () => {


//   return (
//     <div>
//         <h1>MSci 245 - D1 template </h1>
//       {/* Render <Review /> child component */}

//       <GroupsPage />


//     </div>
//   );
// }

// export default App;

import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import GroupsPage from "./GroupsPage";
import CreateGroupForm from "./CreateGroupForm";
import GroupDetailsPage from "./GroupDetailsPage";
import EditGroupForm from "./EditGroupForm";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/new" element={<CreateGroupForm />} />
        <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
        <Route path="/groups/:groupId/edit" element={<EditGroupForm />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;