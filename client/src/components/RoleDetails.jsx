import { useEffect, useState } from "react";
import { apiJson } from "../api/client.js";
import { endpoints } from "../api/endpoints.js";

const RoleDetails = ({ roleItem, editRole, onDeleted }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (!isOpen || !roleItem?.id) return;
        let cancelled = false;
        (async () => {
            setLoadingUsers(true);
            try {
                const res = await apiJson(endpoints.roles.users(roleItem.id, { page: 1, pageSize: 100 }));
                if (!cancelled) setUsers(res.items || []);
            } catch {
                if (!cancelled) setUsers([]);
            } finally {
                if (!cancelled) setLoadingUsers(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, roleItem?.id, roleItem?.usersCount]);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete the role "${roleItem.name}"?`)) return;
        try {
            await apiJson(endpoints.roles.byId(roleItem.id), { method: "DELETE" });
            onDeleted?.();
        } catch (e) {
            alert(e.message);
        }
    };

    const handleEdit = () => {
        editRole(roleItem);
    };

    return (
        <div>
            <article onClick={toggleOpen}>
                <h2>{roleItem.name} ({roleItem.usersCount} {roleItem.usersCount === 1 ? "user" : "users"})</h2>
                {
                    isOpen ? <span onClick={toggleOpen}>&#9660;</span> : <span onClick={toggleOpen}>&#9654;</span>
                }
            </article>
            {isOpen && (
                <>
                    {loadingUsers ? <p>Loading users…</p> : (
                        <ul>
                            {users.map((u) => (
                                <li key={u.id}>{u.firstName} {u.lastName} ({u.username})</li>
                            ))}
                        </ul>
                    )}

                    <div>
                        <button type="button" onClick={handleEdit}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14.3601 4.07866L15.2869 3.15178C16.8226 1.61607 19.3125 1.61607 20.8482 3.15178C22.3839 4.68748 22.3839 7.17735 20.8482 8.71306L19.9213 9.63993M14.3601 4.07866C14.3601 4.07866 14.4759 6.04828 16.2138 7.78618C17.9517 9.52407 19.9213 9.63993 19.9213 9.63993M14.3601 4.07866L12 6.43872M19.9213 9.63993L14.6607 14.9006L11.5613 18L11.4001 18.1612C10.8229 18.7383 10.5344 19.0269 10.2162 19.2751C9.84082 19.5679 9.43469 19.8189 9.00498 20.0237C8.6407 20.1973 8.25352 20.3263 7.47918 20.5844L4.19792 21.6782M4.19792 21.6782L3.39584 21.9456C3.01478 22.0726 2.59466 21.9734 2.31063 21.6894C2.0266 21.4053 1.92743 20.9852 2.05445 20.6042L2.32181 19.8021M4.19792 21.6782L2.32181 19.8021M2.32181 19.8021L3.41556 16.5208C3.67368 15.7465 3.80273 15.3593 3.97634 14.995C4.18114 14.5653 4.43213 14.1592 4.7249 13.7838C4.97308 13.4656 5.26166 13.1771 5.83882 12.5999L8.5 9.93872" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
                        </button>

                        <button type="button" onClick={handleDelete}>
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M2 6H22" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M10 11V16" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M14 11V16" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default RoleDetails;
