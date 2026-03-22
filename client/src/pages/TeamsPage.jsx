import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "../api/client.js";
import { endpoints } from "../api/endpoints.js";
import { useAuth } from "../hooks/useAuth.js";

const TeamsPage = () => {
    const { user } = useAuth();
    const isCeo = user?.roleName === "CEO";

    const [projects, setProjects] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    const [teams, setTeams] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

    const [filters, setFilters] = useState({ q: "", projectName: "all" });
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [teamDetail, setTeamDetail] = useState(null);

    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [teamToEditId, setTeamToEditId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProjectsAndUsers = useCallback(async () => {
        try {
            const [pr, us] = await Promise.all([
                apiJson(endpoints.projects.list({ page: 1, pageSize: 100 })),
                isCeo ? apiJson(endpoints.users.list({ page: 1, pageSize: 200 })) : Promise.resolve({ items: [] }),
            ]);
            setProjects(pr.items || []);
            setAllUsers(us.items || []);
        } catch (e) {
            setError(e.message);
        }
    }, [isCeo]);

    const projectNameFilter = useMemo(() => {
        if (filters.projectName === "all") return undefined;
        const p = projects.find((x) => x.id === filters.projectName);
        return p?.name;
    }, [filters.projectName, projects]);

    const loadTeams = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await apiJson(endpoints.teams.list({
                page,
                pageSize,
                search: filters.q.trim() || undefined,
                projectName: projectNameFilter,
            }));
            setTeams(res.items || []);
            setTotalCount(res.totalCount ?? 0);
        } catch (e) {
            setError(e.message);
            setTeams([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters.q, projectNameFilter]);

    useEffect(() => {
        loadProjectsAndUsers();
    }, [loadProjectsAndUsers]);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    useEffect(() => {
        if (!selectedTeamId) {
            setTeamDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const d = await apiJson(endpoints.teams.byId(selectedTeamId));
                if (!cancelled) setTeamDetail(d);
            } catch {
                if (!cancelled) setTeamDetail(null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedTeamId]);

    const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId) || null, [teams, selectedTeamId]);
    const teamToEdit = useMemo(() => teams.find((t) => t.id === teamToEditId) || null, [teams, teamToEditId]);

    function teamMemberName(u) {
        return `${u.firstName} ${u.lastName}`;
    }

    function startEditTeam(teamId) {
        setOverlayOpen(true);
        setTeamToEditId(teamId);
    }

    async function saveEditedTeam(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const name = form.name.value.trim();
        const projectId = form.projectId.value || null;

        if (!name) {
            alert("Team name cannot be empty!");
            return;
        }

        try {
            await apiJson(endpoints.teams.byId(teamToEditId), {
                method: "PUT",
                json: {
                    name,
                    projectId,
                    teamLeadId: teamToEdit?.teamLeadId || null,
                },
            });
            setOverlayOpen(false);
            setTeamToEditId(null);
            await loadTeams();
            if (selectedTeamId === teamToEditId) {
                const d = await apiJson(endpoints.teams.byId(teamToEditId));
                setTeamDetail(d);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function addTeam(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const name = form.name.value.trim();
        const projectId = form.projectId.value || null;

        if (!name) {
            alert("Team name cannot be empty!");
            return;
        }

        try {
            await apiJson(endpoints.teams.list({}), {
                method: "POST",
                json: { name, projectId, teamLeadId: null },
            });
            setIsAddingTeam(false);
            form.reset();
            await loadTeams();
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteTeam(teamId) {
        if (!confirm("Are you sure you want to delete this team?")) return;
        try {
            await apiJson(endpoints.teams.byId(teamId), { method: "DELETE" });
            if (selectedTeamId === teamId) setSelectedTeamId(null);
            await loadTeams();
        } catch (err) {
            alert(err.message);
        }
    }

    async function removeMember(teamId, userId) {
        try {
            await apiJson(endpoints.teams.member(teamId, userId), { method: "DELETE" });
            const d = await apiJson(endpoints.teams.byId(teamId));
            setTeamDetail(d);
            await loadTeams();
            await loadProjectsAndUsers();
        } catch (err) {
            alert(err.message);
        }
    }

    async function addMember(teamId, userId) {
        try {
            await apiJson(endpoints.teams.members(teamId), {
                method: "POST",
                json: { userId },
            });
            const d = await apiJson(endpoints.teams.byId(teamId));
            setTeamDetail(d);
            await loadTeams();
            await loadProjectsAndUsers();
        } catch (err) {
            alert(err.message);
        }
    }

    const memberIdsOnTeam = useMemo(() => {
        if (!teamDetail) return new Set();
        const ids = new Set((teamDetail.members || []).map((m) => m.id));
        if (teamDetail.teamLeadId) ids.add(teamDetail.teamLeadId);
        return ids;
    }, [teamDetail]);

    const availableMembers = useMemo(() => {
        return allUsers.filter((u) => !memberIdsOnTeam.has(u.id));
    }, [allUsers, memberIdsOnTeam]);

    if (!user) {
        return (
            <div id="teams">
                <h1>Teams</h1>
                <p>Please log in to view teams.</p>
            </div>
        );
    }

    return (
        <div id="teams">
            {overlayOpen && teamToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing team &quot;{teamToEdit.name}&quot;</h3>
                        <form onSubmit={saveEditedTeam} className="inline-form">
                            <input type="text" name="name" placeholder="Team name" defaultValue={teamToEdit.name} />
                            <select name="projectId" defaultValue={teamToEdit.projectId || ""}>
                                <option value="">No project</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>
            )}

            <h1>Teams</h1>
            
            {loading ? <p>Loading…</p> : null}

            <section className="titlebar">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search by team or project..."
                        value={filters.q}
                        onChange={(e) => { setFilters((prev) => ({ ...prev, q: e.target.value })); setPage(1); }}
                    />
                    <select value={filters.projectName} onChange={(e) => { setFilters((prev) => ({ ...prev, projectName: e.target.value })); setPage(1); }}>
                        <option value="all">All projects</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {isCeo && (isAddingTeam ? (
                    <form className="inline-form" onSubmit={addTeam}>
                        <input type="text" name="name" placeholder="Team name" />
                        <select name="projectId" defaultValue={projects[0]?.id || ""}>
                            <option value="">No project</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="controls">
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setIsAddingTeam(false)}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button type="button" onClick={() => setIsAddingTeam(true)}>Add team +</button>
                ))}
            </section>

            <section className="grid">
                <div className="list">
                    {teams.map((t) => {
                        const lead = t.teamLeadId ? allUsers.find((u) => u.id === t.teamLeadId) : null;

                        return (
                            <article
                                key={t.id}
                                className={t.id === selectedTeamId ? "active" : ""}
                                onClick={() => setSelectedTeamId(t.id)}
                            >
                                <div className="main">
                                    <h2>{t.name}</h2>
                                    <p>{t.projectName || "No project"}</p>
                                </div>
                                <div className="meta">
                                    <span>Lead: {lead ? teamMemberName(lead) : "—"}</span>
                                    <span>Members: {t.membersCount}</span>
                                </div>
                                {isCeo && (
                                    <div className="actions">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); startEditTeam(t.id); }}>Edit</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }}>Delete</button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                    <div className="pagination">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <span>Page {page} / {totalPages}</span>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>

                <div className="details">
                    {!selectedTeam ? (
                        <div className="empty">Select a team to see details.</div>
                    ) : !teamDetail || teamDetail.id !== selectedTeamId ? (
                        <div className="empty">Loading details…</div>
                    ) : (
                        <>
                            <h2>{teamDetail.name}</h2>
                            <p className="subtitle">Project: <strong>{teamDetail.projectName || "—"}</strong></p>

                            <div className="card">
                                <h3>Team Lead</h3>
                                {teamDetail.teamLead ? (
                                    <div className="row">
                                        <span>{teamMemberName(teamDetail.teamLead)} ({teamDetail.teamLead.username})</span>
                                        {isCeo && (
                                            <button type="button" onClick={() => removeMember(selectedTeam.id, teamDetail.teamLead.id)}>Remove</button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="muted">No team lead assigned.</p>
                                )}
                            </div>

                            <div className="card">
                                <h3>Members</h3>
                                {(teamDetail.members || []).filter((m) => m.id !== teamDetail.teamLeadId).length ? (
                                    teamDetail.members.filter((m) => m.id !== teamDetail.teamLeadId).map((d) => (
                                        <div key={d.id} className="row">
                                            <span>{teamMemberName(d)} ({d.username}) — {d.roleName}</span>
                                            {isCeo && (
                                                <button type="button" onClick={() => removeMember(selectedTeam.id, d.id)}>Remove</button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="muted">No members in this team.</p>
                                )}
                            </div>

                            {isCeo && (
                                <div className="card">
                                    <h3>Add member</h3>
                                    <div className="row">
                                        <select
                                            onChange={(e) => {
                                                const userId = e.target.value;
                                                if (!userId) return;
                                                addMember(selectedTeam.id, userId);
                                                e.target.value = "";
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Choose user...</option>
                                            {availableMembers.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {teamMemberName(u)} ({u.roleName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};

export default TeamsPage;
