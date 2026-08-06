import HubOutlined from '@mui/icons-material/HubOutlined'
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { api, type PatientQuery } from './api'

const VERSIONS = ['v1', 'v2', 'v3', 'v4']
const COLORS = ['#2f80ed', '#16a05d', '#f47b20', '#8e44c5']
const POSITIONS: Record<string, [number, number]> = {
  V1: [574, 188], V2: [420, 56], V3: [246, 262], V4: [472, 432],
  'V1&V2': [344, 120], 'V1&V3': [578, 316], 'V1&V4': [518, 198],
  'V2&V3': [282, 238], 'V2&V4': [338, 418], 'V3&V4': [486, 392],
  'V1&V2&V3': [300, 208], 'V1&V2&V4': [430, 168],
  'V1&V3&V4': [500, 344], 'V2&V3&V4': [346, 326],
  'V1&V2&V3&V4': [436, 252],
}

export function IntelligencePanel({ token, query }: { token: string; query: PatientQuery }) {
  const [unions, setUnions] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    api.unions(token, query).then((data) => { setUnions(data); setError('') }).catch((reason: Error) => setError(reason.message))
  }, [token, query])

  const entries = Object.entries(unions).sort(([a], [b]) => a.split('&').length - b.split('&').length || a.localeCompare(b))
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  const membershipTotals = VERSIONS.map((version, index) => entries.reduce((sum, [name, value]) => name.includes(`V${index + 1}`) ? sum + value : sum, 0))
  const byDepth = [1, 2, 3, 4].map((depth) => entries.filter(([name]) => name.split('&').length === depth).reduce((sum, [, value]) => sum + value, 0))
  const activeFilters = [query.gender, query.district, query.subdistrict, ...(query.versions ?? []).map((value) => value.toUpperCase())].filter(Boolean)

  return <Card sx={{ overflow: 'hidden' }}><CardContent>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
      <Stack direction="row" alignItems="flex-start" spacing={1}><HubOutlined color="primary" /><Box><Typography variant="h5" fontWeight={900}>สรุปการจัดกลุ่ม V1–V4</Typography><Typography variant="body2" color="text.secondary">วงกลมแสดงจำนวนผู้รับบริการในแต่ละกลุ่มและส่วนที่อยู่ร่วมกัน</Typography></Box></Stack>
      <Box sx={{ px: 2.5, py: 1, borderRadius: 2, bgcolor: 'rgba(47,128,237,.14)', textAlign: 'center', minWidth: 150 }}><Typography variant="caption" color="text.secondary">จำนวนทั้งหมด</Typography><Typography variant="h4" fontWeight={900}>{total.toLocaleString()} <Typography component="span" fontWeight={700}>คน</Typography></Typography></Box>
    </Stack>
    <Stack direction="row" gap={1} flexWrap="wrap" mb={2}><Chip label={activeFilters.length ? 'ผลลัพธ์ตามตัวกรอง' : 'ข้อมูลทั้งหมด'} color="primary" />{activeFilters.map((value) => <Chip key={String(value)} label={String(value)} variant="outlined" />)}{activeFilters.length > 0 && <Typography variant="caption" color="text.secondary" alignSelf="center">กราฟและรายชื่อใช้ตัวกรองชุดเดียวกัน</Typography>}</Stack>
    {error ? <Alert severity="error">{error}</Alert> : <Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <SectionTitle>แผนภาพวงกลม 4 วง (Venn Diagram)</SectionTitle>
        <Box sx={{ px: 2, pt: 1.5 }}><Stack direction="row" justifyContent="space-around" flexWrap="wrap" gap={1}>{membershipTotals.map((value, index) => <Typography key={index} fontWeight={800} sx={{ color: COLORS[index] }}>V{index + 1} ({value.toLocaleString()} คน)</Typography>)}</Stack></Box>
        <Box sx={{ width: '100%', overflowX: 'auto' }}><svg viewBox="0 0 900 520" role="img" aria-label="แผนภาพเวนน์ V1 ถึง V4" style={{ width: '100%', minWidth: 720, display: 'block' }}>
          <ellipse cx="545" cy="257" rx="314" ry="126" transform="rotate(26 545 257)" fill="rgba(47,128,237,.16)" stroke={COLORS[0]} strokeWidth="2.5" />
          <ellipse cx="374" cy="296" rx="310" ry="116" transform="rotate(105 374 296)" fill="rgba(22,160,93,.15)" stroke={COLORS[1]} strokeWidth="2.5" />
          <ellipse cx="478" cy="306" rx="280" ry="106" transform="rotate(11 478 306)" fill="rgba(244,123,32,.15)" stroke={COLORS[2]} strokeWidth="2.5" />
          <ellipse cx="391" cy="352" rx="267" ry="128" transform="rotate(105 391 352)" fill="rgba(142,68,197,.15)" stroke={COLORS[3]} strokeWidth="2.5" />
          {Object.entries(POSITIONS).map(([name, [x, y]]) => (unions[name] ?? 0) > 0 && <g key={name} style={{ paintOrder: 'stroke', stroke: '#102433', strokeWidth: 5, strokeLinejoin: 'round' }}>
            {name.includes('&') && <text x={x} y={y - 7} textAnchor="middle" fill="#c8d7e3" fontSize="10" fontWeight="700">{name.replaceAll('&', '+')}</text>}
            <text x={x} y={y + 10} textAnchor="middle" fill={name === 'V1&V2&V3&V4' ? '#ff6565' : '#fff'} fontSize="18" fontWeight="900">{unions[name] ?? 0}</text>
          </g>)}
          <text x="790" y="145" fill={COLORS[0]} fontWeight="900" fontSize="20">V1</text><text x="260" y="35" fill={COLORS[1]} fontWeight="900" fontSize="20">V2</text><text x="760" y="355" fill={COLORS[2]} fontWeight="900" fontSize="20">V3</text><text x="245" y="500" fill={COLORS[3]} fontWeight="900" fontSize="20">V4</text>
        </svg></Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, p: 1.5 }}>{byDepth.map((value, index) => <Box key={index} sx={{ p: 1.2, borderRadius: 2, textAlign: 'center', bgcolor: `${COLORS[index]}18` }}><Typography variant="caption">อยู่ {index + 1} กลุ่ม</Typography><Typography fontWeight={900}>{value.toLocaleString()} คน</Typography></Box>)}</Box>
      </Box>
    </Box>}
    <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>หมายเหตุ: ซ่อนสับเซตที่มีค่า 0 เพื่อให้อ่านง่าย ตัวเลขในพื้นที่ซ้อนกันคือจำนวนผู้ที่อยู่ในกลุ่มดังกล่าวพร้อมกัน และแต่ละคนถูกนับเพียงหนึ่งส่วน</Typography>
  </CardContent></Card>
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <Box sx={{ px: 2, py: 1, background: 'linear-gradient(90deg,#0e4aa8,#061b4e)', color: 'white' }}><Typography fontWeight={900} textAlign="center">{children}</Typography></Box> }
