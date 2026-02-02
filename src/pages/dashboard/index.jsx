import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    Box,
    Card,
    Typography,
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Divider,
} from '@mui/material';

import { getProjects, createProject } from '../../api/projectApi';

export default function DashboardPage() {
    const navigate = useNavigate();

    const teamIdStr = localStorage.getItem('selectedTeamId');
    const teamName = localStorage.getItem('selectedTeamName') || '';

    const teamId = useMemo(() => (teamIdStr ? Number(teamIdStr) : null), [teamIdStr]);

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // create modal
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const load = async () => {
        if (!teamId) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await getProjects(teamId);
            setProjects(Array.isArray(res) ? res : []);
        } catch (e) {
            setErrorMsg('프로젝트 목록 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!teamId) {
            navigate('/teams', { replace: true });
            return;
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamId]);

    const openCreate = () => {
        // 너는 기본값 싫어하니까 날짜는 비워둠
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setOpen(true);
    };

    const onCreate = async () => {
        if (!teamId) return;

        // 최소 검증
        if (!name.trim()) {
            setErrorMsg('프로젝트명은 필수야.');
            return;
        }
        if (!startDate || !endDate) {
            setErrorMsg('시작일/종료일을 입력해줘.');
            return;
        }

        setSaving(true);
        setErrorMsg('');
        try {
            await createProject({
                teamId,
                name: name.trim(),
                description: description.trim(),
                startDate,
                endDate,
            });
            setOpen(false);
            await load();
        } catch (e) {
            setErrorMsg('프로젝트 생성 실패');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5">Dashboard</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        팀: {teamName} ({teamIdStr})
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => navigate('/teams')}>
                        팀 변경
                    </Button>
                    <Button variant="contained" onClick={openCreate}>
                        프로젝트 생성
                    </Button>
                </Stack>
            </Stack>

            {errorMsg && (
                <Card sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Typography color="error">{errorMsg}</Typography>
                </Card>
            )}

            <Card sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    프로젝트 목록
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {loading ? (
                    <Typography sx={{ opacity: 0.7 }}>Loading...</Typography>
                ) : projects.length === 0 ? (
                    <Typography sx={{ opacity: 0.7 }}>프로젝트가 없어. 위에서 생성해봐.</Typography>
                ) : (
                    <Stack spacing={1}>
                        {projects.map((p) => (
                            <Card
                             key={p.id}
                             variant="outlined"
                             sx={{ p: 2, borderRadius: 2, cursor: 'pointer' }}
                             onClick={() => navigate(`/projects/${p.id}`)}
                            >
                                <Stack spacing={0.5}>
                                    <Typography variant="subtitle1">{p.name}</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                        {p.description || '설명 없음'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        {p.startDate} ~ {p.endDate}
                                    </Typography>
                                </Stack>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Card>

            {/* Create Project Modal */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>프로젝트 생성</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="프로젝트명 *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="설명"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="시작일 *"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="종료일 *"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                fullWidth
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>취소</Button>
                    <Button variant="contained" onClick={onCreate} disabled={saving}>
                        {saving ? '생성 중...' : '생성'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
