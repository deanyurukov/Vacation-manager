import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { appContext } from "../App";

const Navigation = () => {
    const { isLoggedIn } = useContext(appContext);

    const guestNav = (
        <>
            <li><NavLink to="/login">Login</NavLink></li>
            <li><NavLink to="/register">Register</NavLink></li>
        </>
    )

    const userNav = (
        <>
            <li><NavLink to="/users">Users</NavLink></li>
            <li><NavLink to="/holidays">Holidays</NavLink></li>
            <li><NavLink to="/teams">Teams</NavLink></li>
            <li><NavLink to="/roles">Roles</NavLink></li>
            <li><NavLink to="/projects">Projects</NavLink></li>
        </>
    )

    return (
        <nav>
            <ul>
                {isLoggedIn ? userNav : guestNav}
            </ul>
        </nav>
    );
}

export default Navigation;