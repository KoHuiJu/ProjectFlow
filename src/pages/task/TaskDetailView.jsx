import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    Stack,
    Typography,
    Button,
    Divider,
    Chip,
    LinearProgress,
    CircularProgress,
} from '@mui/material';

import { aiEvaluateTask } from '../../api/taskApi';

// 상태 표시용
function stateChipColor(state) {
    if (state === 'DONE') return 'success';
    if (state === 'PARTIAL') return 'warning';
    if (state === 'NOT_FOUND') return 'default';
    return 'default';
}

export default function TaskDetailView({ task }) {
    const taskId = task?.id;

    const [loading, setLoading] = useState(false);
    const [ai, setAi] = useState(null);
    const [error, setError] = useState('');

    const progressPct = useMemo(() => {
        const p = ai?.progress;
        if (typeof p !== 'number') return null;
        const v = Math.round(p * 100);
        if (v < 0) return 0;
        if (v > 100) return 100;
        return v;
    }, [ai]);

    const runEvaluate = async () => {
        if (!taskId) return;

        setLoading(true);
        setError('');

        try {
            const res = await aiEvaluateTask(taskId, 20);
            setAi(res);
        } catch (e) {
            setAi(null);
            setError(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    };

    // 필요하면 열릴 때 자동 평가하고 싶으면 주석 해제
    // useEffect(() => {
    //   if (taskId) runEvaluate();
    //   // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [taskId]);

    if (!task) {
        return (
            <Card sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ opacity: 0.7 }}>태스크를 선택해 주세요.</Typography>
            </Card>
        );
    }

    return (
        <Stack spacing={2}>
            {/* 기본 태스크 정보 */}
            <Card sx={{ p: 2, borderRadius: 3 }}>
                <Stack spacing={1}>
                    <Typography variant="h6">{task.title}</Typography>
                    {task.description && (
                        <Typography sx={{ whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                            {task.description}
                        </Typography>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`Status: ${task.status || 'UNKNOWN'}`} variant="outlined" />
                        {typeof task.progress === 'number' && (
                            <Chip size="small" label={`Manual progress: ${task.progress}%`} variant="outlined" />
                        )}
                        {task.dueDate && <Chip size="small" label={`Due: ${task.dueDate}`} variant="outlined" />}
                    </Stack>
                </Stack>
            </Card>

            {/* AI 진행도 카드 */}
            <Card sx={{ p: 2, borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">AI 진행도</Typography>

                    <Button
                        variant="contained"
                        onClick={runEvaluate}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} /> : null}
                    >
                        {loading ? '평가 중' : 'AI 평가'}
                    </Button>
                </Stack>

                {error && (
                    <Typography color="error" sx={{ mt: 1 }}>
                        {error}
                    </Typography>
                )}

                {!ai && !loading && (
                    <Typography sx={{ mt: 1, opacity: 0.7 }}>
                        커밋 메시지에 <b>#{taskId}</b> 태그가 포함된 커밋을 기준으로 평가합니다.
                    </Typography>
                )}

                {ai && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {/* 상단 요약 */}
                        <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    size="small"
                                    label={`AI Status: ${ai.aiStatus || ai.status || 'IN_PROGRESS'}`}
                                    color={
                                        (ai.aiStatus || ai.status) === 'DONE'
                                            ? 'success'
                                            : (ai.aiStatus || ai.status) === 'TODO'
                                                ? 'default'
                                                : 'warning'
                                    }
                                    variant="filled"
                                />
                                {typeof progressPct === 'number' && (
                                    <Chip size="small" label={`AI Progress: ${progressPct}%`} variant="outlined" />
                                )}
                            </Stack>

                            {typeof progressPct === 'number' && (
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress variant="determinate" value={progressPct} />
                                </Box>
                            )}

                            {ai.summary && (
                                <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                    {ai.summary}
                                </Typography>
                            )}
                        </Stack>

                        <Divider />

                        {/* 체크리스트 */}
                        <Stack spacing={1}>
                            <Typography sx={{ fontWeight: 700 }}>체크리스트</Typography>

                            {Array.isArray(ai.checklist) && ai.checklist.length > 0 ? (
                                ai.checklist.map((c, idx) => (
                                    <Card key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                        <Stack spacing={0.75}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    size="small"
                                                    label={c.state || 'UNKNOWN'}
                                                    color={stateChipColor(c.state)}
                                                    variant="filled"
                                                />
                                                <Typography sx={{ fontWeight: 600 }}>
                                                    {c.item || '(no item)'}
                                                </Typography>
                                            </Stack>

                                            {Array.isArray(c.evidence) && c.evidence.length > 0 && (
                                                <Typography sx={{ opacity: 0.7, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                                                    근거: {c.evidence.join(', ')}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Card>
                                ))
                            ) : (
                                <Typography sx={{ opacity: 0.7 }}>체크리스트 결과가 없습니다.</Typography>
                            )}
                        </Stack>

                        {/* Next steps */}
                        {Array.isArray(ai.nextSteps) && ai.nextSteps.length > 0 && (
                            <>
                                <Divider />
                                <Stack spacing={1}>
                                    <Typography sx={{ fontWeight: 700 }}>다음 추천 액션</Typography>
                                    <Stack spacing={0.5}>
                                        {ai.nextSteps.map((s, i) => (
                                            <Typography key={i} sx={{ opacity: 0.9 }}>
                                                • {s}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Stack>
                            </>
                        )}

                        {/* Evidence */}
                        {Array.isArray(ai.evidence) && ai.evidence.length > 0 && (
                            <>
                                <Divider />
                                <Stack spacing={1}>
                                    <Typography sx={{ fontWeight: 700 }}>핵심 근거</Typography>
                                    <Typography sx={{ opacity: 0.7, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                                        {ai.evidence.join('\n')}
                                    </Typography>
                                </Stack>
                            </>
                        )}
                    </Stack>
                )}
            </Card>
        </Stack>
    );
}
