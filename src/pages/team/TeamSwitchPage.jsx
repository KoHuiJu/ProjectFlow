import { useEffect, useState } from 'react';
import { Button, Card, Stack, Typography } from '@mui/material';
import AppLayout from '../../components/common/AppLayout.jsx';
import { getMyTeams, createTeam } from '../../api/teamApi';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';

export default function TeamSwitchPage() {
    const navigate = useNavigate();
    const { setTeamId } = useAuth();

    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await getMyTeams();
            setTeams(Array.isArray(res) ? res : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const onSelect = (id) => {
        setTeamId(id);
        navigate('/dashboard');
    };

    const onCreate = async () => {
        // 기본값 자동생성은 싫어했으니까, 일단 최소로 “New Team”만 (원하면 모달로 바꾸자)
        const name = prompt('팀 이름');
        if (!name) return;
        await createTeam({ name });
        await load();
    };

    return (
        <AppLayout title="내 팀 선택" right={<Button onClick={onCreate} variant="contained">팀 생성</Button>}>
            {loading ? (
                <Typography sx={{ opacity: 0.7 }}>Loading...</Typography>
            ) : teams.length === 0 ? (
                <Typography sx={{ opacity: 0.7 }}>팀이 없어. 팀 생성부터 하자.</Typography>
            ) : (
                <Stack spacing={1}>
                    {teams.map((t) => (
                        <Card key={t.teamId || t.id} sx={{ p: 2, borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography>{t.name || `Team #${t.teamId || t.id}`}</Typography>
                                <Button variant="outlined" onClick={() => onSelect(t.teamId || t.id)}>선택</Button>
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            )}
        </AppLayout>
    );
}
