import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBlob, apiJson, apiRequest, parseError } from "../api/client.js";
import { endpoints } from "../api/endpoints.js";
import { useAuth } from "../hooks/useAuth.js";

const LEAVE_TYPES = ["Paid", "Unpaid", "Sick"];
const LEAVE_STATUS = ["Pending", "Approved", "Rejected"];

function leaveTypeLabel(t) {
    if (typeof t === "string") return t;
    return LEAVE_TYPES[t] ?? String(t);
}

function leaveStatusLabel(s) {
    if (typeof s === "string") return s;
    return LEAVE_STATUS[s] ?? String(s);
}

const HolidaysPage = () => {
    const { user } = useAuth();

    const [requests, setRequests] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    const [filterCreatedAfter, setFilterCreatedAfter] = useState("");
    const [mineOnly, setMineOnly] = useState(true);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const [isCreating, setIsCreating] = useState(false);
    const [createType, setCreateType] = useState("Paid");
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [requestToEditId, setRequestToEditId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const canFilterAll = user?.roleName === "CEO" || user?.roleName === "TeamLead";

    const loadRequests = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const params = {
                page,
                pageSize,
                mineOnly,
            };
            if (filterCreatedAfter) {
                const d = new Date(`${filterCreatedAfter}T00:00:00.000Z`);
                params.createdAfterUtc = d.toISOString();
            }
            const res = await apiJson(endpoints.leaveRequests.list(params));
            setRequests(res.items || []);
            setTotalCount(res.totalCount ?? 0);
        } catch (e) {
            setError(e.message);
            setRequests([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [user, page, pageSize, filterCreatedAfter, mineOnly]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

    const requestToEdit = useMemo(() => requests.find((r) => r.id === requestToEditId) || null, [requests, requestToEditId]);

    function isPending(r) {
        const s = r.status;
        return s === 0 || s === "Pending";
    }

    function isApproved(r) {
        const s = r.status;
        return s === 1 || s === "Approved";
    }

    function canEditOrDelete(r) {
        return r.applicantId === user?.id && isPending(r);
    }

    function canApprove(r) {
        if (!isPending(r)) return false;
        return user?.roleName === "CEO" || user?.roleName === "TeamLead";
    }

    async function deleteRequest(requestId) {
        const r = requests.find((x) => x.id === requestId);
        if (!r) return;
        if (!canEditOrDelete(r)) {
            alert("You can delete only your own pending requests.");
            return;
        }
        if (!confirm("Delete this request?")) return;
        try {
            await apiJson(endpoints.leaveRequests.byId(requestId), { method: "DELETE" });
            await loadRequests();
        } catch (e) {
            alert(e.message);
        }
    }

    async function approveRequest(requestId) {
        const r = requests.find((x) => x.id === requestId);
        if (!r) return;
        if (!canApprove(r)) {
            alert("You are not allowed to approve this request.");
            return;
        }
        try {
            await apiJson(endpoints.leaveRequests.review(requestId), {
                method: "POST",
                json: { approve: true },
            });
            await loadRequests();
        } catch (e) {
            alert(e.message);
        }
    }

    async function downloadSickNote(id) {
        try {
            const blob = await apiBlob(endpoints.leaveRequests.sickNote(id));
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `sick-note-${id}`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            alert(e.message);
        }
    }

    function startEditRequest(r) {
        if (!canEditOrDelete(r)) {
            alert("You can edit only your own pending requests.");
            return;
        }
        setOverlayOpen(true);
        setRequestToEditId(r.id);
    }

    async function saveEditedRequest(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const from = form.from.value;
        const to = form.to.value;
        const halfDay = requestToEdit && leaveTypeLabel(requestToEdit.type) === "Sick"
            ? false
            : Boolean(form.halfDay?.checked);

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

        try {
            await apiJson(endpoints.leaveRequests.byId(requestToEditId), {
                method: "PUT",
                json: {
                    fromDate: from,
                    toDate: to,
                    isHalfDay: halfDay,
                },
            });
            setOverlayOpen(false);
            setRequestToEditId(null);
            await loadRequests();
        } catch (err) {
            alert(err.message);
        }
    }

    async function createRequest(e) {
        e.preventDefault();
        const form = e.currentTarget;

        const from = form.from.value;
        const to = form.to.value;
        const halfDay = createType === "Sick" ? false : Boolean(form.halfDay?.checked);
        const attachmentFile = createType === "Sick" ? (form.attachment?.files?.[0] || null) : null;

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
        if (createType === "Sick" && !attachmentFile) {
            alert("Sick leave requires an attached file.");
            return;
        }

        const fd = new FormData();
        fd.append("type", createType);
        fd.append("fromDate", from);
        fd.append("toDate", to);
        fd.append("isHalfDay", halfDay ? "true" : "false");
        if (attachmentFile) fd.append("sickNoteFile", attachmentFile);

        try {
            const res = await apiRequest(endpoints.leaveRequests.list({}), {
                method: "POST",
                body: fd,
            });
            if (!res.ok) {
                throw new Error(await parseError(res));
            }
            setIsCreating(false);
            setCreateType("Paid");
            form.reset();
            await loadRequests();
        } catch (err) {
            alert(err.message);
        }
    }

    if (!user) {
        return (
            <div id="holidays">
                <h1>Holidays</h1>
                <p>Please log in to view leave requests.</p>
            </div>
        );
    }

    return (
        <div id="holidays">
            {overlayOpen && requestToEdit && (
                <div className="overlay" onClick={() => setOverlayOpen(false)}>
                    <div className="content" onClick={(e) => e.stopPropagation()}>
                        <h3>Editing request</h3>
                        <form onSubmit={saveEditedRequest} className="inline-form">
                            <input type="date" name="from" defaultValue={String(requestToEdit.fromDate).slice(0, 10)} />
                            <input type="date" name="to" defaultValue={String(requestToEdit.toDate).slice(0, 10)} />
                            {leaveTypeLabel(requestToEdit.type) !== "Sick" && (
                                <label className="check">
                                    <input type="checkbox" name="halfDay" defaultChecked={requestToEdit.isHalfDay} />
                                    Half day
                                </label>
                            )}
                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>
            )}

            <h1>Holidays</h1>

            {error ? <p className="error">{error}</p> : null}
            {loading ? <p>Loading…</p> : null}

            <section className="titlebar">
                <div className="filters">
                    {canFilterAll && (
                        <label>
                            Only my requests
                            <input
                                type="checkbox"
                                checked={mineOnly}
                                onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }}
                            />
                        </label>
                    )}

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
                    <button type="button" onClick={() => { setIsCreating(true); setCreateType("Paid"); }}>New request +</button>
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
                {requests.map((r) => (
                    <div key={r.id} className="trow">
                        <span>{leaveTypeLabel(r.type)}</span>
                        <span>{String(r.fromDate).slice(0, 10)}</span>
                        <span>{String(r.toDate).slice(0, 10)}</span>
                        <span>{String(r.createdAtUtc).slice(0, 10)}</span>
                        <span>{r.applicantFullName}</span>
                        <span className={isApproved(r) ? "ok" : "pending"}>{leaveStatusLabel(r.status)}</span>
                        <span className="actions">
                            {r.hasSickNote && (
                                <button type="button" onClick={() => downloadSickNote(r.id)}>Sick note</button>
                            )}
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
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <span>Page {page} / {totalPages}</span>
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
            </section>
        </div>
    );
};

export default HolidaysPage;
