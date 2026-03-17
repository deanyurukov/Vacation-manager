import { Link, Navigate } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput.jsx";
import { useContext } from "react";
import { appContext } from "../../App.jsx";

const LoginPage = () => {
    const { setIsLoggedIn } = useContext(appContext);

    function handleLogin(e) {
        e.preventDefault();
        // TODO....
        setIsLoggedIn(true);
        <Navigate to="/users" />;
    }

    return (
        <div id="login">
            <h1>Log in</h1>
            <div className="form-wrapper">
                <form id="login-form" className="form" onSubmit={handleLogin}>
                    <span>
                        <input type="email" name="email" placeholder={"Email*"} required />
                    </span>
                    <PasswordInput name={"password"} placeholder={`Password*`} />

                    <button type="submit">Log in</button>

                    <p>Don't have an account? <Link to="/register">Register</Link>.</p>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;