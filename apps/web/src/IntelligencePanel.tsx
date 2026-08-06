import HubOutlined from '@mui/icons-material/HubOutlined'
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { api } from './api'

const VERSIONS = ['v1', 'v2', 'v3', 'v4']
const COLORS = ['#2f80ed', '#16a05d', '#f47b20', '#8e44c5']
const POSITIONS: Record<string, [number, number]> = {
  V1: [205, 145], V2: [515, 145], V3: [205, 350], V4: [515, 350],
  'V1&V2': [360, 120], 'V1&V3': [225, 260], 'V2&V4': [495, 260],
  'V3&V4': [360, 390], 'V1&V4': [292, 235], 'V2&V3': [428, 235],
  'V1&V2&V3': [300, 185], 'V1&V2&V4': [420, 185],
  'V1&V3&V4': [300, 330], 'V2&V3&V4': [420, 330],
  'V1&V2&V3&V4': [360, 270],
}

export function IntelligencePanel({ token }: { token: string }) {
  const [unions, setUnions] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.unions(token, selected).then((data) => { setUnions(data); setError('') }).catch((reason: Error) => setError(reason.message))
  }, [token, selected])

  const entries = Object.entries(unions).sort(([a], [b]) => a.split('&').length - b.split('&').length || a.localeCompare(b))
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  const membershipTotals = VERSIONS.map((version, index) => entries.reduce((sum, [name, value]) => name.includes(`V${index + 1}`) ? sum + value : sum, 0))
  const byDepth = [1, 2, 3, 4].map((depth) => entries.filter(([name]) => name.split('&').length === depth).reduce((sum, [, value]) => sum + value, 0))
  const toggle = (value: string) => setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])

  return <Card sx={{ overflow: 'hidden' }}><CardContent>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
      <Stack direction="row" alignItems="flex-start" spacing={1}><HubOutlined color="primary" /><Box><Typography variant="h5" fontWeight={900}>สรุปการจัดกลุ่ม V1–V4</Typography><Typography variant="body2" color="text.secondary">วงกลมแสดงจำนวนผู้รับบริการในแต่ละกลุ่มและส่วนที่อยู่ร่วมกัน</Typography></Box></Stack>
      <Box sx={{ px: 2.5, py: 1, borderRadius: 2, bgcolor: 'rgba(47,128,237,.14)', textAlign: 'center', minWidth: 150 }}><Typography variant="caption" color="text.secondary">จำนวนทั้งหมด</Typography><Typography variant="h4" fontWeight={900}>{total.toLocaleString()} <Typography component="span" fontWeight={700}>คน</Typography></Typography></Box>
    </Stack>
    <Stack direction="row" gap={1} flexWrap="wrap" mb={2}><Chip label="ทั้งหมด" clickable color={!selected.length ? 'primary' : 'default'} onClick={() => setSelected([])} />{VERSIONS.map((value) => <Chip key={value} label={value.toUpperCase()} clickable variant={selected.includes(value) ? 'filled' : 'outlined'} color={selected.includes(value) ? 'primary' : 'default'} onClick={() => toggle(value)} />)}</Stack>
    {error ? <Alert severity="error">{error}</Alert> : <Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <SectionTitle>แผนภาพวงกลม 4 วง (Venn Diagram)</SectionTitle>
        <Box sx={{ px: 2, pt: 1.5 }}><Stack direction="row" justifyContent="space-around" flexWrap="wrap" gap={1}>{membershipTotals.map((value, index) => <Typography key={index} fontWeight={800} sx={{ color: COLORS[index] }}>V{index + 1} ({value.toLocaleString()} คน)</Typography>)}</Stack></Box>
        <Box sx={{ width: '100%', overflowX: 'auto' }}><svg viewBox="0 0 720 455" role="img" aria-label="แผนภาพเวนน์ V1 ถึง V4" style={{ width: '100%', minWidth: 620, display: 'block' }}>
          <ellipse cx="280" cy="170" rx="175" ry="112" fill="rgba(47,128,237,.18)" stroke={COLORS[0]} strokeWidth="2" />
          <ellipse cx="440" cy="170" rx="175" ry="112" fill="rgba(22,160,93,.18)" stroke={COLORS[1]} strokeWidth="2" />
          <ellipse cx="290" cy="295" rx="155" ry="112" fill="rgba(244,123,32,.17)" stroke={COLORS[2]} strokeWidth="2" />
          <ellipse cx="430" cy="295" rx="155" ry="112" fill="rgba(142,68,197,.17)" stroke={COLORS[3]} strokeWidth="2" />
          {Object.entries(POSITIONS).map(([name, [x, y]]) => <g key={name} style={{ paintOrder: 'stroke', stroke: '#102433', strokeWidth: 5, strokeLinejoin: 'round' }}>
            {name.includes('&') && <text x={x} y={y - 7} textAnchor="middle" fill="#c8d7e3" fontSize="10" fontWeight="700">{name.replaceAll('&', '+')}</text>}
            <text x={x} y={y + 10} textAnchor="middle" fill={name === 'V1&V2&V3&V4' ? '#ff6565' : '#fff'} fontSize="18" fontWeight="900">{unions[name] ?? 0}</text>
          </g>)}
          <text x="115" y="65" fill={COLORS[0]} fontWeight="800" fontSize="18">V1</text><text x="585" y="65" fill={COLORS[1]} fontWeight="800" fontSize="18">V2</text><text x="140" y="420" fill={COLORS[2]} fontWeight="800" fontSize="18">V3</text><text x="560" y="420" fill={COLORS[3]} fontWeight="800" fontSize="18">V4</text>
        </svg></Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, p: 1.5 }}>{byDepth.map((value, index) => <Box key={index} sx={{ p: 1.2, borderRadius: 2, textAlign: 'center', bgcolor: `${COLORS[index]}18` }}><Typography variant="caption">อยู่ {index + 1} กลุ่ม</Typography><Typography fontWeight={900}>{value.toLocaleString()} คน</Typography></Box>)}</Box>
      </Box>
    </Box>}
    <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>หมายเหตุ: ตัวเลขในพื้นที่ซ้อนกันคือจำนวนผู้ที่อยู่ในกลุ่มดังกล่าวพร้อมกัน และแต่ละคนถูกนับเพียงหนึ่งส่วน</Typography>
  </CardContent></Card>
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <Box sx={{ px: 2, py: 1, background: 'linear-gradient(90deg,#0e4aa8,#061b4e)', color: 'white' }}><Typography fontWeight={900} textAlign="center">{children}</Typography></Box> }
