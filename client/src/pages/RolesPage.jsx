import { useCallback, useEffect, useMemo, useState } from "react";
import RoleDetails from "../components/RoleDetails.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client.js";
import { endpoints } from "../api/endpoints.js";

const RolesPage = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isAddingRole, setIsAddingRole] = useState(false);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState(null);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const loadRoles = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await apiJson(endpoints.roles.list({ page: 1, pageSize: 100 }));
            setRoles(res.items || []);
        } catch (e) {
            setError(e.message);
            setRoles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const selectedRole = useMemo(() => {
        const roleFromQuery = searchParams.get("role");
        if (roleFromQuery && roles.some((r) => r.id === roleFromQuery)) return roleFromQuery;
        return "all";
    }, [searchParams, roles]);

    function handleRoleChange(e) {
        if (e.target.value === "all") {
            navigate("");
            return;
        }
        navigate(`?role=${e.target.value}`);
    }

    async function addRole(e) {
        const input = e.target.parentElement.parentElement.querySelector("input");
        const newRole = input.value.trim();

        if (!newRole) {
            alert("Role name cannot be empty!");
            return;
        }

        try {
            await apiJson(endpoints.roles.list({}), {
                method: "POST",
                json: { name: newRole },
            });
        } catch (err) {
            alert(err.message);
            return;
        }

        input.value = "";
        setIsAddingRole(false);
        await loadRoles();
    }

    function editRole(roleItem) {
        setOverlayOpen(true);
        setRoleToEdit(roleItem);
    }

    async function saveEditedRole(e) {
        const input = e.target.parentElement.querySelector("input");
        const newName = input.value.trim();

        if (!newName) {
            alert("Role name cannot be empty!");
            return;
        }

        if (!roleToEdit) return;

        try {
            await apiJson(endpoints.roles.byId(roleToEdit.id), {
                method: "PUT",
                json: { name: newName },
            });
        } catch (err) {
            alert(err.message);
            return;
        }

        setOverlayOpen(false);
        setRoleToEdit(null);
        await loadRoles();
    }

    return (
        <div id="roles">
            {overlayOpen && roleToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing role &quot;{roleToEdit.name}&quot;</h3>
                        <input type="text" placeholder="New role name" defaultValue={roleToEdit.name} />
                        <button type="button" onClick={(e) => saveEditedRole(e)}>Save</button>
                    </div>
                </div>
            )}

            <h1>Roles</h1>
            
            {loading ? <p>Loading…</p> : null}

            <section className="titlebar">
                {isAddingRole ? (
                    <article>
                        <input type="text" placeholder="Role name" />
                        <div className="controls">
                            <button type="button" onClick={(e) => addRole(e)}>Save</button>
                            <button type="button" onClick={() => setIsAddingRole(false)}>Cancel</button>
                        </div>
                    </article>
                ) : (
                    <button type="button" onClick={() => setIsAddingRole(true)}>Add role +</button>
                )}

                <select name="roles" value={selectedRole} onChange={(e) => handleRoleChange(e)}>
                    <option value="all">
                        All
                    </option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                </select>
            </section>

            <section className="roles">
                {roles.map((role) => (
                    (selectedRole === "all" || selectedRole === role.id) && (
                        <RoleDetails
                            key={role.id}
                            roleItem={role}
                            editRole={editRole}
                            onDeleted={loadRoles}
                        />
                    )
                ))}
            </section>
        </div>
    );
}

export default RolesPage;
