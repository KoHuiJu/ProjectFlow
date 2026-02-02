import { apiFetch } from './api';

export async function getMyTeams() {
    // GET /api/v1/teams/me
    return apiFetch('/api/v1/teams/me');
}

export async function createTeam(payload) {
    // POST /api/v1/teams
    return apiFetch('/api/v1/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getTeamMembers(teamId) {
    // GET /api/v1/teams/{teamId}/members
    return apiFetch(`/api/v1/teams/${teamId}/members`);
}

export async function addTeamMember(teamId, payload) {
    // POST /api/v1/teams/{teamId}/members
    return apiFetch(`/api/v1/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
