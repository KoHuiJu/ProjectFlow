import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
} from '@mui/material';

export default function ProjectCreateModal({ open, onClose, onSubmit }) {
    const [name, setName] = useState('');
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName('');
            setTouched(false);
        }
    }, [open]);

    const trimmed = name.trim();
    const error = touched && trimmed.length === 0;

    const handleSubmit = async () => {
        setTouched(true);
        if (!trimmed) return;
        await onSubmit(trimmed);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>프로젝트 생성</DialogTitle>

            <DialogContent>
                <Stack sx={{ mt: 1 }} spacing={2}>
                    <TextField
                        label="프로젝트 이름"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setTouched(true)}
                        error={error}
                        helperText={error ? '프로젝트 이름을 입력해 주세요.' : ' '}
                        autoFocus
                        fullWidth
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                        }}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button variant="outlined" onClick={onClose}>
                    취소
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!trimmed}>
                    확인
                </Button>
            </DialogActions>
        </Dialog>
    );
}
