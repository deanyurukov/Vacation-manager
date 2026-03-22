import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

/**
 * CEO-only sections (Users, Roles). Others are redirected to /holidays.
 */
export default function CeoOnlyRoute() {
    const { user } = useAuth();

    if (user?.roleName !== "CEO") {
        return <Navigate to="/holidays" replace />;
    }

    return <Outlet />;
}
