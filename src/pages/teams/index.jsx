import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Stack, Typography, Button } from '@mui/material';

import { getMyTeams } from '../../api/teamApi';

export default function TeamsPage() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const run = async () => {
            try {
                const res = await getMyTeams();
                const list = Array.isArray(res) ? res : [];
                setTeams(list);

                // 팀 1개면 자동 선택
                if (list.length === 1) {
                    const t = list[0];
                    localStorage.setItem('selectedTeamId', String(t.teamId));
                    localStorage.setItem('selectedTeamName', t.teamName || '');
                    localStorage.setItem('selectedTeamRole', t.role || '');
                    navigate('/', { replace: true });
                }
            } catch (e) {
                setErrorMsg('팀 목록 조회 실패. (토큰 만료/권한/서버 확인)');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [navigate]);

    const selectTeam = (t) => {
        localStorage.setItem('selectedTeamId', String(t.teamId));
        localStorage.setItem('selectedTeamName', t.teamName || '');
        localStorage.setItem('selectedTeamRole', t.role || '');
        navigate('/', { replace: true });
    };

    if (loading) return <Typography sx={{ p: 2 }}>Loading...</Typography>;

    if (errorMsg) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography color="error">{errorMsg}</Typography>
                <Button
                    sx={{ mt: 2 }}
                    variant="contained"
                    onClick={() => {
                        localStorage.clear();
                        navigate('/login', { replace: true });
                    }}
                >
                    로그인으로
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
                내 팀 선택
            </Typography>

            <Stack spacing={2}>
                {teams.map((t) => (
                    <Card key={t.teamId} sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle1">{t.teamName}</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    role: {t.role}
                                </Typography>
                            </Box>
                            <Button variant="contained" onClick={() => selectTeam(t)}>
                                선택
                            </Button>
                        </Stack>
                    </Card>
                ))}

                {teams.length === 0 && (
                    <Card sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            소속된 팀이 없어. 다음 단계에서 팀 생성 UI 붙이자.
                        </Typography>
                    </Card>
                )}
            </Stack>
        </Box>
    );
}
