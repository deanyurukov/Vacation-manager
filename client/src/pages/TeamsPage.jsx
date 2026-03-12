import { useMemo, useState } from "react";

const TeamsPage = () => {
    const [projects] = useState([
        { id: "p1", name: "Vacation Manager", description: "Internal HR app for managing vacations." },
        { id: "p2", name: "Billing Portal", description: "Customer billing and invoices." },
    ]);

    const [users, setUsers] = useState([
        { id: "u1", username: "ceo", firstName: "Alice", lastName: "Johnson", role: "CEO", teamId: "t1" },
        { id: "u2", username: "lead1", firstName: "Jane", lastName: "Smith", role: "Team Lead", teamId: "t1" },
        { id: "u3", username: "dev1", firstName: "John", lastName: "Doe", role: "Developer", teamId: "t1" },
        { id: "u4", username: "dev2", firstName: "Grace", lastName: "Lee", role: "Developer", teamId: "t2" },
        { id: "u5", username: "unassigned", firstName: "Bob", lastName: "Brown", role: "Unassigned", teamId: null },
    ]);

    const [teams, setTeams] = useState([
        { id: "t1", name: "Core", projectId: "p1", teamLeadUserId: "u2", developerUserIds: ["u3"] },
        { id: "t2", name: "Payments", projectId: "p2", teamLeadUserId: null, developerUserIds: ["u4"] },
    ]);

    const [filters, setFilters] = useState({ q: "", project: "all" });
    const [selectedTeamId, setSelectedTeamId] = useState(null);

    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [teamToEditId, setTeamToEditId] = useState(null);

    const filteredTeams = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return teams.filter((t) => {
            const project = projects.find((p) => p.id === t.projectId);
            const matchesQ =
                !q ||
                t.name.toLowerCase().includes(q) ||
                (project?.name || "").toLowerCase().includes(q);

            const matchesProject = filters.project === "all" || t.projectId === filters.project;
            return matchesQ && matchesProject;
        });
    }, [filters, teams, projects]);

    const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId) || null, [teams, selectedTeamId]);
    const selectedProject = useMemo(() => projects.find((p) => p.id === selectedTeam?.projectId) || null, [projects, selectedTeam]);

    const teamLead = useMemo(() => {
        if (!selectedTeam?.teamLeadUserId) return null;
        return users.find((u) => u.id === selectedTeam.teamLeadUserId) || null;
    }, [selectedTeam, users]);

    const teamDevelopers = useMemo(() => {
        if (!selectedTeam) return [];
        return selectedTeam.developerUserIds
            .map((id) => users.find((u) => u.id === id))
            .filter(Boolean);
    }, [selectedTeam, users]);

    function teamMemberName(u) {
        return `${u.firstName} ${u.lastName}`;
    }

    function startEditTeam(teamId) {
        setOverlayOpen(true);
        setTeamToEditId(teamId);
    }

    function saveEditedTeam(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const name = form.name.value.trim();
        const projectId = form.projectId.value;

        if (!name) {
            alert("Team name cannot be empty!");
            return;
        }

        setTeams((prev) => prev.map((t) => (t.id === teamToEditId ? { ...t, name, projectId } : t)));
        setOverlayOpen(false);
        setTeamToEditId(null);
    }

    function addTeam(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const name = form.name.value.trim();
        const projectId = form.projectId.value;

        if (!name) {
            alert("Team name cannot be empty!");
            return;
        }

        if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
            alert("Team already exists!");
            return;
        }

        const id = `t${Math.random().toString(16).slice(2)}`;
        setTeams((prev) => [...prev, { id, name, projectId, teamLeadUserId: null, developerUserIds: [] }]);
        setIsAddingTeam(false);
        form.reset();
    }

    function deleteTeam(teamId) {
        if (!confirm("Are you sure you want to delete this team?")) return;
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        setUsers((prev) => prev.map((u) => (u.teamId === teamId ? { ...u, teamId: null } : u)));
        if (selectedTeamId === teamId) setSelectedTeamId(null);
    }

    function addMember(teamId, userId) {
        const u = users.find((x) => x.id === userId);
        if (!u) return;

        setTeams((prev) =>
            prev.map((t) =>
                t.id !== teamId
                    ? t
                    : u.role === "Team Lead"
                        ? { ...t, teamLeadUserId: userId }
                        : { ...t, developerUserIds: t.developerUserIds.includes(userId) ? t.developerUserIds : [...t.developerUserIds, userId] }
            )
        );

        setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, teamId } : x)));
    }

    function removeMember(teamId, userId) {
        setTeams((prev) =>
            prev.map((t) => {
                if (t.id !== teamId) return t;
                if (t.teamLeadUserId === userId) return { ...t, teamLeadUserId: null };
                return { ...t, developerUserIds: t.developerUserIds.filter((id) => id !== userId) };
            })
        );
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, teamId: null } : u)));
    }

    const availableMembers = useMemo(() => {
        if (!selectedTeam) return [];
        return users.filter((u) => u.teamId !== selectedTeam.id);
    }, [users, selectedTeam]);

    const teamToEdit = useMemo(() => teams.find((t) => t.id === teamToEditId) || null, [teams, teamToEditId]);

    return (
        <div id="teams">
            {overlayOpen && teamToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing team "{teamToEdit.name}"</h3>
                        <form onSubmit={saveEditedTeam} className="inline-form">
                            <input type="text" name="name" placeholder="Team name" defaultValue={teamToEdit.name} />
                            <select name="projectId" defaultValue={teamToEdit.projectId}>
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

            <section className="titlebar">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search by team or project..."
                        value={filters.q}
                        onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                    />
                    <select value={filters.project} onChange={(e) => setFilters((prev) => ({ ...prev, project: e.target.value }))}>
                        <option value="all">All projects</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {isAddingTeam ? (
                    <form className="inline-form" onSubmit={addTeam}>
                        <input type="text" name="name" placeholder="Team name" />
                        <select name="projectId" defaultValue={projects[0]?.id}>
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
                    <button onClick={() => setIsAddingTeam(true)}>Add team +</button>
                )}
            </section>

            <section className="grid">
                <div className="list">
                    {filteredTeams.map((t) => {
                        const p = projects.find((x) => x.id === t.projectId);
                        const lead = t.teamLeadUserId ? users.find((u) => u.id === t.teamLeadUserId) : null;
                        const devCount = t.developerUserIds.length;

                        return (
                            <article
                                key={t.id}
                                className={t.id === selectedTeamId ? "active" : ""}
                                onClick={() => setSelectedTeamId(t.id)}
                            >
                                <div className="main">
                                    <h2>{t.name}</h2>
                                    <p>{p?.name || "No project"}</p>
                                </div>
                                <div className="meta">
                                    <span>Lead: {lead ? teamMemberName(lead) : "—"}</span>
                                    <span>Developers: {devCount}</span>
                                </div>
                                <div className="actions">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); startEditTeam(t.id); }}>Edit</button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteTeam(t.id); }}>Delete</button>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="details">
                    {!selectedTeam ? (
                        <div className="empty">Select a team to see details.</div>
                    ) : (
                        <>
                            <h2>{selectedTeam.name}</h2>
                            <p className="subtitle">Project: <strong>{selectedProject?.name || "—"}</strong></p>

                            <div className="card">
                                <h3>Team Lead</h3>
                                {teamLead ? (
                                    <div className="row">
                                        <span>{teamMemberName(teamLead)} ({teamLead.username})</span>
                                        <button type="button" onClick={() => removeMember(selectedTeam.id, teamLead.id)}>Remove</button>
                                    </div>
                                ) : (
                                    <p className="muted">No team lead assigned.</p>
                                )}
                            </div>

                            <div className="card">
                                <h3>Developers</h3>
                                {teamDevelopers.length ? (
                                    teamDevelopers.map((d) => (
                                        <div key={d.id} className="row">
                                            <span>{teamMemberName(d)} ({d.username})</span>
                                            <button type="button" onClick={() => removeMember(selectedTeam.id, d.id)}>Remove</button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="muted">No developers in this team.</p>
                                )}
                            </div>

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
                                                {teamMemberName(u)} ({u.role})
                                            </option>
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
};

export default TeamsPage;
