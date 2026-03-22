import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

/**
 * Renders login only when logged out; otherwise redirects home.
 */
export default function RequireGuest() {
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
