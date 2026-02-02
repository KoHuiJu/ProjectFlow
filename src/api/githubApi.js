import { apiFetch } from './api';

export async function getGithubCommits(projectId, limit = 20) {
    return apiFetch(`/api/v1/github/commits?projectId=${projectId}&limit=${limit}`);
}
