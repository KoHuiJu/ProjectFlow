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

import { getProject, updateProject } from '../../api/projectApi';
import { getTasks, createTask, updateTask } from '../../api/taskApi';
import { getTaskRecommendations } from '../../api/aiApi';
import { getGithubCommits } from '../../api/githubApi';

// ----------------------------------------
// Status utils
// ----------------------------------------
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

// ----------------------------------------
// AI utils
// ----------------------------------------
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
    const s = String(d).replace('T', ' ');
    return s.replace('Z', '').slice(0, 16);
}

export default function ProjectDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const projectId = useMemo(() => Number(id), [id]);

    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // GitHub repo url
    const [githubUrl, setGithubUrl] = useState('');
    const [githubSaving, setGithubSaving] = useState(false);

    // GitHub commits
    const [commitsLoading, setCommitsLoading] = useState(false);
    const [commitsError, setCommitsError] = useState('');
    const [commits, setCommits] = useState([]);
    const [importingSha, setImportingSha] = useState(null);

    // create task modal
    const [open, setOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // status update busy map (taskId -> boolean)
    const [updating, setUpdating] = useState({});

    // AI recommendations
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiMap, setAiMap] = useState({}); // taskId -> rec

    // bulk apply result
    const [bulkApplying, setBulkApplying] = useState(false);
    const [bulkResult, setBulkResult] = useState(null); // { success, fail }

    const load = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const p = await getProject(projectId);
            setProject(p);
            setGithubUrl(p?.githubRepoUrl || '');

            const res = await getTasks(projectId);
            const list = Array.isArray(res) ? res : [];
            setTasks(list);
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
            for (const r of list) {
                if (r && r.taskId != null) m[r.taskId] = r;
            }
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
                description: taskDesc.trim(),
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
            setErrorMsg('태스크 상태 변경 실패 (UpdateTaskReq 필드 확인 필요)');
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
            setErrorMsg('AI 추천 적용 실패 (UpdateTaskReq 필드 확인 필요)');
        } finally {
            setUpdating((prev) => ({ ...prev, [taskId]: false }));
        }
    };

    const applyAllAiSuggestions = async () => {
        const recs = Object.values(aiMap || {}).filter(isMeaningfulRecommendation);

        if (recs.length === 0) {
            setBulkResult({ success: 0, fail: 0 });
            return;
        }

        setBulkApplying(true);
        setBulkResult(null);
        setErrorMsg('');

        let success = 0;
        let fail = 0;

        try {
            for (const r of recs) {
                try {
                    await updateTask(r.taskId, { status: r.suggestedStatus });
                    setTasks((prev) => prev.map((t) => (t.id === r.taskId ? { ...t, status: r.suggestedStatus } : t)));
                    success += 1;
                } catch (e) {
                    fail += 1;
                }
            }
        } finally {
            setBulkApplying(false);
            setBulkResult({ success, fail });
            await loadAi();
        }
    };

    // ✅ WorkLog 없으니: 커밋 -> 태스크로 추가
    const importCommitToTask = async (c) => {
        if (!c?.sha) return;

        setImportingSha(c.sha);
        setErrorMsg('');

        try {
            const shortSha = String(c.sha).slice(0, 7);
            const titleLine = (c.message || '').split('\n')[0].trim();
            const title = `[GitHub ${shortSha}] ${titleLine || '(no message)'}`;

            const descLines = [];
            if (c.htmlUrl) descLines.push(c.htmlUrl);
            if (c.authorName) descLines.push(`author: ${c.authorName}`);
            if (c.date) descLines.push(`date: ${formatCommitDate(c.date)}`);

            await createTask({
                projectId,
                title,
                description: descLines.join('\n'),
            });

            await load();
            await loadAi();
        } catch (e) {
            setErrorMsg('커밋을 태스크로 추가 실패');
        } finally {
            setImportingSha(null);
        }
    };

    const grouped = useMemo(() => groupByStatus(tasks), [tasks]);

    const aiSummary = useMemo(() => {
        const recs = Object.values(aiMap || {});
        const meaningful = recs.filter(isMeaningfulRecommendation);

        const byStatus = meaningful.reduce((acc, r) => {
            const key = r.suggestedStatus || 'UNKNOWN';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        return { total: meaningful.length, byStatus };
    }, [aiMap]);

    return (
        <Box>
            {/* Top actions */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                    ← Back
                </Button>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        onClick={async () => {
                            await load();
                            await loadAi();
                            await loadCommits();
                        }}
                    >
                        새로고침
                    </Button>
                    <Button variant="contained" onClick={openCreateTask}>
                        태스크 생성
                    </Button>
                </Stack>
            </Stack>

            {/* Errors */}
            {errorMsg && (
                <Card sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Typography color="error">{errorMsg}</Typography>
                </Card>
            )}

            {/* Project */}
            {loading ? (
                <Typography sx={{ opacity: 0.7 }}>Loading...</Typography>
            ) : (
                <>
                    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="h6">{project?.name || `Project #${projectId}`}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {project?.description || '설명 없음'}
                        </Typography>

                        {project?.startDate && (
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {project.startDate} ~ {project.endDate}
                            </Typography>
                        )}

                        {/* GitHub Repo URL */}
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
                            <Button variant="outlined" disabled={!githubUrl?.trim()} onClick={() => window.open(githubUrl.trim(), '_blank')}>
                                열기
                            </Button>
                        </Stack>
                    </Card>

                    {/* Recent Commits */}
                    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle1">최근 커밋</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    GitHub 공개 API로 가져온 변경 내역이야. “태스크로 추가”하면 보드에 쌓여.
                                </Typography>
                            </Box>

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
                            <Typography sx={{ opacity: 0.7 }}>
                                커밋이 없거나, GitHub Repo URL이 저장되지 않았거나, 형식이 잘못됐을 수 있어.
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {commits.map((c) => {
                                    const shortSha = String(c.sha || '').slice(0, 7);
                                    const title = (c.message || '').split('\n')[0];

                                    return (
                                        <Card key={c.sha} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                            <Stack spacing={0.75}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip size="small" label={shortSha} variant="outlined" />
                                                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                                        {title || '(no message)'}
                                                    </Typography>

                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        onClick={() => importCommitToTask(c)}
                                                        disabled={importingSha === c.sha}
                                                    >
                                                        {importingSha === c.sha ? '추가 중...' : '태스크로 추가'}
                                                    </Button>

                                                    <Button size="small" variant="outlined" disabled={!c.htmlUrl} onClick={() => window.open(c.htmlUrl, '_blank')}>
                                                        보기
                                                    </Button>
                                                </Stack>

                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                    {c.authorName ? `${c.authorName}` : 'unknown'}
                                                    {c.date ? ` · ${formatCommitDate(c.date)}` : ''}
                                                </Typography>
                                            </Stack>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        )}
                    </Card>

                    {/* AI Recommendation Summary */}
                    <Card sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle1">AI 추천</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    {aiLoading ? '추천 분석 중...' : aiSummary.total > 0 ? `추천 ${aiSummary.total}개` : '추천 없음'}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                                <Button variant="outlined" onClick={loadAi} disabled={aiLoading || bulkApplying}>
                                    {aiLoading ? '불러오는 중...' : 'AI 다시 보기'}
                                </Button>

                                <Button
                                    variant="contained"
                                    onClick={applyAllAiSuggestions}
                                    disabled={aiLoading || bulkApplying || aiSummary.total === 0}
                                >
                                    {bulkApplying ? '적용 중...' : '추천 전체 적용'}
                                </Button>
                            </Stack>
                        </Stack>

                        {aiError && (
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                {aiError}
                            </Typography>
                        )}

                        {!aiLoading && aiSummary.total > 0 && (
                            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                                {Object.entries(aiSummary.byStatus).map(([k, v]) => (
                                    <Chip key={k} label={`${k}: ${v}`} variant="outlined" />
                                ))}
                            </Stack>
                        )}

                        {bulkResult && (
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                                적용 결과: 성공 {bulkResult.success} / 실패 {bulkResult.fail}
                            </Typography>
                        )}
                    </Card>

                    {/* Kanban */}
                    <Card sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            태스크 보드
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        {tasks.length === 0 ? (
                            <Typography sx={{ opacity: 0.7 }}>태스크가 없어. 생성해봐.</Typography>
                        ) : (
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ overflowX: 'auto', pb: 1 }}>
                                {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => {
                                    const list = grouped[status] || [];

                                    return (
                                        <Card key={status} variant="outlined" sx={{ p: 2, borderRadius: 2, width: '100%', minWidth: 300 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                <Typography variant="subtitle2">{status}</Typography>
                                                <Chip size="small" label={String(list.length)} variant="outlined" />
                                            </Stack>

                                            <Stack spacing={1}>
                                                {list.length === 0 ? (
                                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                                        없음
                                                    </Typography>
                                                ) : (
                                                    list.map((t) => {
                                                        const s = normalizeStatus(t.status);
                                                        const busy = !!updating[t.id];
                                                        const rec = aiMap[t.id];
                                                        const hasRec = isMeaningfulRecommendation(rec);

                                                        return (
                                                            <Card key={t.id} sx={{ p: 1.5, borderRadius: 2 }}>
                                                                <Stack spacing={0.75}>
                                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                                        <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                                                            {t.title || t.name || `Task #${t.id}`}
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
                                                                            <Stack spacing={0.5}>
                                                                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                                                    AI 추천: <b>{rec.suggestedStatus}</b>
                                                                                    {rec.confidence != null ? ` (${toPercent(rec.confidence)})` : ''}
                                                                                </Typography>

                                                                                {Array.isArray(rec.reasons) && rec.reasons.length > 0 ? (
                                                                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                                                        · {rec.reasons.slice(0, 2).join(' / ')}
                                                                                    </Typography>
                                                                                ) : null}

                                                                                <Stack direction="row" spacing={1}>
                                                                                    <Button
                                                                                        size="small"
                                                                                        variant="contained"
                                                                                        onClick={() => applyAiSuggestion(t)}
                                                                                        disabled={busy || bulkApplying}
                                                                                    >
                                                                                        {busy ? '적용 중...' : '추천 적용'}
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="small"
                                                                                        variant="outlined"
                                                                                        onClick={() => onToggleStatus(t)}
                                                                                        disabled={busy || bulkApplying}
                                                                                    >
                                                                                        다음 상태
                                                                                    </Button>
                                                                                </Stack>
                                                                            </Stack>
                                                                        </Card>
                                                                    ) : (
                                                                        <Stack direction="row" spacing={1}>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                onClick={() => onToggleStatus(t)}
                                                                                disabled={busy || bulkApplying}
                                                                            >
                                                                                {busy ? '변경 중...' : '다음 상태'}
                                                                            </Button>
                                                                        </Stack>
                                                                    )}
                                                                </Stack>
                                                            </Card>
                                                        );
                                                    })
                                                )}
                                            </Stack>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        )}
                    </Card>
                </>
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
        </Box>
    );
}
