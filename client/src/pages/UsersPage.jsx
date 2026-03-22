import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "../api/client.js";
import { endpoints } from "../api/endpoints.js";

const UsersPage = () => {
    const [roles, setRoles] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    const [filters, setFilters] = useState({ q: "", role: "all" });
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);

    const [overlayOpen, setOverlayOpen] = useState(false);
    const [userToEditId, setUserToEditId] = useState(null);
    const [editDetail, setEditDetail] = useState(null);

    const [isAddingUser, setIsAddingUser] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadMeta = useCallback(async () => {
        try {
            const [rolesRes, teamsRes] = await Promise.all([
                apiJson(endpoints.roles.list({ page: 1, pageSize: 100 })),
                apiJson(endpoints.teams.list({ page: 1, pageSize: 100 })),
            ]);
            setRoles(rolesRes.items || []);
            setTeams(teamsRes.items || []);
        } catch (e) {
            setError(e.message);
        }
    }, []);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = {
                page,
                pageSize,
                search: filters.q.trim() || undefined,
                role: filters.role === "all" ? undefined : filters.role,
            };
            const res = await apiJson(endpoints.users.list(params));
            setUsers(res.items || []);
            setTotalCount(res.totalCount ?? 0);
        } catch (e) {
            setError(e.message);
            setUsers([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters.q, filters.role]);

    useEffect(() => {
        loadMeta();
    }, [loadMeta]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (!selectedUserId) {
            setSelectedDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const d = await apiJson(endpoints.users.byId(selectedUserId));
                if (!cancelled) setSelectedDetail(d);
            } catch {
                if (!cancelled) setSelectedDetail(null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedUserId]);

    useEffect(() => {
        if (!overlayOpen || !userToEditId) {
            setEditDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const d = await apiJson(endpoints.users.byId(userToEditId));
                if (!cancelled) setEditDetail(d);
            } catch {
                if (!cancelled) setEditDetail(null);
            }
        })();
        return () => { cancelled = true; };
    }, [overlayOpen, userToEditId]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

    const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) || null, [users, selectedUserId]);
    const detailForPanel = selectedDetail && selectedDetail.id === selectedUserId ? selectedDetail : null;

    function teamName(teamId) {
        if (!teamId) return "—";
        const t = teams.find((x) => x.id === teamId);
        return t ? t.name : "—";
    }

    async function deleteUser(userId) {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await apiJson(endpoints.users.byId(userId), { method: "DELETE" });
            if (selectedUserId === userId) setSelectedUserId(null);
            await loadUsers();
        } catch (e) {
            alert(e.message);
        }
    }

    function startEditUser(userId) {
        setOverlayOpen(true);
        setUserToEditId(userId);
    }

    async function saveEditedUser(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const firstName = form.firstName.value.trim();
        const lastName = form.lastName.value.trim();
        const roleId = form.roleId.value || null;
        const teamId = form.teamId.value || null;

        if (!firstName || !lastName) {
            alert("All fields marked with * are required.");
            return;
        }

        try {
            await apiJson(endpoints.users.byId(userToEditId), {
                method: "PUT",
                json: {
                    firstName,
                    lastName,
                    roleId,
                    teamId,
                },
            });
            setOverlayOpen(false);
            setUserToEditId(null);
            await loadUsers();
            if (selectedUserId === userToEditId) {
                const d = await apiJson(endpoints.users.byId(userToEditId));
                setSelectedDetail(d);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function updateUserTeam(userId, teamId) {
        const d = detailForPanel;
        if (!d) return;
        try {
            const updated = await apiJson(endpoints.users.byId(userId), {
                method: "PUT",
                json: {
                    firstName: d.firstName,
                    lastName: d.lastName,
                    roleId: d.roleId,
                    teamId: teamId || null,
                },
            });
            setSelectedDetail(updated);
            await loadUsers();
        } catch (e) {
            alert(e.message);
        }
    }

    async function updateUserRole(userId, roleId) {
        const d = detailForPanel;
        if (!d) return;
        try {
            const updated = await apiJson(endpoints.users.byId(userId), {
                method: "PUT",
                json: {
                    firstName: d.firstName,
                    lastName: d.lastName,
                    roleId: roleId || null,
                    teamId: d.teamId,
                },
            });
            setSelectedDetail(updated);
            await loadUsers();
        } catch (e) {
            alert(e.message);
        }
    }

    async function addUser(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const username = form.username.value.trim();
        const password = form.password.value;
        const firstName = form.firstName.value.trim();
        const lastName = form.lastName.value.trim();
        const roleId = form.roleId.value || null;
        const teamId = form.teamId.value || null;

        if (!username || !password || !firstName || !lastName) {
            alert("Username, password, first name, and last name are required.");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        try {
            await apiJson(endpoints.users.list({}), {
                method: "POST",
                json: {
                    username,
                    password,
                    firstName,
                    lastName,
                    roleId,
                    teamId,
                },
            });
            setIsAddingUser(false);
            form.reset();
            await loadUsers();
        } catch (err) {
            alert(err.message);
        }
    }

    function resetToFirstPage() {
        setPage(1);
    }

    return (
        <div id="users">
            {overlayOpen && userToEditId && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        {!editDetail || editDetail.id !== userToEditId ? (
                            <p>Loading…</p>
                        ) : (
                            <>
                                <h3>Editing user &quot;{editDetail.username}&quot;</h3>
                                <form onSubmit={saveEditedUser} className="inline-form">
                                    <input type="text" name="firstName" placeholder="First name*" defaultValue={editDetail.firstName} />
                                    <input type="text" name="lastName" placeholder="Last name*" defaultValue={editDetail.lastName} />
                                    <select name="roleId" defaultValue={editDetail.roleId || ""}>
                                        <option value="">Unassigned</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                    <select name="teamId" defaultValue={editDetail.teamId || ""}>
                                        <option value="">No team</option>
                                        {teams.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <button type="submit">Save</button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            <h1>Users</h1>

            {loading ? <p>Loading…</p> : null}

            <section className="titlebar">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search by username, name..."
                        value={filters.q}
                        onChange={(e) => { setFilters((prev) => ({ ...prev, q: e.target.value })); resetToFirstPage(); }}
                    />
                    <select
                        value={filters.role}
                        onChange={(e) => { setFilters((prev) => ({ ...prev, role: e.target.value })); resetToFirstPage(); }}
                    >
                        <option value="all">All roles</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                    </select>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); resetToFirstPage(); }}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                {isAddingUser ? (
                    <form className="inline-form" onSubmit={addUser}>
                        <input type="text" name="username" placeholder="Username*" required autoComplete="username" />
                        <input type="password" name="password" placeholder="Password* (min 6)" required minLength={6} autoComplete="new-password" />
                        <input type="text" name="firstName" placeholder="First name*" required />
                        <input type="text" name="lastName" placeholder="Last name*" required />
                        <select name="roleId" defaultValue="">
                            <option value="">Unassigned</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <select name="teamId" defaultValue="">
                            <option value="">No team</option>
                            {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <div className="controls">
                            <button type="submit">Create user</button>
                            <button type="button" onClick={() => setIsAddingUser(false)}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button type="button" onClick={() => setIsAddingUser(true)}>Add user +</button>
                )}
            </section>

            <section className="grid">
                <div className="list">
                    <div className="thead">
                        <span>User</span>
                        <span>Role</span>
                        <span>Team</span>
                        <span>Actions</span>
                    </div>
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className={`trow ${u.id === selectedUserId ? "active" : ""}`}
                            onClick={() => setSelectedUserId(u.id)}
                        >
                            <span><strong>{u.username}</strong> <em>{u.firstName} {u.lastName}</em></span>
                            <span>{u.roleName}</span>
                            <span>{teamName(u.teamId)}</span>
                            <span className="actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); startEditUser(u.id); }}>Edit</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }}>Delete</button>
                            </span>
                        </div>
                    ))}

                    <div className="pagination">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <span>Page {page} / {totalPages}</span>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>

                <div className="details">
                    {!selectedUser ? (
                        <div className="empty">Select a user to see details.</div>
                    ) : !detailForPanel ? (
                        <div className="empty">Loading details…</div>
                    ) : (
                        <>
                            <h2>{detailForPanel.firstName} {detailForPanel.lastName}</h2>
                            <p className="subtitle">@{detailForPanel.username}</p>

                            <div className="card">
                                <h3>Role</h3>
                                <div className="row">
                                    <select
                                        value={detailForPanel.roleId || ""}
                                        onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                                    >
                                        <option value="">Unassigned</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="card">
                                <h3>Team</h3>
                                <div className="row">
                                    <select
                                        value={detailForPanel.teamId || ""}
                                        onChange={(e) => updateUserTeam(selectedUser.id, e.target.value)}
                                    >
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
