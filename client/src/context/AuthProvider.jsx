import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./auth-context.js";
import { clearAuth, getStoredUser, loginRequest, persistAuth } from "../api/client.js";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());

    const login = useCallback(async (username, password) => {
        const data = await loginRequest(username, password);
        persistAuth(data.accessToken, data.user);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(() => {
        clearAuth();
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
