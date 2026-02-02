import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function AppLayout({ title, children, right }) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <Box sx={{ py: 3 }}>
            <Container maxWidth="lg">
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6">{title}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        {right}
                        <Button variant="outlined" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                        <Button variant="outlined" onClick={() => navigate('/teams')}>Teams</Button>
                        <Button color="error" variant="outlined" onClick={logout}>Logout</Button>
                    </Stack>
                </Stack>

                {children}
            </Container>
        </Box>
    );
}
