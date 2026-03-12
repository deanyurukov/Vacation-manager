import { useMemo, useState } from "react";

const ProjectsPage = () => {
    const [projects, setProjects] = useState([
        { id: "p1", name: "Vacation Manager", description: "Internal HR app for managing vacations.", teamIds: ["t1"] },
        { id: "p2", name: "Billing Portal", description: "Customer billing and invoices.", teamIds: ["t2"] },
        { id: "p3", name: "Website", description: "Marketing website refresh.", teamIds: [] },
    ]);

    const [teams, setTeams] = useState([
        { id: "t1", name: "Core", projectId: "p1" },
        { id: "t2", name: "Payments", projectId: "p2" },
        { id: "t3", name: "Frontend Guild", projectId: null },
    ]);

    const [filters, setFilters] = useState({ q: "" });
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [isAddingProject, setIsAddingProject] = useState(false);

    const [overlayOpen, setOverlayOpen] = useState(false);
    const [projectToEditId, setProjectToEditId] = useState(null);

    const filteredProjects = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return projects.filter((p) => {
            if (!q) return true;
            return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        });
    }, [projects, filters]);

    const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) || null, [projects, selectedProjectId]);
    const projectTeams = useMemo(() => {
        if (!selectedProject) return [];
        return teams.filter((t) => selectedProject.teamIds.includes(t.id));
    }, [teams, selectedProject]);

    const unassignedTeams = useMemo(() => {
        if (!selectedProject) return [];
        return teams.filter((t) => !selectedProject.teamIds.includes(t.id));
    }, [teams, selectedProject]);

    function addProject(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const name = form.name.value.trim();
        const description = form.description.value.trim();

        if (!name) {
            alert("Project name cannot be empty!");
            return;
        }

        if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
            alert("Project already exists!");
            return;
        }

        const id = `p${Math.random().toString(16).slice(2)}`;
        setProjects((prev) => [...prev, { id, name, description, teamIds: [] }]);
        setIsAddingProject(false);
        form.reset();
    }

    function deleteProject(projectId) {
        if (!confirm("Are you sure you want to delete this project?")) return;

        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setTeams((prev) => prev.map((t) => (t.projectId === projectId ? { ...t, projectId: null } : t)));
        if (selectedProjectId === projectId) setSelectedProjectId(null);
    }

    function startEditProject(projectId) {
        setOverlayOpen(true);
        setProjectToEditId(projectId);
    }

    function saveEditedProject(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const name = form.name.value.trim();
        const description = form.description.value.trim();

        if (!name) {
            alert("Project name cannot be empty!");
            return;
        }

        setProjects((prev) => prev.map((p) => (p.id === projectToEditId ? { ...p, name, description } : p)));
        setOverlayOpen(false);
        setProjectToEditId(null);
    }

    function addTeamToProject(projectId, teamId) {
        setProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, teamIds: p.teamIds.includes(teamId) ? p.teamIds : [...p.teamIds, teamId] } : p))
        );
        setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, projectId } : t)));
    }

    function removeTeamFromProject(projectId, teamId) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, teamIds: p.teamIds.filter((id) => id !== teamId) } : p)));
        setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, projectId: null } : t)));
    }

    const projectToEdit = useMemo(() => projects.find((p) => p.id === projectToEditId) || null, [projects, projectToEditId]);

    return (
        <div id="projects">
            {overlayOpen && projectToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing project "{projectToEdit.name}"</h3>
                        <form onSubmit={saveEditedProject} className="inline-form">
                            <input type="text" name="name" placeholder="Project name" defaultValue={projectToEdit.name} />
                            <input type="text" name="description" placeholder="Description" defaultValue={projectToEdit.description} />
                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>
            )}

            <h1>Projects</h1>

            <section className="titlebar">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={filters.q}
                        onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                    />
                </div>

                {isAddingProject ? (
                    <form className="inline-form" onSubmit={addProject}>
                        <input type="text" name="name" placeholder="Project name" />
                        <input type="text" name="description" placeholder="Description" />
                        <div className="controls">
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setIsAddingProject(false)}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setIsAddingProject(true)}>Add project +</button>
                )}
            </section>

            <section className="grid">
                <div className="list">
                    {filteredProjects.map((p) => (
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
                                <span>Teams: {p.teamIds.length}</span>
                            </div>
                            <div className="actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); startEditProject(p.id); }}>Edit</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>Delete</button>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="details">
                    {!selectedProject ? (
                        <div className="empty">Select a project to see details.</div>
                    ) : (
                        <>
                            <h2>{selectedProject.name}</h2>
                            <p className="subtitle">{selectedProject.description}</p>

                            <div className="card">
                                <h3>Teams in this project</h3>
                                {projectTeams.length ? (
                                    projectTeams.map((t) => (
                                        <div key={t.id} className="row">
                                            <span>{t.name}</span>
                                            <button type="button" onClick={() => removeTeamFromProject(selectedProject.id, t.id)}>Remove</button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="muted">No teams assigned yet.</p>
                                )}
                            </div>

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
                                                {t.name}{t.projectId ? " (assigned)" : ""}
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

export default ProjectsPage;
