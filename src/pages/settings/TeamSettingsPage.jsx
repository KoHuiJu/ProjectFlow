import { Typography } from '@mui/material';
import AppLayout from '../../components/common/AppLayout.jsx';

export default function TeamSettingsPage() {
    return (
        <AppLayout title="팀 설정">
            <Typography sx={{ opacity: 0.7 }}>
                LEADER 전용: 팀원/역할 관리 화면. (MemberList + InviteMemberModal 붙일 자리)
            </Typography>
        </AppLayout>
    );
}
