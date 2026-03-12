import { useMemo, useState } from "react";
import RoleDetails from "../components/RoleDetails";
import { useNavigate, useSearchParams } from "react-router-dom";

const RolesPage = () => {
    const [roles, setRoles] = useState(["CEO", "Team Lead", "Developer", "Unassigned"]);
    const [users, setUsers] = useState([
        { name: "John Doe", role: "Developer" },
        { name: "Jane Smith", role: "Team Lead" },
        { name: "Alice Johnson", role: "CEO" },
        { name: "Bob Brown", role: "Unassigned" },
        { name: "Charlie Davis", role: "Developer" },
        { name: "Eve Wilson", role: "Team Lead" },
        { name: "Frank Miller", role: "Unassigned" },
        { name: "Grace Lee", role: "Developer" },
    ]);
    const [isAddingRole, setIsAddingRole] = useState(false);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState(null);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const selectedRole = useMemo(() => {
        const roleFromQuery = searchParams.get("role");
        if (roleFromQuery && roles.includes(roleFromQuery)) return roleFromQuery;
        return "all";
    }, [searchParams, roles]);

    function handleRoleChange(e) {
        if (e.target.value === "all") {
            navigate("");
            return;
        }
        navigate(`?role=${e.target.value}`);
    }

    function addRole(e) {
        const newRole = e.target.parentElement.parentElement.querySelector("input").value.trim();

        if (roles.includes(newRole)) {
            alert("Role already exists!");
            return;
        }

        if (!newRole) {
            alert("Role name cannot be empty!");
            return;
        }

        setRoles(prev => [...prev, newRole]);
        setIsAddingRole(false);
        e.target.parentElement.parentElement.querySelector("input").value = "";
    }

    function editRole(oldRole) {
        setOverlayOpen(true);
        setRoleToEdit(oldRole);
    }

    function saveEditedRole(e) {
        const newRole = e.target.parentElement.querySelector("input").value.trim();

        if (roles.includes(newRole)) {
            alert("New name can't be the same as an existing role!");
            return;
        }

        if (!newRole) {
            alert("Role name cannot be empty!");
            return;
        }

        setRoles(prevRoles => prevRoles.map(role => role === roleToEdit ? newRole : role));
        setUsers(prevUsers => prevUsers.map(user => user.role === roleToEdit ? { ...user, role: newRole } : user));
        setOverlayOpen(false);
        setRoleToEdit(null);
    }

    return (
        <div id="roles">
            {overlayOpen &&
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing role "{roleToEdit}"</h3>
                        <input type="text" placeholder="New role name" defaultValue={roleToEdit} />
                        <button onClick={(e) => saveEditedRole(e)}>Save</button>
                    </div>
                </div>
            }

            <h1>Roles</h1>

            <section className="titlebar">
                {isAddingRole ? (
                    <article>
                        <input type="text" placeholder="Role name" />
                        <div className="controls">
                            <button onClick={(e) => addRole(e)}>Save</button>
                            <button onClick={() => setIsAddingRole(false)}>Cancel</button>
                        </div>
                    </article>
                ) : (
                    <button onClick={() => setIsAddingRole(true)}>Add role +</button>
                )}

                <select name="roles" value={selectedRole} onChange={(e) => handleRoleChange(e)}>
                    <option value="all">
                        All
                    </option>
                    {roles.map((role, index) => (
                        <option key={index} value={role}>
                            {role}
                        </option>
                    ))}
                </select>
            </section>

            <section className="roles">
                {roles.map((role, index) => (
                    (selectedRole === "all" || selectedRole === role) &&
                    <RoleDetails key={index} role={role} users={users} setRoles={setRoles} setUsers={setUsers} editRole={editRole} />
                ))}
            </section>
        </div>
    );
}

export default RolesPage;