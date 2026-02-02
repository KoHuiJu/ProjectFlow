import { apiFetch } from './api';


// -----------------------
// 태스크 목록
// GET /api/v1/tasks?projectId=
// -----------------------
export async function getTasks(projectId) {
    return apiFetch(`/api/v1/tasks?projectId=${projectId}`, {
        method: 'GET',
    });
}

// -----------------------
// 태스크 생성
// POST /api/v1/tasks
// body: { projectId, title, description?, dueDate? }
// -----------------------
export async function createTask(body) {
    return apiFetch('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

// -----------------------
// 태스크 수정
// PATCH /api/v1/tasks/{id}
// body: { title?, description?, status?, dueDate?, progress?, assigneeUserId? }
// -----------------------
export async function updateTask(id, body) {
    return apiFetch(`/api/v1/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

// -----------------------
// ✅ AI 평가
// POST /api/v1/tasks/{id}/ai-evaluate?limit=20
// -----------------------
export async function aiEvaluateTask(id, limit = 20) {
    return apiFetch(`/api/v1/tasks/${id}/ai-evaluate?limit=${limit}`, {
        method: 'POST',
    });
}
