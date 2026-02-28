import { Link } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput.jsx";

const RegisterPage = () => {
    return (
        <div id="register">
            <h1>Register</h1>
            <div className="form-wrapper">
                <form id="register-form" className="form">
                    <div>
                        <span>
                            <input type="text" name="firstName" placeholder={`First Name*`} />
                        </span>
                        <span>
                            <input type="text" name="lastName" placeholder={`Last Name*`} />
                        </span>
                    </div>
                    <span>
                        <input type="text" name="username" placeholder={`Username*`} />
                    </span>
                    <span>
                        <input type="email" name="email" placeholder={`Email*`} />
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