import { createContext, useCallback, useMemo, useState } from 'react';
import { tokenStorage } from './tokenStorage.js';

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
    const [accessToken, setAccessTokenState] = useState(tokenStorage.getAccessToken());
    const [me, setMe] = useState(null); // { userId, email, role? } - login response 기반
    const [teamId, setTeamIdState] = useState(tokenStorage.getTeamId()); // number | null

    const setAccessToken = useCallback((token) => {
        tokenStorage.setAccessToken(token);
        setAccessTokenState(token);
    }, []);

    const setTeamId = useCallback((id) => {
        tokenStorage.setTeamId(id);
        setTeamIdState(id);
    }, []);

    const logout = useCallback(() => {
        tokenStorage.clearAccessToken();
        tokenStorage.clearTeamId();
        setAccessTokenState(null);
        setTeamIdState(null);
        setMe(null);
    }, []);

    const value = useMemo(() => ({
        accessToken,
        setAccessToken,
        me,
        setMe,
        teamId,
        setTeamId,
        logout,
        isAuthed: !!accessToken,
    }), [accessToken, setAccessToken, me, teamId, setTeamId, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
