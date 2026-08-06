import HubOutlined from '@mui/icons-material/HubOutlined'
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import { useEffect, useState } from 'react'
import { api } from './api'

const VERSIONS = ['v1', 'v2', 'v3', 'v4']

export function IntelligencePanel({ token }: { token: string }) {
  const [unions, setUnions] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.unions(token, selected).then((data) => { setUnions(data); setError('') }).catch((reason: Error) => setError(reason.message))
  }, [token, selected])

  const entries = Object.entries(unions).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  const option = {
    animationDuration: 500,
    grid: { left: 92, right: 44, top: 14, bottom: 32 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: Array<{ name: string; value: number }>) => `${params[0].name}<br/><b>${params[0].value.toLocaleString()} คน</b>` },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#9fb2c1' }, splitLine: { lineStyle: { color: 'rgba(159,178,193,.12)' } } },
    yAxis: { type: 'category', inverse: true, data: entries.map(([name]) => name.replaceAll('&', ' + ')), axisLabel: { color: '#eaf4fb', fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: 'bar', data: entries.map(([, value]) => value), barMaxWidth: 26, itemStyle: { color: '#39d0bb', borderRadius: [0, 7, 7, 0] }, label: { show: true, position: 'right', color: '#eaf4fb', formatter: '{c}' } }],
  }

  const toggle = (value: string) => setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])

  return <Card sx={{ overflow: 'hidden' }}>
    <CardContent>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <HubOutlined color="primary" />
          <Box><Typography variant="h6" fontWeight={800}>การกระจายกลุ่ม V</Typography><Typography variant="body2" color="text.secondary">เรียงจากกลุ่มที่พบมากที่สุด กด V เพื่อดูเฉพาะผู้ที่อยู่ในกลุ่มที่เลือก</Typography></Box>
        </Stack>
        <Box textAlign={{ md: 'right' }}><Typography variant="h5" fontWeight={900}>{total.toLocaleString()}</Typography><Typography variant="caption" color="text.secondary">ผู้รับบริการในกราฟ</Typography></Box>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
        <Chip label="ทั้งหมด" clickable color={!selected.length ? 'primary' : 'default'} onClick={() => setSelected([])} />
        {VERSIONS.map((value) => <Chip key={value} label={value.toUpperCase()} clickable variant={selected.includes(value) ? 'filled' : 'outlined'} color={selected.includes(value) ? 'primary' : 'default'} onClick={() => toggle(value)} />)}
      </Stack>
      {selected.length > 0 && <Typography variant="body2" color="primary" mb={1}>กำลังแสดงผู้ที่อยู่ใน {selected.map((value) => value.toUpperCase()).join(' และ ')}</Typography>}
      {error ? <Alert severity="error">{error}</Alert> : entries.length ? <ReactECharts option={option} style={{ height: Math.max(280, entries.length * 42) }} /> : <Box sx={{ height: 240, display: 'grid', placeItems: 'center' }}><Typography color="text.secondary">ไม่พบข้อมูลตามตัวกรอง V ที่เลือก</Typography></Box>}
    </CardContent>
  </Card>
}
