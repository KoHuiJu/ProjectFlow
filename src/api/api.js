export const BASE_API = 'http://localhost:9090';

export async function apiFetch(path, options = {}) {
    const url = `${BASE_API}${path}`;

    const accessToken = localStorage.getItem('accessToken');

    const headers = {
        ...(options.headers || {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    console.log('accessToken=', localStorage.getItem('accessToken'));
    console.log('Authorization header=', headers.Authorization);

    const res = await fetch(url, {
        ...options,
        headers,
    });

    // 에러 메시지 최대한 뽑기
    if (!res.ok) {
        let msg = `HTTP_${res.status}`;
        try {
            const text = await res.text();
            if (text) msg = text;
            // eslint-disable-next-line no-unused-vars
        } catch (e) { /* empty */ }
        throw new Error(msg);
    }

    if (res.status === 204) return null;
    return res.json();
}
