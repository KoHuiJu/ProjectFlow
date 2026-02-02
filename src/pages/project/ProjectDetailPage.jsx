// src/pages/project/ProjectDetailPage.js
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Card,
    Typography,
    Stack,
    Button,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
} from '@mui/material';

import AppLayout from '../../components/common/AppLayout.jsx';

import { getProject, updateProject } from '../../api/projectApi';
import { getTasks, createTask, updateTask, aiEvaluateTask } from '../../api/taskApi';
import { getTaskRecommendations } from '../../api/aiApi';
import { getGithubCommits } from '../../api/githubApi';

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'DONE'];
function normalizeStatus(s) {
    return STATUS_ORDER.includes(s) ? s : 'TODO';
}
function nextStatus(current) {
    const cur = normalizeStatus(current);
    const idx = STATUS_ORDER.indexOf(cur);
    return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}
function statusChipColor(status) {
    const s = normalizeStatus(status);
    if (s === 'IN_PROGRESS') return 'primary';
    if (s === 'DONE') return 'success';
    return 'default';
}
function groupByStatus(tasks = []) {
    return {
        TODO: tasks.filter((t) => normalizeStatus(t.status) === 'TODO'),
        IN_PROGRESS: tasks.filter((t) => normalizeStatus(t.status) === 'IN_PROGRESS'),
        DONE: tasks.filter((t) => normalizeStatus(t.status) === 'DONE'),
    };
}
function toPercent(conf) {
    const v = Number(conf);
    if (Number.isNaN(v)) return '';
    return `${Math.round(v * 100)}%`;
}
function isMeaningfulRecommendation(rec) {
    if (!rec) return false;
    if (!rec.suggestedStatus) return false;
    return rec.suggestedStatus !== rec.currentStatus;
}
function formatCommitDate(d) {
    if (!d) return '';
    return String(d).replace('T', ' ').replace('Z', '').slice(0, 16);
}

export default function ProjectDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const projectId = useMemo(() => Number(id), [id]);

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // GitHub
    const [githubUrl, setGithubUrl] = useState('');
    const [githubSaving, setGithubSaving] = useState(false);
    const [commitsLoading, setCommitsLoading] = useState(false);
    const [commitsError, setCommitsError] = useState('');
    const [commits, setCommits] = useState([]);

    // create task modal
    const [open, setOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // status update busy map
    const [updating, setUpdating] = useState({});

    // AI 추천 (기존)
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiMap, setAiMap] = useState({}); // taskId -> rec

    // ==========================
    // ✅ AI 진행도 (신규 /ai-evaluate)
    // ==========================
    const [aiEvalOpen, setAiEvalOpen] = useState(false);
    const [aiEvalTask, setAiEvalTask] = useState(null);
    const [aiEvalLoading, setAiEvalLoading] = useState(false);
    const [aiEvalError, setAiEvalError] = useState('');
    const [aiEvalRes, setAiEvalRes] = useState(null);

    const load = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const p = await getProject(projectId);
            setProject(p);
            setGithubUrl(p?.githubRepoUrl || '');

            const res = await getTasks(projectId);
            setTasks(Array.isArray(res) ? res : []);
        } catch (e) {
            setErrorMsg('프로젝트/태스크 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const loadAi = async () => {
        setAiLoading(true);
        setAiError('');
        try {
            const res = await getTaskRecommendations(projectId);
            const list = Array.isArray(res) ? res : [];
            const m = {};
            for (const r of list) if (r && r.taskId != null) m[r.taskId] = r;
            setAiMap(m);
        } catch (e) {
            setAiMap({});
            setAiError('AI 추천을 불러오지 못했어.');
        } finally {
            setAiLoading(false);
        }
    };

    const loadCommits = async () => {
        setCommitsLoading(true);
        setCommitsError('');
        try {
            const res = await getGithubCommits(projectId, 20);
            setCommits(Array.isArray(res) ? res : []);
        } catch (e) {
            setCommits([]);
            setCommitsError('커밋을 불러오지 못했어. (Repo URL 저장/형식/서버 로그 확인)');
        } finally {
            setCommitsLoading(false);
        }
    };

    useEffect(() => {
        if (!projectId) return;
        load().then(() => {
            loadAi();
            loadCommits();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const onSaveGithubUrl = async () => {
        setGithubSaving(true);
        setErrorMsg('');
        try {
            const payload = { githubRepoUrl: githubUrl?.trim() || null };
            const updated = await updateProject(projectId, payload);
            setProject(updated);
            setGithubUrl(updated?.githubRepoUrl || '');
            await loadCommits();
        } catch (e) {
            setErrorMsg('GitHub 주소 저장 실패 (PATCH /api/v1/projects/{id} 확인)');
        } finally {
            setGithubSaving(false);
        }
    };

    const openCreateTask = () => {
        setTaskTitle('');
        setTaskDesc('');
        setErrorMsg('');
        setOpen(true);
    };

    const onCreateTask = async () => {
        if (!taskTitle.trim()) {
            setErrorMsg('태스크 제목은 필수야.');
            return;
        }
        setSaving(true);
        setErrorMsg('');
        try {
            await createTask({
                projectId,
                title: taskTitle.trim(),
                description: taskDesc.trim() || null,
            });
            setOpen(false);
            await load();
            await loadAi();
        } catch (e) {
            setErrorMsg('태스크 생성 실패');
        } finally {
            setSaving(false);
        }
    };

    const onToggleStatus = async (task) => {
        const taskId = task?.id;
        if (!taskId) return;
        const newStatus = nextStatus(task.status);

        setUpdating((prev) => ({ ...prev, [taskId]: true }));
        setErrorMsg('');
        try {
            await updateTask(taskId, { status: newStatus });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
            await loadAi();
        } catch (e) {
            setErrorMsg('태스크 상태 변경 실패');
        } finally {
            setUpdating((prev) => ({ ...prev, [taskId]: false }));
        }
    };

    const applyAiSuggestion = async (task) => {
        const taskId = task?.id;
        if (!taskId) return;

        const rec = aiMap[taskId];
        if (!isMeaningfulRecommendation(rec)) return;

        const newStatus = rec.suggestedStatus;

        setUpdating((prev) => ({ ...prev, [taskId]: true }));
        setErrorMsg('');
        try {
            await updateTask(taskId, { status: newStatus });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
            await loadAi();
        } catch (e) {
            setErrorMsg('AI 추천 적용 실패');
        } finally {
            setUpdating((prev) => ({ ...prev, [taskId]: false }));
        }
    };

    // ==========================
    // ✅ AI 진행도(태스크별) 핸들러
    // ==========================
    const openAiEval = async (task) => {
        if (!task?.id) return;

        setAiEvalTask(task);
        setAiEvalRes(null);
        setAiEvalError('');
        setAiEvalOpen(true);

        await runAiEval(task.id);
    };

    const runAiEval = async (taskIdOverride) => {
        const tid = taskIdOverride ?? aiEvalTask?.id;
        if (!tid) return;

        setAiEvalLoading(true);
        setAiEvalError('');

        try {
            const res = await aiEvaluateTask(tid, 20);
            setAiEvalRes(res);
        } catch (e) {
            setAiEvalRes(null);
            setAiEvalError(String(e?.message || e));
        } finally {
            setAiEvalLoading(false);
        }
    };

    const closeAiEval = () => {
        setAiEvalOpen(false);
        setAiEvalTask(null);
        setAiEvalRes(null);
        setAiEvalError('');
        setAiEvalLoading(false);
    };

    const grouped = useMemo(() => groupByStatus(tasks), [tasks]);

    return (
        <AppLayout
            title={project?.name || `Project #${projectId}`}
            right={
                <Button variant="outlined" onClick={() => navigate(-1)}>
                    ← Back
                </Button>
            }
        >
            {errorMsg && (
                <Card sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Typography color="error">{errorMsg}</Typography>
                </Card>
            )}

            {loading ? (
                <Typography sx={{ opacity: 0.7 }}>Loading...</Typography>
            ) : (
                <Box>
                    {/* Project */}
                    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {project?.description || '설명 없음'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            GitHub Repo
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                fullWidth
                                size="small"
                                placeholder="예) https://github.com/KoHuiJu/ProjectFlow"
                            />
                            <Button variant="contained" onClick={onSaveGithubUrl} disabled={githubSaving}>
                                {githubSaving ? '저장 중...' : '저장'}
                            </Button>
                            <Button
                                variant="outlined"
                                disabled={!githubUrl?.trim()}
                                onClick={() => window.open(githubUrl.trim(), '_blank')}
                            >
                                열기
                            </Button>
                        </Stack>
                    </Card>

                    {/* Commits */}
                    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">최근 커밋</Typography>
                            <Button variant="outlined" onClick={loadCommits} disabled={commitsLoading}>
                                {commitsLoading ? '불러오는 중...' : '커밋 새로고침'}
                            </Button>
                        </Stack>

                        {commitsError && (
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                {commitsError}
                            </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        {commitsLoading ? (
                            <Typography sx={{ opacity: 0.7 }}>Loading commits...</Typography>
                        ) : commits.length === 0 ? (
                            <Typography sx={{ opacity: 0.7 }}>커밋이 없거나 Repo URL이 비었을 수 있어.</Typography>
                        ) : (
                            <Stack spacing={1}>
                                {commits.map((c) => {
                                    const shortSha = String(c.sha || '').slice(0, 7);
                                    const title = (c.message || '').split('\n')[0];

                                    return (
                                        <Card key={c.sha} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip size="small" label={shortSha} variant="outlined" />
                                                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                                    {title || '(no message)'}
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={!c.htmlUrl}
                                                    onClick={() => window.open(c.htmlUrl, '_blank')}
                                                >
                                                    보기
                                                </Button>
                                            </Stack>

                                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                {c.authorName || 'unknown'}
                                                {c.date ? ` · ${formatCommitDate(c.date)}` : ''}
                                            </Typography>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        )}
                    </Card>

                    {/* Tasks */}
                    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">태스크</Typography>
                            <Stack direction="row" spacing={1}>
                                <Button variant="outlined" onClick={load}>
                                    새로고침
                                </Button>
                                <Button variant="contained" onClick={openCreateTask}>
                                    태스크 생성
                                </Button>
                            </Stack>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        {/* Kanban */}
                        {tasks.length === 0 ? (
                            <Typography sx={{ opacity: 0.7 }}>태스크가 없어. 생성해봐.</Typography>
                        ) : (
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ overflowX: 'auto', pb: 1 }}>
                                {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => {
                                    const list = grouped[status] || [];
                                    return (
                                        <Card
                                            key={status}
                                            variant="outlined"
                                            sx={{ p: 2, borderRadius: 2, width: '100%', minWidth: 300 }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                <Typography variant="subtitle2">{status}</Typography>
                                                <Chip size="small" label={String(list.length)} variant="outlined" />
                                            </Stack>

                                            <Stack spacing={1}>
                                                {list.map((t) => {
                                                    const s = normalizeStatus(t.status);
                                                    const busy = !!updating[t.id];
                                                    const rec = aiMap[t.id];
                                                    const hasRec = isMeaningfulRecommendation(rec);

                                                    return (
                                                        <Card key={t.id} sx={{ p: 1.5, borderRadius: 2 }}>
                                                            <Stack spacing={0.75}>
                                                                <Stack direction="row" spacing={1} alignItems="center">
                                                                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                                                        {t.title || `Task #${t.id}`}
                                                                    </Typography>
                                                                    <Chip
                                                                        size="small"
                                                                        label={s}
                                                                        color={statusChipColor(s)}
                                                                        variant={s === 'TODO' ? 'outlined' : 'filled'}
                                                                    />
                                                                </Stack>

                                                                {t.description ? (
                                                                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                                                        {t.description}
                                                                    </Typography>
                                                                ) : null}

                                                                {hasRec ? (
                                                                    <Card variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                                                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                                            AI 추천: <b>{rec.suggestedStatus}</b>
                                                                            {rec.confidence != null ? ` (${toPercent(rec.confidence)})` : ''}
                                                                        </Typography>

                                                                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                                                            <Button
                                                                                size="small"
                                                                                variant="contained"
                                                                                onClick={() => applyAiSuggestion(t)}
                                                                                disabled={busy}
                                                                            >
                                                                                {busy ? '적용 중...' : '추천 적용'}
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                onClick={() => onToggleStatus(t)}
                                                                                disabled={busy}
                                                                            >
                                                                                다음 상태
                                                                            </Button>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                onClick={() => openAiEval(t)}
                                                                                disabled={busy}
                                                                            >
                                                                                AI 진행도
                                                                            </Button>
                                                                        </Stack>
                                                                    </Card>
                                                                ) : (
                                                                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            onClick={() => onToggleStatus(t)}
                                                                            disabled={busy}
                                                                        >
                                                                            {busy ? '변경 중...' : '다음 상태'}
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            onClick={() => openAiEval(t)}
                                                                            disabled={busy}
                                                                        >
                                                                            AI 진행도
                                                                        </Button>
                                                                    </Stack>
                                                                )}
                                                            </Stack>
                                                        </Card>
                                                    );
                                                })}
                                            </Stack>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        )}
                    </Card>

                    {/* AI (기존) */}
                    <Card sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">AI 추천</Typography>
                            <Button variant="outlined" onClick={loadAi} disabled={aiLoading}>
                                {aiLoading ? '불러오는 중...' : 'AI 다시 보기'}
                            </Button>
                        </Stack>
                        {aiError && (
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                {aiError}
                            </Typography>
                        )}
                    </Card>
                </Box>
            )}

            {/* Create Task Modal */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>태스크 생성</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="제목 *" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} fullWidth />
                        <TextField
                            label="설명"
                            value={taskDesc}
                            onChange={(e) => setTaskDesc(e.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>취소</Button>
                    <Button variant="contained" onClick={onCreateTask} disabled={saving}>
                        {saving ? '생성 중...' : '생성'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ==========================
          ✅ AI 진행도 Modal
         ========================== */}
            <Dialog open={aiEvalOpen} onClose={closeAiEval} fullWidth maxWidth="md">
                <DialogTitle>
                    AI 진행도 · {aiEvalTask?.title ? aiEvalTask.title : 'Task'}
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                        커밋 메시지에 <b>#{aiEvalTask?.id}</b> 태그가 포함된 커밋을 기준으로 평가합니다.
                    </Typography>

                    {aiEvalError && (
                        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                            {aiEvalError}
                        </Typography>
                    )}

                    {aiEvalLoading ? (
                        <Typography sx={{ opacity: 0.7 }}>AI 평가 중...</Typography>
                    ) : !aiEvalRes ? (
                        <Typography sx={{ opacity: 0.7 }}>아직 결과가 없어. “다시 평가”를 눌러봐.</Typography>
                    ) : (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {/* 요약 */}
                            <Card variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        size="small"
                                        label={`AI: ${aiEvalRes.aiStatus || aiEvalRes.status || 'IN_PROGRESS'}`}
                                        color={
                                            (aiEvalRes.aiStatus || aiEvalRes.status) === 'DONE'
                                                ? 'success'
                                                : (aiEvalRes.aiStatus || aiEvalRes.status) === 'TODO'
                                                    ? 'default'
                                                    : 'warning'
                                        }
                                        variant="filled"
                                    />
                                    {typeof aiEvalRes.progress === 'number' && (
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={`Progress: ${Math.round(aiEvalRes.progress * 100)}%`}
                                        />
                                    )}
                                </Stack>

                                {aiEvalRes.summary && (
                                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{aiEvalRes.summary}</Typography>
                                )}
                            </Card>

                            {/* 체크리스트 */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    체크리스트
                                </Typography>

                                {Array.isArray(aiEvalRes.checklist) && aiEvalRes.checklist.length > 0 ? (
                                    <Stack spacing={1}>
                                        {aiEvalRes.checklist.map((c, idx) => (
                                            <Card key={idx} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                                                <Stack spacing={0.75}>
                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                                        <Chip
                                                            size="small"
                                                            label={c.state || 'UNKNOWN'}
                                                            variant="filled"
                                                            color={c.state === 'DONE' ? 'success' : c.state === 'PARTIAL' ? 'warning' : 'default'}
                                                        />
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {c.item || '(no item)'}
                                                        </Typography>
                                                    </Stack>

                                                    {Array.isArray(c.evidence) && c.evidence.length > 0 && (
                                                        <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'pre-wrap' }}>
                                                            근거: {c.evidence.join(', ')}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Card>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography sx={{ opacity: 0.7 }}>체크리스트 결과가 없습니다.</Typography>
                                )}
                            </Box>

                            {/* Next steps */}
                            {Array.isArray(aiEvalRes.nextSteps) && aiEvalRes.nextSteps.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        다음 추천 액션
                                    </Typography>
                                    <Stack spacing={0.5}>
                                        {aiEvalRes.nextSteps.map((s, i) => (
                                            <Typography key={i} variant="body2" sx={{ opacity: 0.9 }}>
                                                • {s}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {/* Evidence */}
                            {Array.isArray(aiEvalRes.evidence) && aiEvalRes.evidence.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        핵심 근거
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'pre-wrap' }}>
                                        {aiEvalRes.evidence.join('\n')}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={closeAiEval}>닫기</Button>
                    <Button variant="outlined" onClick={() => runAiEval()} disabled={aiEvalLoading}>
                        {aiEvalLoading ? '평가 중...' : '다시 평가'}
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}
