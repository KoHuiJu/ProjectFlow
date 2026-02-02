const ACCESS_TOKEN_KEY = 'accessToken';
const TEAM_ID_KEY = 'teamId';

export const tokenStorage = {
    getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },
    setAccessToken(token) {
        if (!token) localStorage.removeItem(ACCESS_TOKEN_KEY);
        else localStorage.setItem(ACCESS_TOKEN_KEY, token);
    },
    clearAccessToken() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    },

    getTeamId() {
        const v = localStorage.getItem(TEAM_ID_KEY);
        return v ? Number(v) : null;
    },
    setTeamId(teamId) {
        if (!teamId) localStorage.removeItem(TEAM_ID_KEY);
        else localStorage.setItem(TEAM_ID_KEY, String(teamId));
    },
    clearTeamId() {
        localStorage.removeItem(TEAM_ID_KEY);
    },
};
