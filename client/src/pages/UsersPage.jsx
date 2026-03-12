import { useMemo, useState } from "react";

const UsersPage = () => {
    const [roles] = useState(["CEO", "Team Lead", "Developer", "Unassigned"]);

    const [teams] = useState([
        { id: "t1", name: "Core" },
        { id: "t2", name: "Payments" },
        { id: "t3", name: "Frontend Guild" },
    ]);

    const [users, setUsers] = useState([
        { id: "u1", username: "ceo", password: "secret", firstName: "Alice", lastName: "Johnson", role: "CEO", teamId: "t1" },
        { id: "u2", username: "lead1", password: "secret", firstName: "Jane", lastName: "Smith", role: "Team Lead", teamId: "t1" },
        { id: "u3", username: "dev1", password: "secret", firstName: "John", lastName: "Doe", role: "Developer", teamId: "t1" },
        { id: "u4", username: "dev2", password: "secret", firstName: "Grace", lastName: "Lee", role: "Developer", teamId: "t2" },
        { id: "u5", username: "unassigned", password: "secret", firstName: "Bob", lastName: "Brown", role: "Unassigned", teamId: null },
        { id: "u6", username: "dev3", password: "secret", firstName: "Charlie", lastName: "Davis", role: "Developer", teamId: null },
        { id: "u7", username: "dev4", password: "secret", firstName: "Eve", lastName: "Wilson", role: "Developer", teamId: "t2" },
        { id: "u8", username: "lead2", password: "secret", firstName: "Frank", lastName: "Miller", role: "Team Lead", teamId: "t3" },
        { id: "u9", username: "dev5", password: "secret", firstName: "Helen", lastName: "Stone", role: "Developer", teamId: "t3" },
        { id: "u10", username: "dev6", password: "secret", firstName: "Ivan", lastName: "Petrov", role: "Developer", teamId: null },
        { id: "u11", username: "dev7", password: "secret", firstName: "Maria", lastName: "Ivanova", role: "Developer", teamId: "t1" },
    ]);

    const [filters, setFilters] = useState({ q: "", role: "all" });
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const [selectedUserId, setSelectedUserId] = useState(null);

    const [overlayOpen, setOverlayOpen] = useState(false);
    const [userToEditId, setUserToEditId] = useState(null);

    const filteredUsers = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return users.filter((u) => {
            const matchesRole = filters.role === "all" || u.role === filters.role;
            const matchesQ =
                !q ||
                u.username.toLowerCase().includes(q) ||
                u.firstName.toLowerCase().includes(q) ||
                u.lastName.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q);
            return matchesRole && matchesQ;
        });
    }, [users, filters]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredUsers.length / pageSize)), [filteredUsers.length, pageSize]);
    const pagedUsers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, page, pageSize]);

    const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) || null, [users, selectedUserId]);
    const userToEdit = useMemo(() => users.find((u) => u.id === userToEditId) || null, [users, userToEditId]);

    function teamName(teamId) {
        if (!teamId) return "—";
        const t = teams.find((x) => x.id === teamId);
        return t ? t.name : "—";
    }

    function deleteUser(userId) {
        if (!confirm("Are you sure you want to delete this user?")) return;
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (selectedUserId === userId) setSelectedUserId(null);
    }

    function startEditUser(userId) {
        setOverlayOpen(true);
        setUserToEditId(userId);
    }

    function saveEditedUser(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const username = form.username.value.trim();
        const firstName = form.firstName.value.trim();
        const lastName = form.lastName.value.trim();
        const role = form.role.value;
        const teamId = form.teamId.value || null;

        if (!username || !firstName || !lastName) {
            alert("All fields marked with * are required.");
            return;
        }

        setUsers((prev) =>
            prev.map((u) =>
                u.id === userToEditId
                    ? { ...u, username, firstName, lastName, role, teamId: teamId || null }
                    : u
            )
        );
        setOverlayOpen(false);
        setUserToEditId(null);
    }

    function updateUserTeam(userId, teamId) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, teamId: teamId || null } : u)));
    }

    function updateUserRole(userId, role) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    }

    function resetToFirstPage() {
        setPage(1);
    }

    return (
        <div id="users">
            {overlayOpen && userToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing user "{userToEdit.username}"</h3>
                        <form onSubmit={saveEditedUser} className="inline-form">
                            <input type="text" name="firstName" placeholder="First name*" defaultValue={userToEdit.firstName} />
                            <input type="text" name="lastName" placeholder="Last name*" defaultValue={userToEdit.lastName} />
                            <input type="text" name="username" placeholder="Username*" defaultValue={userToEdit.username} />
                            <select name="role" defaultValue={userToEdit.role}>
                                {roles.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <select name="teamId" defaultValue={userToEdit.teamId || ""}>
                                <option value="">No team</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>
            )}

            <h1>Users</h1>

            <section className="titlebar">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search by username, name, last name or role..."
                        value={filters.q}
                        onChange={(e) => { setFilters((prev) => ({ ...prev, q: e.target.value })); resetToFirstPage(); }}
                    />
                    <select
                        value={filters.role}
                        onChange={(e) => { setFilters((prev) => ({ ...prev, role: e.target.value })); resetToFirstPage(); }}
                    >
                        <option value="all">All roles</option>
                        {roles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); resetToFirstPage(); }}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </section>

            <section className="grid">
                <div className="list">
                    <div className="thead">
                        <span>User</span>
                        <span>Role</span>
                        <span>Team</span>
                        <span>Actions</span>
                    </div>
                    {pagedUsers.map((u) => (
                        <div
                            key={u.id}
                            className={`trow ${u.id === selectedUserId ? "active" : ""}`}
                            onClick={() => setSelectedUserId(u.id)}
                        >
                            <span><strong>{u.username}</strong> <em>{u.firstName} {u.lastName}</em></span>
                            <span>{u.role}</span>
                            <span>{teamName(u.teamId)}</span>
                            <span className="actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); startEditUser(u.id); }}>Edit</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }}>Delete</button>
                            </span>
                        </div>
                    ))}

                    <div className="pagination">
                        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <span>Page {page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>

                <div className="details">
                    {!selectedUser ? (
                        <div className="empty">Select a user to see details.</div>
                    ) : (
                        <>
                            <h2>{selectedUser.firstName} {selectedUser.lastName}</h2>
                            <p className="subtitle">@{selectedUser.username}</p>

                            <div className="card">
                                <h3>Role</h3>
                                <div className="row">
                                    <select value={selectedUser.role} onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}>
                                        {roles.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="card">
                                <h3>Team</h3>
                                <div className="row">
                                    <select value={selectedUser.teamId || ""} onChange={(e) => updateUserTeam(selectedUser.id, e.target.value)}>
                                        <option value="">No team</option>
                                        {teams.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

export default UsersPage;