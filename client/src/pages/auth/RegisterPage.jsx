import { Link } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput.jsx";
import { useContext } from "react";
import { appContext } from "../../App.jsx";

const RegisterPage = () => {
    const { setIsLoggedIn } = useContext(appContext);

    function handleRegister(e) {
        e.preventDefault();
        // TODO....
        setIsLoggedIn(true);
        <Navigate to="/users" />;
    }

    return (
        <div id="register">
            <h1>Register</h1>
            <div className="form-wrapper">
                <form id="register-form" className="form" onSubmit={handleRegister}>
                    <div>
                        <span>
                            <input type="text" name="firstName" placeholder={`First Name*`} required />
                        </span>
                        <span>
                            <input type="text" name="lastName" placeholder={`Last Name*`} required />
                        </span>
                    </div>
                    <span>
                        <input type="text" name="username" placeholder={`Username*`} required />
                    </span>
                    <span>
                        <input type="email" name="email" placeholder={`Email*`} required />
                    </span>
                    <PasswordInput name={"password"} placeholder={`Password*`} />

                    <button type="submit">Register</button>

                    <p>Already have an account? <Link to="/login">Log in</Link>.</p>
                </form>
            </div>
        </div >
    );
}

export default RegisterPage;