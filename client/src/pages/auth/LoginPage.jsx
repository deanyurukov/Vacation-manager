import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput.jsx";
import { useAuth } from "../../hooks/useAuth.js";

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const from = location.state?.from?.pathname || "/";

    async function handleSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const username = form.username.value.trim();
        const password = form.password.value;
        setError("");
        setSubmitting(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || "Login failed.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div id="login">
            <h1>Log in</h1>
            <div className="form-wrapper">
                <form id="login-form" className="form" onSubmit={handleSubmit}>
                    <span>
                        <input
                            type="text"
                            name="username"
                            autoComplete="username"
                            placeholder={"Username*"}
                            required
                        />
                    </span>
                    <PasswordInput name={"password"} placeholder={`Password*`} />

                    {error ? <p className="error">{error}</p> : null}

                    <button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Log in"}</button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
