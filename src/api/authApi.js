import { apiFetch } from './api';

export async function login(payload) {
    // POST /api/v1/auth/login
    return apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
