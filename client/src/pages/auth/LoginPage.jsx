import { Link } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput.jsx";

const LoginPage = () => {
    return (
        <div id="login">
            <h1>Log in</h1>
            <div className="form-wrapper">
                <form id="login-form" className="form">
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