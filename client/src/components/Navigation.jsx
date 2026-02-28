import { NavLink } from "react-router-dom";

const Navigation = () => {
    return (
        <nav>
            <ul>
                <li><NavLink to="/">Users</NavLink></li>
                <li><NavLink to="/holidays">Holidays</NavLink></li>
                <li><NavLink><img src="/logo.png" alt="logo" /></NavLink></li>
                <li><NavLink to="/teams">Teams</NavLink></li>
                <li><NavLink to="/projects">Projects</NavLink></li>
            </ul>
        </nav>
    );
}

export default Navigation;