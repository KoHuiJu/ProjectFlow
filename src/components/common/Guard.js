import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function Guard({ children, requireTeam = true }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthed, teamId } = useAuth();

    useEffect(() => {
        if (!isAuthed) {
            if (location.pathname !== '/login') navigate('/login');
            return;
        }
        if (requireTeam && !teamId) {
            if (location.pathname !== '/teams') navigate('/teams');
        }
    }, [isAuthed, teamId, requireTeam, navigate, location.pathname]);

    return children;
}
