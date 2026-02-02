import { apiFetch } from './api';

export async function getTaskRecommendations(projectId) {
    // GET /api/v1/ai/task-recommendations?projectId=3
    return apiFetch(`/api/v1/ai/task-recommendations?projectId=${projectId}`);
}
