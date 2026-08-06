import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { api, type MapPoint } from './api'

export function IntelligencePanel({ token }: { token: string }) {
  const [unions, setUnions] = useState<Record<string, number>>({})
  const [points, setPoints] = useState<MapPoint[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([api.unions(token), api.map(token), api.insights(token)])
      .then(([nextUnions, nextPoints, nextInsights]) => { setUnions(nextUnions); setPoints(nextPoints); setInsights(nextInsights.insights) })
      .catch((reason: Error) => setError(reason.message))
  }, [token])
  const unionEntries = Object.entries(unions).sort((a, b) => b[1] - a[1])
  const option = { tooltip: {}, grid: { left: 90, right: 20, top: 10, bottom: 20 }, xAxis: { type: 'value' }, yAxis: { type: 'category', data: unionEntries.map(([name]) => name), inverse: true }, series: [{ type: 'bar', data: unionEntries.map(([, value]) => value), itemStyle: { color: '#8f7aff', borderRadius: [0, 6, 6, 0] } }] }
  return <Stack spacing={2} mt={3}>
    {error && <Alert severity="error">{error}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' }, gap: 2 }}>
      <Card><CardContent><Typography variant="h6" mb={2}>แผนที่การกระจายตัว</Typography><Box sx={{ height: 420, overflow: 'hidden', borderRadius: 2 }}><MapContainer center={[13.2, 101]} zoom={6} style={{ height: '100%', width: '100%' }}><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{points.map((point, index) => <CircleMarker key={`${point.latitude}-${point.longitude}-${index}`} center={[point.latitude, point.longitude]} radius={7} pathOptions={{ color: '#39d0bb', fillOpacity: .7 }}><Popup>{point.province} {point.district}<br />{point.categories.join(', ')}</Popup></CircleMarker>)}</MapContainer></Box></CardContent></Card>
      <Stack spacing={2}><Card><CardContent><Typography variant="h6">Union V1–V4</Typography><ReactECharts option={option} style={{ height: 300 }} /></CardContent></Card><Card><CardContent><Stack direction="row" alignItems="center" spacing={1} mb={2}><AutoAwesomeOutlined color="primary" /><Typography variant="h6">Intelligence Brief</Typography><Chip label="RULE-BASED" size="small" /></Stack>{insights.map((message) => <Typography key={message} color="text.secondary" mb={1}>• {message}</Typography>)}</CardContent></Card></Stack>
    </Box>
  </Stack>
}
