import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';

import '/src/styles/app.css';

import MainLayout from './layouts/MainLayout.jsx';

import UsersPage from './pages/UsersPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import HolidaysPage from './pages/HolidaysPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

import GuestRoutes from './guards/GuestRoutes.jsx';
import UserRoutes from './guards/UserRoutes.jsx';
import React, { useState } from 'react';

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path='/' element={<MainLayout />}>
            <Route element={<GuestRoutes />}>
                <Route index path='/login' element={<LoginPage />} />
                <Route path='/register' element={<RegisterPage />} />
            </Route>

            <Route element={<UserRoutes />}>
                <Route path='/users' element={<UsersPage />} />
                <Route path='/roles' element={<RolesPage />} />
                <Route path='/teams' element={<TeamsPage />} />
                <Route path='/projects' element={<ProjectsPage />} />
                <Route path='/holidays' element={<HolidaysPage />} />
            </Route>

            <Route path='*' element={<NotFoundPage />} />
        </Route>
    )
);

export const appContext = React.createContext();

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return <>
        <appContext.Provider value={{ isLoggedIn, setIsLoggedIn }}>
            <RouterProvider router={router} />
        </appContext.Provider>
    </>;
}

export default App;