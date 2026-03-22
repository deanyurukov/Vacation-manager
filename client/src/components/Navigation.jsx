import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const Navigation = () => {
    const { user } = useAuth();
    const isCeo = user?.roleName === "CEO";

    return (
        <nav>
            <ul>
                {user ? (
                    <>
                        {isCeo && <li><NavLink to="/">Users</NavLink></li>}
                        <li><NavLink to="/holidays">Holidays</NavLink></li>
                        <li><NavLink to="/teams">Teams</NavLink></li>
                        {isCeo && <li><NavLink to="/roles">Roles</NavLink></li>}
                        <li><NavLink to="/projects">Projects</NavLink></li>
                    </>
                ) : (
                    <li><NavLink to="/login">Log in</NavLink></li>
                )}
            </ul>
        </nav>
    );
}

export default Navigation;
