import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';

import '/src/styles/app.css';

import MainLayout from './layouts/MainLayout.jsx';

import UsersPage from './pages/UsersPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import RolesPage from './pages/RolesPage.jsx';

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path='/' element={<MainLayout />}>
            <Route index element={<UsersPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route path='/roles' element={<RolesPage />} />
        </Route>
    )
);

function App() {
    return <RouterProvider router={router} />;
}

export default App;