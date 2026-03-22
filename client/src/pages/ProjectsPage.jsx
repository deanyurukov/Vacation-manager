import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "../api/client.js";
import { endpoints } from "../api/endpoints.js";
import { useAuth } from "../hooks/useAuth.js";

const ProjectsPage = () => {
    const { user } = useAuth();
    const isCeo = user?.roleName === "CEO";

    const [projects, setProjects] = useState([]);
    const [teams, setTeams] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

    const [filters, setFilters] = useState({ q: "" });
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [projectDetail, setProjectDetail] = useState(null);

    const [isAddingProject, setIsAddingProject] = useState(false);

    const [overlayOpen, setOverlayOpen] = useState(false);
    const [projectToEditId, setProjectToEditId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadTeams = useCallback(async () => {
        try {
            const res = await apiJson(endpoints.teams.list({ page: 1, pageSize: 200 }));
            setTeams(res.items || []);
        } catch (e) {
            setError(e.message);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await apiJson(endpoints.projects.list({
                page,
                pageSize,
                search: filters.q.trim() || undefined,
            }));
            setProjects(res.items || []);
            setTotalCount(res.totalCount ?? 0);
        } catch (e) {
            setError(e.message);
            setProjects([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters.q]);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        if (!selectedProjectId) {
            setProjectDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const d = await apiJson(endpoints.projects.byId(selectedProjectId));
                if (!cancelled) setProjectDetail(d);
            } catch {
                if (!cancelled) setProjectDetail(null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedProjectId]);

    const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) || null, [projects, selectedProjectId]);
    const projectToEdit = useMemo(() => projects.find((p) => p.id === projectToEditId) || null, [projects, projectToEditId]);

    const projectTeams = useMemo(() => {
        if (!projectDetail?.teams) return [];
        return projectDetail.teams;
    }, [projectDetail]);

    const unassignedTeams = useMemo(() => {
        if (!projectDetail?.teams) return teams;
        const inProject = new Set(projectDetail.teams.map((t) => t.id));
        return teams.filter((t) => !inProject.has(t.id));
    }, [teams, projectDetail]);

    async function addProject(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const name = form.name.value.trim();
        const description = form.description.value.trim();

        if (!name) {
            alert("Project name cannot be empty!");
            return;
        }

        try {
            await apiJson(endpoints.projects.list({}), {
                method: "POST",
                json: { name, description },
            });
            setIsAddingProject(false);
            form.reset();
            await loadProjects();
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteProject(projectId) {
        if (!confirm("Are you sure you want to delete this project?")) return;
        try {
            await apiJson(endpoints.projects.byId(projectId), { method: "DELETE" });
            if (selectedProjectId === projectId) setSelectedProjectId(null);
            await loadProjects();
            await loadTeams();
        } catch (err) {
            alert(err.message);
        }
    }

    function startEditProject(projectId) {
        setOverlayOpen(true);
        setProjectToEditId(projectId);
    }

    async function saveEditedProject(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const name = form.name.value.trim();
        const description = form.description.value.trim();

        if (!name) {
            alert("Project name cannot be empty!");
            return;
        }

        try {
            await apiJson(endpoints.projects.byId(projectToEditId), {
                method: "PUT",
                json: { name, description },
            });
            setOverlayOpen(false);
            setProjectToEditId(null);
            await loadProjects();
            if (selectedProjectId === projectToEditId) {
                const d = await apiJson(endpoints.projects.byId(projectToEditId));
                setProjectDetail(d);
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async function addTeamToProject(projectId, teamId) {
        try {
            await apiJson(endpoints.projects.teams(projectId), {
                method: "POST",
                json: { teamId },
            });
            const d = await apiJson(endpoints.projects.byId(projectId));
            setProjectDetail(d);
            await loadProjects();
            await loadTeams();
        } catch (err) {
            alert(err.message);
        }
    }

    async function removeTeamFromProject(projectId, teamId) {
        try {
            await apiJson(endpoints.projects.team(projectId, teamId), { method: "DELETE" });
            const d = await apiJson(endpoints.projects.byId(projectId));
            setProjectDetail(d);
            await loadProjects();
            await loadTeams();
        } catch (err) {
            alert(err.message);
        }
    }

    if (!user) {
        return (
            <div id="projects">
                <h1>Projects</h1>
                <p>Please log in to view projects.</p>
            </div>
        );
    }

    return (
        <div id="projects">
            {overlayOpen && projectToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing project &quot;{projectToEdit.name}&quot;</h3>
                        <form onSubmit={saveEditedProject} className="inline-form">
                            <input type="text" name="name" placeholder="Project name" defaultValue={projectToEdit.name} />
                            <input type="text" name="description" placeholder="Description" defaultValue={projectToEdit.description} />
                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>
            )}

            <h1>Projects</h1>

            {loading ? <p>Loading…</p> : null}

            <section className="titlebar">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={filters.q}
                        onChange={(e) => { setFilters((prev) => ({ ...prev, q: e.target.value })); setPage(1); }}
                    />
                </div>

                {isCeo && (isAddingProject ? (
                    <form className="inline-form" onSubmit={addProject}>
                        <input type="text" name="name" placeholder="Project name" />
                        <input type="text" name="description" placeholder="Description" />
                        <div className="controls">
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setIsAddingProject(false)}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button type="button" onClick={() => setIsAddingProject(true)}>Add project +</button>
                ))}
            </section>

            <section className="grid">
                <div className="list">
                    {projects.map((p) => (
                        <article
                            key={p.id}
                            className={p.id === selectedProjectId ? "active" : ""}
                            onClick={() => setSelectedProjectId(p.id)}
                        >
                            <div className="main">
                                <h2>{p.name}</h2>
                                <p>{p.description}</p>
                            </div>
                            <div className="meta">
                                <span>Teams: {p.teamsCount}</span>
                            </div>
                            {isCeo && (
                                <div className="actions">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); startEditProject(p.id); }}>Edit</button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>Delete</button>
                                </div>
                            )}
                        </article>
                    ))}
                    <div className="pagination">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <span>Page {page} / {totalPages}</span>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>

                <div className="details">
                    {!selectedProject ? (
                        <div className="empty">Select a project to see details.</div>
                    ) : !projectDetail || projectDetail.id !== selectedProjectId ? (
                        <div className="empty">Loading details…</div>
                    ) : (
                        <>
                            <h2>{projectDetail.name}</h2>
                            <p className="subtitle">{projectDetail.description}</p>

                            <div className="card">
                                <h3>Teams in this project</h3>
                                {projectTeams.length ? (
                                    projectTeams.map((t) => (
                                        <div key={t.id} className="row">
                                            <span>{t.name}</span>
                                            {isCeo && (
                                                <button type="button" onClick={() => removeTeamFromProject(selectedProject.id, t.id)}>Remove</button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="muted">No teams assigned yet.</p>
                                )}
                            </div>

                            {isCeo && (
                                <div className="card">
                                    <h3>Add team</h3>
                                    <div className="row">
                                        <select
                                            onChange={(e) => {
                                                const teamId = e.target.value;
                                                if (!teamId) return;
                                                addTeamToProject(selectedProject.id, teamId);
                                                e.target.value = "";
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Choose team...</option>
                                            {unassignedTeams.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
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

export default ProjectsPage;
