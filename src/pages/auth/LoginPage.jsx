import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Container, Stack, TextField, Typography } from '@mui/material';
import { login } from '../../api/authApi';
import { useAuth } from '../../auth/useAuth';

export default function LoginPage() {
    const navigate = useNavigate();
    const { setAccessToken, setMe, setTeamId } = useAuth();

    const [email, setEmail] = useState('test@pf.ai');
    const [password, setPassword] = useState('1234');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await login({ email, password });
            setAccessToken(res?.accessToken);
            setMe(res?.user || { email });
            setTeamId(null); // 로그인하면 팀 선택부터
            navigate('/teams');
        } catch (e) {
            setError(e.message || '로그인 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ py: 6 }}>
            <Container maxWidth="sm">
                <Card sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Login</Typography>

                    {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

                    <Stack spacing={2}>
                        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <Button variant="contained" onClick={onLogin} disabled={loading}>
                            {loading ? '로그인 중...' : '로그인'}
                        </Button>
                    </Stack>
                </Card>
            </Container>
        </Box>
    );
}
