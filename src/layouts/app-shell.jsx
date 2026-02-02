import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Box, Typography, Button, Stack } from '@mui/material';

export default function AppShell() {
    const navigate = useNavigate();

    const logout = () => {
        localStorage.clear();
        navigate('/login', { replace: true });
    };

    return (
        <Box sx={{ minHeight: '100vh' }}>
            <AppBar position="sticky" elevation={0}>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">ProjectFlow</Typography>

                    <Stack direction="row" spacing={1}>
                        <Button color="inherit" onClick={() => navigate('/')}>Home</Button>
                        <Button color="inherit" onClick={() => navigate('/teams')}>Teams</Button>
                        <Button color="inherit" onClick={logout}>Logout</Button>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: 2 }}>
                <Outlet />
            </Box>
        </Box>
    );
}
