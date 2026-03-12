import { useMemo, useState } from "react";

const HolidaysPage = () => {
    const [users] = useState([
        { id: "u1", username: "alice", firstName: "Alice", lastName: "Johnson", role: "CEO", teamId: "t1" },
        { id: "u2", username: "jane", firstName: "Jane", lastName: "Smith", role: "Team Lead", teamId: "t1" },
        { id: "u3", username: "john", firstName: "John", lastName: "Doe", role: "Developer", teamId: "t1" },
        { id: "u4", username: "grace", firstName: "Grace", lastName: "Lee", role: "Developer", teamId: "t2" },
    ]);

    const [teams] = useState([
        { id: "t1", name: "Core", teamLeadUserId: "u2" },
        { id: "t2", name: "Payments", teamLeadUserId: null },
    ]);

    const [currentUserId, setCurrentUserId] = useState("u3");

    const [requests, setRequests] = useState([
        {
            id: "r1",
            type: "Paid",
            from: "2026-03-20",
            to: "2026-03-22",
            createdAt: "2026-03-10",
            halfDay: false,
            approved: false,
            requesterId: "u3",
            attachment: null,
        },
        {
            id: "r2",
            type: "Sick",
            from: "2026-03-01",
            to: "2026-03-01",
            createdAt: "2026-03-01",
            halfDay: false,
            approved: true,
            requesterId: "u4",
            attachment: { name: "sick-note.txt", content: "Doctor note placeholder." },
        },
        {
            id: "r3",
            type: "Unpaid",
            from: "2026-03-25",
            to: "2026-03-25",
            createdAt: "2026-03-11",
            halfDay: true,
            approved: false,
            requesterId: "u4",
            attachment: null,
        },
    ]);

    const [filterCreatedAfter, setFilterCreatedAfter] = useState("");
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const [isCreating, setIsCreating] = useState(false);
    const [createType, setCreateType] = useState("Paid");
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [requestToEditId, setRequestToEditId] = useState(null);

    const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || users[0], [users, currentUserId]);

    function userName(userId) {
        const u = users.find((x) => x.id === userId);
        return u ? `${u.firstName} ${u.lastName}` : "Unknown";
    }

    function isAfter(dateStr, afterStr) {
        if (!afterStr) return true;
        return new Date(dateStr).getTime() >= new Date(afterStr).getTime();
    }

    const filteredRequests = useMemo(() => {
        return requests
            .filter((r) => isAfter(r.createdAt, filterCreatedAfter))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, filterCreatedAfter]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRequests.length / pageSize)), [filteredRequests.length, pageSize]);
    const pagedRequests = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRequests.slice(start, start + pageSize);
    }, [filteredRequests, page, pageSize]);

    const requestToEdit = useMemo(() => requests.find((r) => r.id === requestToEditId) || null, [requests, requestToEditId]);

    function canEditOrDelete(r) {
        return r.requesterId === currentUser.id && !r.approved;
    }

    function canApprove(r) {
        if (r.approved) return false;
        if (currentUser.role === "CEO") return true;
        if (currentUser.role !== "Team Lead") return false;

        const requester = users.find((u) => u.id === r.requesterId);
        if (!requester?.teamId) return false;
        const team = teams.find((t) => t.id === requester.teamId);
        return team?.teamLeadUserId === currentUser.id;
    }

    function deleteRequest(requestId) {
        const r = requests.find((x) => x.id === requestId);
        if (!r) return;
        if (!canEditOrDelete(r)) {
            alert("You can delete only your own unapproved requests.");
            return;
        }
        if (!confirm("Delete this request?")) return;
        setRequests((prev) => prev.filter((x) => x.id !== requestId));
    }

    function approveRequest(requestId) {
        const r = requests.find((x) => x.id === requestId);
        if (!r) return;
        if (!canApprove(r)) {
            alert("You are not allowed to approve this request.");
            return;
        }
        setRequests((prev) => prev.map((x) => (x.id === requestId ? { ...x, approved: true } : x)));
    }

    function startEditRequest(r) {
        if (!canEditOrDelete(r)) {
            alert("You can edit only your own unapproved requests.");
            return;
        }
        setOverlayOpen(true);
        setRequestToEditId(r.id);
    }

    function saveEditedRequest(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const type = form.type.value;
        const from = form.from.value;
        const to = form.to.value;
        const halfDay = type === "Sick" ? false : Boolean(form.halfDay?.checked);

        if (!from || !to) {
            alert("Dates cannot be empty!");
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(from).getTime() < today.getTime()) {
            alert('You cannot set a "From" date in the past.');
            return;
        }
        if (new Date(from).getTime() > new Date(to).getTime()) {
            alert('"From" date cannot be after "To" date.');
            return;
        }

        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestToEditId
                    ? {
                        ...r,
                        type,
                        from,
                        to,
                        halfDay,
                    }
                    : r
            )
        );
        setOverlayOpen(false);
        setRequestToEditId(null);
    }

    function createRequest(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const type = createType;
        const from = form.from.value;
        const to = form.to.value;
        const halfDay = type === "Sick" ? false : Boolean(form.halfDay?.checked);
        const attachmentFile = type === "Sick" ? (form.attachment?.files?.[0] || null) : null;

        if (!from || !to) {
            alert("Dates cannot be empty!");
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(from).getTime() < today.getTime()) {
            alert('You cannot set a "From" date in the past.');
            return;
        }
        if (new Date(from).getTime() > new Date(to).getTime()) {
            alert('"From" date cannot be after "To" date.');
            return;
        }
        if (type === "Sick" && !attachmentFile) {
            alert("Sick leave requires an attached file.");
            return;
        }

        const createdAt = new Date().toISOString().slice(0, 10);
        const id = `r${Math.random().toString(16).slice(2)}`;

        const attachment = attachmentFile
            ? { name: attachmentFile.name, content: "Dummy attachment content (no backend)." }
            : null;

        setRequests((prev) => [
            {
                id,
                type,
                from,
                to,
                createdAt,
                halfDay,
                approved: false,
                requesterId: currentUser.id,
                attachment,
            },
            ...prev,
        ]);

        setIsCreating(false);
        setCreateType("Paid");
        form.reset();
    }

    return (
        <div id="holidays">
            {overlayOpen && requestToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing request</h3>
                        <form onSubmit={saveEditedRequest} className="inline-form">
                            <select name="type" defaultValue={requestToEdit.type}>
                                <option value="Paid">Paid</option>
                                <option value="Unpaid">Unpaid</option>
                                <option value="Sick">Sick</option>
                            </select>
                            <input type="date" name="from" defaultValue={requestToEdit.from} />
                            <input type="date" name="to" defaultValue={requestToEdit.to} />
                            {requestToEdit.type !== "Sick" && (
                                <label className="check">
                                    <input type="checkbox" name="halfDay" defaultChecked={requestToEdit.halfDay} />
                                    Half day
                                </label>
                            )}
                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>
            )}

            <h1>Holidays</h1>

            <section className="titlebar">
                <div className="filters">
                    <label>
                        Acting as
                        <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName} ({u.role})
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Created after
                        <input
                            type="date"
                            value={filterCreatedAfter}
                            onChange={(e) => { setFilterCreatedAfter(e.target.value); setPage(1); }}
                        />
                    </label>

                    <label>
                        Page size
                        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                </div>

                {isCreating ? (
                    <form className="inline-form" onSubmit={createRequest}>
                        <select
                            name="type"
                            value={createType}
                            onChange={(e) => setCreateType(e.target.value)}
                        >
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Sick">Sick</option>
                        </select>
                        <input type="date" name="from" />
                        <input type="date" name="to" />
                        {createType !== "Sick" && (
                            <label className="check">
                                <input type="checkbox" name="halfDay" />
                                Half day
                            </label>
                        )}
                        {createType === "Sick" && <input type="file" name="attachment" />}
                        <div className="controls">
                            <button type="submit">Send</button>
                            <button type="button" onClick={() => { setIsCreating(false); setCreateType("Paid"); }}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => { setIsCreating(true); setCreateType("Paid"); }}>New request +</button>
                )}
            </section>

            <section className="table">
                <div className="thead">
                    <span>Type</span>
                    <span>From</span>
                    <span>To</span>
                    <span>Created</span>
                    <span>Requester</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>
                {pagedRequests.map((r) => (
                    <div key={r.id} className="trow">
                        <span>{r.type}</span>
                        <span>{r.from}</span>
                        <span>{r.to}</span>
                        <span>{r.createdAt}</span>
                        <span>{userName(r.requesterId)}</span>
                        <span className={r.approved ? "ok" : "pending"}>{r.approved ? "Approved" : "Pending"}</span>
                        <span className="actions">
                            {canApprove(r) && (
                                <button type="button" onClick={() => approveRequest(r.id)}>Approve</button>
                            )}
                            {canEditOrDelete(r) && (
                                <>
                                    <button type="button" onClick={() => startEditRequest(r)}>Edit</button>
                                    <button type="button" onClick={() => deleteRequest(r.id)}>Delete</button>
                                </>
                            )}
                        </span>
                    </div>
                ))}

                <div className="pagination">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <span>Page {page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
            </section>
        </div>
    );
};

export default HolidaysPage;
