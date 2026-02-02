import { apiFetch } from '../utils/api';

export async function getWorkLogsByProject(projectId) {
    return apiFetch(`/v1/work-logs?projectId=${projectId}`, { method: 'GET' });
}

export async function createWorkLog(payload) {
    return apiFetch('/v1/work-logs', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function deleteWorkLog(id) {
    return apiFetch(`/v1/work-logs/${id}`, { method: 'DELETE' });
}
