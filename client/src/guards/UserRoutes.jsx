import { useContext } from "react";
import { Navigate, Outlet } from "react-router";
import { appContext } from "../App";

const UserRoutes = () => {
    const { isLoggedIn } = useContext(appContext);

    return (
        isLoggedIn ? <Outlet /> : <Navigate to='/login' />
    );
}

export default UserRoutes;