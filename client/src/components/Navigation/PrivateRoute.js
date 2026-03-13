import React from 'react';
import {Routes, Route, Navigate} from 'react-router-dom';
import LogInAndRegister from './LogIn/LogInAndRegister';
import Post from '../../Post';
import EventsPage from "../Events/EventsPage";
import GroupsPage from "../Groups/GroupsPage";
import ProfilePage from '../Profile/Profile';

const PrivateRoute = ({authenticated, authUser}) => {
    return (
        <Routes>
            <Route
                path="/"
                element={authenticated ? <Navigate replace to="/feed" /> : <LogInAndRegister />}
            />
            <Route
                path="/feed"
                element={authenticated ? <Post /> : <Navigate replace to="/" />}
            />
            <Route
                path="/profile"
                element={authenticated ? <ProfilePage authUser={authUser} /> : <Navigate replace to="/" />}
            />

            <Route
                path="/groups"
                element={authenticated ? <GroupsPage /> : <Navigate replace to="/" />}
            />

            <Route
                path="/events"
                element={authenticated ? <EventsPage /> : <Navigate replace to="/" />}
            />

            <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
    );
};
export default PrivateRoute;