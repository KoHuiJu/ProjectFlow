import { apiFetch } from './api.js';


export function getProject(id) {
    return apiFetch(`/api/v1/projects/${id}`);
}

// -----------------------
// 프로젝트 목록 조회
// GET /api/v1/projects?teamId=
// -----------------------
export async function getProjects(teamId) {
    return apiFetch(`/api/v1/projects?teamId=${teamId}`, {
        method: 'GET',
    });
}

// -----------------------
// 프로젝트 생성
// POST /api/v1/projects
// -----------------------
export async function createProject(body) {
    return apiFetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export function updateProject(id, payload) {
    // payload: { githubRepoUrl }
    return apiFetch(`/api/v1/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}
