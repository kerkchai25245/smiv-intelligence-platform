import HubOutlined from '@mui/icons-material/HubOutlined'
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import { useEffect, useState } from 'react'
import { api } from './api'

export function IntelligencePanel({ token }: { token: string }) {
  const [unions, setUnions] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    api.unions(token).then(setUnions).catch((reason: Error) => setError(reason.message))
  }, [token])

  const entries = Object.entries(unions).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} คน ({d}%)' },
    legend: { type: 'scroll', bottom: 0, textStyle: { color: '#b7c6d4' } },
    series: [{
      name: 'Union V1–V4', type: 'pie', radius: ['38%', '70%'], center: ['50%', '44%'],
      padAngle: 2, itemStyle: { borderRadius: 8, borderColor: '#102433', borderWidth: 3 },
      label: { color: '#eaf4fb', formatter: '{b}\n{c}' },
      data: entries.map(([name, value]) => ({ name, value })),
    }],
  }

  return <Card sx={{ overflow: 'hidden' }}>
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <HubOutlined color="primary" />
        <Box><Typography variant="h6" fontWeight={800}>กราฟยูเนี่ยน V1–V4</Typography><Typography variant="body2" color="text.secondary">แสดงกลุ่ม V ที่พบร่วมกันในผู้รับบริการแต่ละราย</Typography></Box>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : entries.length ? <ReactECharts option={option} style={{ height: 420 }} /> : <Box sx={{ height: 260, display: 'grid', placeItems: 'center' }}><Typography color="text.secondary">ยังไม่มีข้อมูลสำหรับสร้างกราฟ</Typography></Box>}
    </CardContent>
  </Card>
}
