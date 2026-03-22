const API_PREFIX = 'http://localhost:5000';

function buildQuery(params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        q.set(key, String(value));
    });
    const s = q.toString();
    return s ? `?${s}` : '';
}

export const endpoints = {
    auth: {
        login: () => `${API_PREFIX}/api/auth/login`,
    },
    users: {
        list: (params = {}) => `${API_PREFIX}/api/users${buildQuery(params)}`,
        byId: (id) => `${API_PREFIX}/api/users/${encodeURIComponent(id)}`,
    },
    roles: {
        list: (params = {}) => `${API_PREFIX}/api/roles${buildQuery(params)}`,
        byId: (id) => `${API_PREFIX}/api/roles/${encodeURIComponent(id)}`,
        users: (id, params = {}) => `${API_PREFIX}/api/roles/${encodeURIComponent(id)}/users${buildQuery(params)}`,
    },
    teams: {
        list: (params = {}) => `${API_PREFIX}/api/teams${buildQuery(params)}`,
        byId: (id) => `${API_PREFIX}/api/teams/${encodeURIComponent(id)}`,
        members: (teamId) => `${API_PREFIX}/api/teams/${encodeURIComponent(teamId)}/members`,
        member: (teamId, userId) =>
            `${API_PREFIX}/api/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    },
    projects: {
        list: (params = {}) => `${API_PREFIX}/api/projects${buildQuery(params)}`,
        byId: (id) => `${API_PREFIX}/api/projects/${encodeURIComponent(id)}`,
        teams: (projectId) => `${API_PREFIX}/api/projects/${encodeURIComponent(projectId)}/teams`,
        team: (projectId, teamId) =>
            `${API_PREFIX}/api/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}`,
    },
    leaveRequests: {
        list: (params = {}) => `${API_PREFIX}/api/leaveRequests${buildQuery(params)}`,
        byId: (id) => `${API_PREFIX}/api/leaveRequests/${encodeURIComponent(id)}`,
        review: (id) => `${API_PREFIX}/api/leaveRequests/${encodeURIComponent(id)}/review`,
        sickNote: (id) => `${API_PREFIX}/api/leaveRequests/${encodeURIComponent(id)}/sick-note`,
    },
};
