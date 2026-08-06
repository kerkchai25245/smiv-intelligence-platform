import BarChartOutlined from '@mui/icons-material/BarChartOutlined'
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { api, type PatientQuery } from './api'

const COLORS = ['#39d0bb', '#4f68ff', '#ff9f43', '#a65eea']

export function IntelligencePanel({ token, query }: { token: string; query: PatientQuery }) {
  const [unions, setUnions] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    api.unions(token, query).then((data) => { setUnions(data); setError('') }).catch((reason: Error) => setError(reason.message))
  }, [token, query])

  const entries = Object.entries(unions).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  const maximum = Math.max(...entries.map(([, value]) => value), 1)
  const activeFilters = [query.gender, query.district, query.subdistrict, ...(query.versions ?? []).map((value) => value.toUpperCase())].filter(Boolean)

  return <Card><CardContent>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
      <Stack direction="row" spacing={1}><BarChartOutlined color="primary" /><Box><Typography variant="h5" fontWeight={900}>จำนวนผู้รับบริการตามกลุ่ม V</Typography><Typography variant="body2" color="text.secondary">กราฟเรียงจากจำนวนมากไปน้อย และใช้ตัวกรองเดียวกับรายชื่อด้านล่าง</Typography></Box></Stack>
      <Box textAlign={{ md: 'right' }}><Typography variant="h4" fontWeight={900}>{total.toLocaleString()}</Typography><Typography variant="caption" color="text.secondary">คนตามเงื่อนไขที่เลือก</Typography></Box>
    </Stack>
    <Stack direction="row" gap={1} flexWrap="wrap" mb={3}><Chip color="primary" label={activeFilters.length ? 'กำลังกรองข้อมูล' : 'ข้อมูลทั้งหมด'} />{activeFilters.map((value) => <Chip key={String(value)} variant="outlined" label={String(value)} />)}</Stack>
    {error ? <Alert severity="error">{error}</Alert> : entries.length === 0 ? <Alert severity="info">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</Alert> : <Stack spacing={1.4}>{entries.map(([name, value], index) => <Box key={name} sx={{ display: 'grid', gridTemplateColumns: { xs: '80px 1fr 48px', sm: '130px 1fr 72px' }, gap: 1.5, alignItems: 'center' }}>
      <Typography fontWeight={800} textAlign="right">{name.replaceAll('&', ' + ')}</Typography>
      <Box sx={{ height: 30, borderRadius: 2, bgcolor: 'rgba(159,178,193,.10)', overflow: 'hidden' }}><Box sx={{ width: `${Math.max((value / maximum) * 100, 2)}%`, height: '100%', borderRadius: 2, bgcolor: COLORS[Math.min(name.split('&').length - 1, 3)], opacity: index < 3 ? 1 : .82, transition: 'width .35s ease' }} /></Box>
      <Typography fontWeight={900}>{value.toLocaleString()}</Typography>
    </Box>)}</Stack>}
    <Typography variant="caption" color="text.secondary" display="block" mt={2}>แต่ละคนอยู่ในแท่งเดียวตามชุด V ของตนเอง จึงไม่มีการนับซ้ำ</Typography>
  </CardContent></Card>
}
