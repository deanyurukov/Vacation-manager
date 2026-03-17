import { useContext } from "react";
import { Navigate, Outlet } from "react-router";
import { appContext } from "../App";

const GuestRoutes = () => {
    const { isLoggedIn } = useContext(appContext);

    return (
        isLoggedIn ? <Navigate to='/users' /> : <Outlet />
    );
}

export default GuestRoutes;