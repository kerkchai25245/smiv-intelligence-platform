import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material'
import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { api } from './api'
import { Dashboard } from './Dashboard'

const TOKEN_KEY = 'smiv.access_token'

export function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '')
  const [error, setError] = useState('')
  if (!token) return <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
    <Stack alignItems="center" spacing={3} sx={{ maxWidth: 520, textAlign: 'center' }}>
      <InsightsOutlined sx={{ fontSize: 64, color: 'primary.main' }} />
      <Typography variant="overline" color="primary">SMI-V Intelligence Platform</Typography>
      <Typography variant="h2" fontWeight={900}>ข้อมูลที่พร้อม<br />สำหรับการตัดสินใจ</Typography>
      <Typography color="text.secondary">เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต เพื่อเข้าถึงข้อมูลสุขภาพอย่างปลอดภัย</Typography>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleLogin onSuccess={({ credential }) => { if (credential) api.googleLogin(credential).then((result) => { sessionStorage.setItem(TOKEN_KEY, result.access_token); setToken(result.access_token) }).catch((reason: Error) => setError(reason.message)) }} onError={() => setError('Google login failed')} /> : <Typography color="warning.main">ตั้งค่า VITE_GOOGLE_CLIENT_ID เพื่อเปิด Google Login</Typography>}
      {error && <Typography color="error">{error}</Typography>}
    </Stack>
  </Box>
  return <Box component="main" sx={{ minHeight: '100vh' }}>
    <AppBar position="sticky" color="transparent" elevation={0}><Toolbar><InsightsOutlined color="primary" /><Typography sx={{ ml: 1, flexGrow: 1 }} fontWeight={800}>SMI-V Intelligence</Typography><Button color="inherit" startIcon={<LogoutOutlined />} onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken('') }}>ออกจากระบบ</Button></Toolbar></AppBar>
    <Container maxWidth="xl" sx={{ py: 4 }}><Dashboard token={token} /></Container>
  </Box>
}
