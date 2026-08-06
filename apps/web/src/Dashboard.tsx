import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import type { ColDef } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import { api, type Patient, type Summary } from './api'
import { IntelligencePanel } from './IntelligencePanel'

ModuleRegistry.registerModules([AllCommunityModule])

export function Dashboard({ token }: { token: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.summary(token), api.patients(token, search)])
      .then(([nextSummary, page]) => { setSummary(nextSummary); setPatients(page.items); setError('') })
      .catch((reason: Error) => setError(reason.message))
  }, [token, search])

  const columns = useMemo<ColDef<Patient>[]>(() => [
    { headerName: 'ชื่อ', valueGetter: ({ data }) => `${data?.first_name ?? ''} ${data?.last_name ?? ''}`, flex: 2 },
    { field: 'national_id_last4', headerName: 'เลขท้ายบัตร', flex: 1 },
    { field: 'province', headerName: 'จังหวัด', flex: 1 },
    { field: 'district', headerName: 'อำเภอ/เขต', flex: 1 },
    ...(['v1', 'v2', 'v3', 'v4'] as const).map((field) => ({ field, headerName: field.toUpperCase(), width: 80, cellRenderer: ({ value }: { value: boolean }) => value ? '●' : '–' })),
  ], [])

  if (!summary) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 500 }}>{error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}</Box>
  const chart = { tooltip: {}, grid: { left: 45, right: 20, top: 20, bottom: 70 }, xAxis: { type: 'category', data: summary.by_province.map((item) => item.name), axisLabel: { rotate: 35, color: '#8fa6b8' } }, yAxis: { type: 'value', axisLabel: { color: '#8fa6b8' } }, series: [{ type: 'bar', data: summary.by_province.map((item) => item.count), itemStyle: { color: '#39d0bb', borderRadius: [6, 6, 0, 0] } }] }

  return <Stack spacing={3}>
    {error && <Alert severity="error">{error}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5,1fr)' }, gap: 2 }}>
      <Metric label="ผู้รับบริการทั้งหมด" value={summary.total} />
      {Object.entries(summary.categories).map(([key, value]) => <Metric key={key} label={key.toUpperCase()} value={value} />)}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.4fr' }, gap: 2 }}>
      <Card><CardContent><Typography variant="h6">จำนวนตามจังหวัด</Typography><ReactECharts option={chart} style={{ height: 340 }} /></CardContent></Card>
      <Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={2}>
        <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือนามสกุล" size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }} />
        <Button component="label" variant="contained" startIcon={<CloudUploadOutlined />}>นำเข้า Excel<input hidden type="file" accept=".xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file) api.importExcel(token, file).then(() => location.reload()).catch((reason: Error) => setError(reason.message)) }} /></Button>
      </Stack>
      <Box sx={{ height: 410 }}><AgGridReact rowData={patients} columnDefs={columns} pagination paginationPageSize={20} /></Box>
      </CardContent></Card>
    </Box>
    <IntelligencePanel token={token} />
  </Stack>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent><Stack direction="row" justifyContent="space-between"><Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4" fontWeight={800}>{value.toLocaleString()}</Typography></Box><Chip label="LIVE" color="success" size="small" /></Stack></CardContent></Card>
}
