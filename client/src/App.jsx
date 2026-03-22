import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';

import '/src/styles/app.css';

import MainLayout from './layouts/MainLayout.jsx';

import RequireAuth from './routes/RequireAuth.jsx';
import RequireGuest from './routes/RequireGuest.jsx';
import CeoOnlyRoute from './routes/CeoOnlyRoute.jsx';

import UsersPage from './pages/UsersPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import HolidaysPage from './pages/HolidaysPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path='/' element={<MainLayout />}>
            <Route element={<RequireAuth />}>
                <Route element={<CeoOnlyRoute />}>
                    <Route index element={<UsersPage />} />
                    <Route path='roles' element={<RolesPage />} />
                </Route>
                <Route path='teams' element={<TeamsPage />} />
                <Route path='projects' element={<ProjectsPage />} />
                <Route path='holidays' element={<HolidaysPage />} />
            </Route>
            <Route element={<RequireGuest />}>
                <Route path='login' element={<LoginPage />} />
            </Route>
            <Route path='*' element={<NotFoundPage />} />
        </Route>
    )
);

function App() {
    return <RouterProvider router={router} />;
}

export default App;