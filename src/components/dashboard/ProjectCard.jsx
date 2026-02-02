import { useNavigate } from 'react-router-dom';
import { Button, Card, Chip, Stack, Typography } from '@mui/material';

export default function ProjectCard({ project }) {
    const navigate = useNavigate();

    const risk = project?.risk || 'LOW';

    return (
        <Card sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">{project?.name || `Project #${project?.id}`}</Typography>
                    <Chip size="small" label={risk} variant="outlined" />
                </Stack>

                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    {project?.description || '설명 없음'}
                </Typography>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {project?.startDate ? `${project.startDate} ~ ${project.endDate || ''}` : '기간 없음'}
                    </Typography>
                    <Button size="small" variant="contained" onClick={() => navigate(`/projects/${project.id}`)}>
                        상세
                    </Button>
                </Stack>
            </Stack>
        </Card>
    );
}
