import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Grid,
    Stack,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';

import AppLayout from '../../components/common/AppLayout.jsx';
import ProjectCard from '../../components/dashboard/ProjectCard.jsx';

import { getProjects, createProject } from '../../api/projectApi.js';
import { tokenStorage } from '../../auth/tokenStorage.js';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // -----------------------
    // 프로젝트 생성 Dialog 상태
    // -----------------------
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        githubRepoUrl: '',
    });

    // -----------------------
    // 프로젝트 목록 로딩
    // -----------------------
    const load = async () => {
        setLoading(true);
        setErrorMsg('');

        try {
            const teamId = tokenStorage.getTeamId();
            if (!teamId) {
                setProjects([]);
                setErrorMsg('팀이 선택되지 않았어. 팀을 먼저 선택해줘.');
                return;
            }

            const res = await getProjects(teamId);
            setProjects(Array.isArray(res) ? res : []);
        } catch (e) {
            setProjects([]);
            setErrorMsg(`프로젝트 로딩 실패: ${String(e?.message || e)}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -----------------------
    // 프로젝트 생성
    // -----------------------
    const onOpenCreate = () => {
        setErrorMsg('');

        const teamId = tokenStorage.getTeamId();
        if (!teamId) {
            setErrorMsg('팀이 선택되지 않았어. 팀을 먼저 선택해줘.');
            return;
        }

        // 기본값 안 넣음
        setForm({
            name: '',
            description: '',
            startDate: '',
            endDate: '',
            githubRepoUrl: '',
        });

        setCreateOpen(true);
    };

    const onSubmitCreate = async () => {
        const teamId = tokenStorage.getTeamId();
        if (!teamId) return;

        const name = form.name.trim();
        if (!name) return;

        if (form.startDate && form.endDate && form.startDate > form.endDate) {
            setErrorMsg('시작일은 종료일보다 늦을 수 없어.');
            return;
        }

        const payload = {
            teamId,
            name,
            ...(form.description && { description: form.description }),
            ...(form.startDate && { startDate: form.startDate }),
            ...(form.endDate && { endDate: form.endDate }),
            ...(form.githubRepoUrl && { githubRepoUrl: form.githubRepoUrl }),
        };

        try {
            await createProject(payload);
            setCreateOpen(false);
            await load();
        } catch (e) {
            setErrorMsg(`프로젝트 생성 실패: ${String(e?.message || e)}`);
        }
    };

    const count = useMemo(() => projects.length, [projects]);

    return (
        <AppLayout
            title="Dashboard"
            right={
                <Button variant="contained" onClick={onOpenCreate}>
                    프로젝트 생성
                </Button>
            }
        >
            {errorMsg && (
                <Stack sx={{ mb: 2 }}>
                    <Typography color="error">{errorMsg}</Typography>
                </Stack>
            )}

            <Stack sx={{ mb: 2 }}>
                <Typography sx={{ opacity: 0.7 }}>프로젝트 {count}개</Typography>
            </Stack>

            {loading ? (
                <Typography sx={{ opacity: 0.7 }}>Loading...</Typography>
            ) : (
                <Grid container spacing={2}>
                    {projects.map((p) => (
                        <Grid item xs={12} md={6} lg={4} key={p.id}>
                            <ProjectCard project={p} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* ======================
          프로젝트 생성 Dialog
         ====================== */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>프로젝트 생성</DialogTitle>

                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="프로젝트 이름 *"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            autoFocus
                            fullWidth
                        />

                        <TextField
                            label="설명"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            multiline
                            rows={3}
                            fullWidth
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="시작일"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                fullWidth
                            />
                            <TextField
                                label="종료일"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                fullWidth
                            />
                        </Stack>

                        <TextField
                            label="GitHub Repository URL"
                            placeholder="https://github.com/owner/repo"
                            value={form.githubRepoUrl}
                            onChange={(e) => setForm({ ...form, githubRepoUrl: e.target.value })}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" onClick={() => setCreateOpen(false)}>
                        취소
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onSubmitCreate}
                        disabled={!form.name.trim()}
                    >
                        생성
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}
