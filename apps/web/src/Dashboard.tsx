import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined'
import ManageSearchOutlined from '@mui/icons-material/ManageSearchOutlined'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
  TablePagination,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { api, type ImportIssue, type ImportPreview, type ImportResult, type Patient, type PatientFilters, type PatientQuery, type Summary } from './api'
import { IntelligencePanel } from './IntelligencePanel'

const EMPTY_QUERY: PatientQuery = { nationalId: '', firstName: '', lastName: '', district: '', subdistrict: '', gender: '', versions: [], status: '' }
const STATUS_LABELS = { active: 'ปกติ', deceased: 'ตาย', moved: 'ย้าย' } as const

export function Dashboard({ token }: { token: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [options, setOptions] = useState<PatientFilters>({ districts: [], subdistricts: [], genders: [] })
  const [draft, setDraft] = useState<PatientQuery>(EMPTY_QUERY)
  const [query, setQuery] = useState<PatientQuery>(EMPTY_QUERY)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [pendingStatus, setPendingStatus] = useState<Patient['status']>('active')
  const [pendingNationalId, setPendingNationalId] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [issueTotal, setIssueTotal] = useState(0)
  const [editingIssue, setEditingIssue] = useState<ImportIssue | null>(null)
  const [dataRevision, setDataRevision] = useState(0)
  const [correction, setCorrection] = useState({ national_id: '', first_name: '', last_name: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextSummary, patientPage, nextOptions, issuePage] = await Promise.all([api.summary(token, query), api.patients(token, { ...query, page: page + 1, pageSize }), api.patientFilters(token), api.importIssues(token)])
      setSummary(nextSummary); setPatients(patientPage.items); setTotal(patientPage.total); setOptions(nextOptions); setIssues(issuePage.items); setIssueTotal(issuePage.total); setError('')
    } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }, [token, query, page, pageSize])

  useEffect(() => { void load() }, [load])

  const chooseFile = async (file?: File) => {
    if (!file) return
    setPendingFile(file); setPreview(null); setImportResult(null); setPreviewing(true); setError('')
    try { setPreview(await api.previewExcel(token, file)) } catch (reason) { setError((reason as Error).message); setPendingFile(null) } finally { setPreviewing(false) }
  }

  const confirmImport = async () => {
    if (!pendingFile) return
    setImporting(true)
    try { const result = await api.importExcel(token, pendingFile); setImportResult(result); setPreview(null); setPendingFile(null); await load(); setDataRevision((value) => value + 1) }
    catch (reason) { setError((reason as Error).message) } finally { setImporting(false) }
  }

  const saveStatus = async () => {
    if (!selected) return
    try { const updated = await api.updatePatient(token, selected.id, { status: pendingStatus, ...(!selected.national_id_valid ? { national_id: pendingNationalId } : {}) }); setSelected(updated); setPatients((items) => items.map((item) => item.id === updated.id ? updated : item)); setError(''); await load(); setDataRevision((value) => value + 1) }
    catch (reason) { setError((reason as Error).message) }
  }

  const openIssue = (issue: ImportIssue) => {
    const raw = issue.raw_data
    const fullName = String(raw.full_name ?? '').trim().split(/\s+/)
    setEditingIssue(issue)
    setCorrection({ national_id: String(raw.national_id ?? ''), first_name: String(raw.first_name ?? fullName[0] ?? ''), last_name: String(raw.last_name ?? fullName.slice(1).join(' ')) })
  }

  const resolveIssue = async () => {
    if (!editingIssue) return
    try { await api.resolveImportIssue(token, editingIssue.id, correction); setEditingIssue(null); await load(); setDataRevision((value) => value + 1) }
    catch (reason) { setError((reason as Error).message) }
  }

  if (!summary) return <Box sx={{ minHeight: 500, display: 'grid', placeItems: 'center' }}>{error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}</Box>

  return <Stack spacing={3}>
    <Card sx={{ background: 'linear-gradient(135deg, rgba(40,188,166,.16), rgba(79,104,255,.08))' }}><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
        <Box><Typography variant="overline" color="primary">SMI-V OPERATIONS</Typography><Typography variant="h4" fontWeight={900}>ค้นหาและจัดการผู้รับบริการ</Typography><Typography color="text.secondary">ค้นหา ตรวจสอบกลุ่ม V และปรับสถานะข้อมูลได้จากหน้าจอเดียว</Typography></Box>
        <Button component="label" size="large" variant="contained" startIcon={<CloudUploadOutlined />} disabled={previewing || importing}>{previewing ? 'กำลังตรวจสอบไฟล์…' : 'ตรวจสอบไฟล์ก่อนนำเข้า'}<input hidden type="file" accept=".xlsx" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = '' }} /></Button>
      </Stack>
    </CardContent></Card>

    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {issueTotal > 0 && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => document.getElementById('records-needing-fix')?.scrollIntoView({ behavior: 'smooth' })}>ไปยังข้อมูลที่ต้องแก้</Button>}><strong>มีข้อมูลเลขบัตรประชาชนผิด {issueTotal.toLocaleString()} รายการ</strong> — ข้อมูลถูกนำเข้าและแสดงไว้แล้ว กรุณาตรวจแก้เมื่อสะดวก</Alert>}

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5,1fr)' }, gap: 2 }}>
      <Metric label="ผู้รับบริการทั้งหมด" value={summary.total} icon={<PeopleAltOutlined />} />
      {Object.entries(summary.categories).map(([key, value]) => <Metric key={key} label={key.toUpperCase()} value={value} />)}
    </Box>

    <Card><CardContent>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}><ManageSearchOutlined color="primary" /><Box><Typography variant="h6" fontWeight={800}>ค้นหาและตัวกรอง</Typography><Typography variant="body2" color="text.secondary">ตัวกรอง V หลายรายการจะแสดงผู้ที่อยู่ครบทุก V ที่เลือก</Typography></Box></Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
        <TextField label="เลขบัตรประชาชน 13 หลัก" value={draft.nationalId} onChange={(e) => setDraft({ ...draft, nationalId: e.target.value })} />
        <TextField label="ชื่อ (เต็มหรือบางส่วน)" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
        <TextField label="นามสกุล (เต็มหรือบางส่วน)" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
        <SelectField label="อำเภอ" value={draft.district ?? ''} items={options.districts} onChange={(value) => setDraft({ ...draft, district: value })} />
        <SelectField label="ตำบล" value={draft.subdistrict ?? ''} items={options.subdistricts} onChange={(value) => setDraft({ ...draft, subdistrict: value })} />
        <SelectField label="เพศ" value={draft.gender ?? ''} items={options.genders} onChange={(value) => setDraft({ ...draft, gender: value })} />
        <FormControl><InputLabel>สถานะ</InputLabel><Select label="สถานะ" value={draft.status ?? ''} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><MenuItem value="">ทั้งหมด</MenuItem>{Object.entries(STATUS_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl>
      </Box>
      <Typography variant="body2" color="text.secondary" mt={2} mb={1}>เลือกกลุ่ม V (เลือกได้หลายรายการ)</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">{['v1','v2','v3','v4'].map((value) => { const active = draft.versions?.includes(value); return <Chip key={value} clickable color={active ? 'primary' : 'default'} variant={active ? 'filled' : 'outlined'} label={value.toUpperCase()} onClick={() => setDraft({ ...draft, versions: active ? draft.versions?.filter((item) => item !== value) : [...(draft.versions ?? []), value] })} /> })}</Stack>
      <Stack direction="row" gap={1} mt={2}><Button variant="contained" startIcon={<SearchOutlined />} onClick={() => { setPage(0); setQuery({ ...draft }) }}>ค้นหา</Button><Button startIcon={<FilterAltOffOutlined />} onClick={() => { setPage(0); setDraft(EMPTY_QUERY); setQuery(EMPTY_QUERY) }}>ล้างตัวกรอง</Button></Stack>
    </CardContent></Card>

    <IntelligencePanel token={token} query={query} dataRevision={dataRevision} />

    <Card><CardContent><Stack direction="row" justifyContent="space-between" mb={2}><Box><Typography variant="h6" fontWeight={800}>รายการผู้รับบริการ</Typography><Typography variant="body2" color="text.secondary">พบ {(total + issueTotal).toLocaleString()} รายการ <Typography component="span" color="error.light">(ต้องแก้เลขบัตร {summary.invalid_national_id_count.toLocaleString()})</Typography></Typography></Box>{loading && <CircularProgress size={24} />}</Stack>
      <TableContainer><Table size="small"><TableHead><TableRow><TableCell>ชื่อ–นามสกุล</TableCell><TableCell>เลขบัตร</TableCell><TableCell>พื้นที่</TableCell><TableCell>กลุ่ม V</TableCell><TableCell>สถานะ</TableCell><TableCell align="right">รายละเอียด</TableCell></TableRow></TableHead><TableBody>
        {page === 0 && issues.map((issue) => <TableRow key={issue.id} sx={{ '& td': { bgcolor: 'rgba(211,47,47,.09)', color: 'error.light', borderColor: 'rgba(255,82,82,.35)' } }}><TableCell><Typography fontWeight={900}>{String(issue.raw_data.full_name ?? issue.raw_data.first_name ?? 'ไม่ระบุชื่อ')}</Typography><Typography variant="caption">แถว {issue.row_number} ในไฟล์นำเข้า</Typography></TableCell><TableCell><Typography fontWeight={900}>เลขบัตรไม่ถูกต้อง</Typography></TableCell><TableCell>{[issue.raw_data.subdistrict, issue.raw_data.district].filter(Boolean).join(' / ') || '–'}</TableCell><TableCell>{(['v1','v2','v3','v4'] as const).filter((key) => Boolean(issue.raw_data[key])).map((key) => <Chip key={key} label={key.toUpperCase()} size="small" color="error" variant="outlined" sx={{ mr: .5 }} />)}</TableCell><TableCell><Chip label="ต้องแก้ไข" color="error" size="small" /></TableCell><TableCell align="right"><Button color="error" variant="contained" size="small" onClick={() => openIssue(issue)}>แก้ไขข้อมูล</Button></TableCell></TableRow>)}
        {patients.map((patient) => <TableRow hover key={patient.id} sx={!patient.national_id_valid ? { '& td': { bgcolor: 'rgba(211,47,47,.09)', color: 'error.light' } } : undefined}><TableCell><Typography fontWeight={700}>{patient.first_name} {patient.last_name}</Typography>{!patient.national_id_valid && <Typography variant="caption" fontWeight={900}>ต้องแก้ไขเลขบัตร</Typography>}</TableCell><TableCell>{patient.national_id_valid ? `•••••••••${patient.national_id_last4}` : <Chip color="error" size="small" label={`${patient.national_id_invalid_value || 'ไม่ระบุ'} (${(patient.national_id_invalid_value || '').replace(/\D/g, '').length} หลัก)`} />}</TableCell><TableCell>{[patient.subdistrict, patient.district].filter(Boolean).join(' / ') || '–'}</TableCell><TableCell><VersionChips patient={patient} /></TableCell><TableCell>{patient.national_id_valid ? <StatusChip status={patient.status} /> : <Chip color="error" label="ข้อมูลต้องแก้" size="small" />}</TableCell><TableCell align="right"><Button color={patient.national_id_valid ? 'primary' : 'error'} variant={patient.national_id_valid ? 'text' : 'contained'} size="small" onClick={() => { setSelected(patient); setPendingStatus(patient.status); setPendingNationalId(patient.national_id_invalid_value ?? '') }}>{patient.national_id_valid ? 'เปิดดู' : 'แก้ไขเลขบัตร'}</Button></TableCell></TableRow>)}
        {!loading && !patients.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>ไม่พบข้อมูลตามเงื่อนไข</TableCell></TableRow>}
      </TableBody></Table></TableContainer>
      <TablePagination component="div" count={total + issueTotal} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[20, 50, 100]} labelRowsPerPage="แสดงต่อหน้า" labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`} onPageChange={(_, nextPage) => setPage(nextPage)} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }} />
    </CardContent></Card>

    {issueTotal > 0 && <Card id="records-needing-fix" sx={{ border: '2px solid', borderColor: 'error.main', bgcolor: 'rgba(211,47,47,.06)', scrollMarginTop: 90 }}><CardContent>
      <Alert severity="error" sx={{ mb: 2 }}><Typography fontWeight={900}>พบข้อมูลที่นำเข้าแล้วแต่เลขบัตรประชาชนไม่ถูกต้อง {issueTotal.toLocaleString()} รายการ</Typography><Typography variant="body2">ข้อมูลถูกเก็บไว้ครบถ้วน กรุณากด “แก้ไขข้อมูล” เพื่อแก้เลขบัตร แล้วระบบจะย้ายเข้าสู่รายการปกติ</Typography></Alert>
      <TableContainer><Table size="small"><TableHead><TableRow><TableCell>แถวในไฟล์</TableCell><TableCell>ข้อมูลบุคคล</TableCell><TableCell>ข้อความเตือน</TableCell><TableCell align="right">ดำเนินการ</TableCell></TableRow></TableHead><TableBody>{issues.map((issue) => <TableRow key={issue.id} sx={{ '& td': { color: 'error.light', bgcolor: 'rgba(211,47,47,.05)' } }}><TableCell sx={{ fontWeight: 900 }}>{issue.row_number}</TableCell><TableCell sx={{ fontWeight: 800 }}>{String(issue.raw_data.full_name ?? issue.raw_data.first_name ?? 'ไม่ระบุชื่อ')}</TableCell><TableCell>{issue.reason}</TableCell><TableCell align="right"><Button color="error" size="small" variant="contained" onClick={() => openIssue(issue)}>แก้ไขข้อมูล</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>
    </CardContent></Card>}

    <Dialog open={Boolean(preview || previewing)} onClose={() => !importing && setPreview(null)} fullWidth maxWidth="sm"><DialogTitle>ตรวจสอบไฟล์ก่อนนำเข้า</DialogTitle><DialogContent dividers>{previewing ? <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : preview && <Stack spacing={2}><Typography fontWeight={700}>{preview.filename}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}><PreviewCount label="เพิ่ม" value={preview.created_count} /><PreviewCount label="อัปเดต" value={preview.updated_count} /><PreviewCount label="รอตรวจแก้" value={preview.skipped_count} warning /></Box><Typography variant="body2">ทั้งหมด {preview.total_rows.toLocaleString()} แถว · ข้อมูลสมบูรณ์ {preview.valid_rows.toLocaleString()} แถว</Typography>{preview.errors.length > 0 && <Alert severity="warning"><Typography fontWeight={700}>ข้อมูลไม่สมบูรณ์จะถูกเก็บในรายการรอตรวจแก้ ไม่สูญหาย</Typography>{preview.errors.slice(0, 10).map((item) => <Typography key={`${item.row}-${item.message}`} variant="body2">แถว {item.row}: {item.message}</Typography>)}</Alert>}</Stack>}</DialogContent><DialogActions><Button onClick={() => { setPreview(null); setPendingFile(null) }} disabled={importing}>ยกเลิก</Button><Button variant="contained" onClick={() => void confirmImport()} disabled={!preview || importing}>{importing ? 'กำลังนำเข้า…' : 'ยืนยันนำเข้า'}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(importResult)} disableEscapeKeyDown fullWidth maxWidth="sm"><DialogTitle>นำเข้าข้อมูลเสร็จสิ้น</DialogTitle>{importResult && <DialogContent dividers><Stack spacing={2}><Alert severity={importResult.skipped_count ? 'warning' : 'success'}><Typography fontWeight={900}>ระบบเก็บข้อมูลจากไฟล์ครบแล้ว</Typography>{importResult.skipped_count > 0 && <Typography variant="body2">ข้อมูลเลขบัตรผิดถูกเก็บและแสดงเป็นแถวสีแดง สามารถแก้ไขภายหลังได้</Typography>}</Alert><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}><PreviewCount label="เพิ่ม" value={importResult.created_count} /><PreviewCount label="อัปเดต" value={importResult.updated_count} /><PreviewCount label="ต้องแก้เลขบัตร" value={importResult.skipped_count} warning /></Box></Stack></DialogContent>}<DialogActions><Button size="large" variant="contained" onClick={() => { setImportResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>เสร็จสิ้น และไปยังหน้าเว็บ</Button></DialogActions></Dialog>

    <Dialog open={Boolean(editingIssue)} onClose={() => setEditingIssue(null)} fullWidth maxWidth="sm"><DialogTitle>แก้ไขข้อมูลรอตรวจ</DialogTitle><DialogContent dividers><Stack spacing={2}><Alert severity="info">แถว {editingIssue?.row_number}: {editingIssue?.reason}</Alert><TextField label="เลขบัตรประชาชน 13 หลัก" value={correction.national_id} onChange={(event) => setCorrection({ ...correction, national_id: event.target.value })} /><TextField label="ชื่อ" value={correction.first_name} onChange={(event) => setCorrection({ ...correction, first_name: event.target.value })} /><TextField label="นามสกุล" value={correction.last_name} onChange={(event) => setCorrection({ ...correction, last_name: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setEditingIssue(null)}>ยกเลิก</Button><Button variant="contained" onClick={() => void resolveIssue()}>บันทึกและย้ายเข้ารายการ</Button></DialogActions></Dialog>

    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm"><DialogTitle>รายละเอียดผู้รับบริการ</DialogTitle>{selected && <DialogContent dividers><Stack spacing={2}><Box><Typography variant="h6" fontWeight={800}>{selected.first_name} {selected.last_name}</Typography>{selected.national_id_valid ? <Typography color="text.secondary">เลขบัตรลงท้าย {selected.national_id_last4}</Typography> : <Alert severity="error" sx={{ mt: 1 }}>เลขบัตรมีจำนวนหลักไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข</Alert>}</Box>{!selected.national_id_valid && <TextField error label="แก้ไขเลขบัตรประชาชน" value={pendingNationalId} helperText={`ปัจจุบัน ${(pendingNationalId || '').replace(/\D/g, '').length} หลัก — สามารถบันทึกได้ แต่จะแสดงสีแดงจนกว่าจะครบ 13 หลัก`} onChange={(event) => setPendingNationalId(event.target.value)} />}<Divider /><Box><Typography variant="body2" color="text.secondary" mb={1}>กลุ่ม V</Typography><VersionChips patient={selected} /></Box><Box><Typography variant="body2" color="text.secondary">พื้นที่</Typography><Typography>{[selected.subdistrict, selected.district, selected.province].filter(Boolean).join(' / ') || 'ไม่ระบุ'}</Typography></Box><FormControl fullWidth><InputLabel>สถานะ</InputLabel><Select label="สถานะ" value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value as Patient['status'])}>{Object.entries(STATUS_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl></Stack></DialogContent>}<DialogActions><Button onClick={() => setSelected(null)}>ปิด</Button><Button variant="contained" onClick={() => void saveStatus()}>บันทึกข้อมูล</Button></DialogActions></Dialog>
  </Stack>
}

function Metric({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) { return <Card><CardContent><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h3" fontWeight={900}>{value.toLocaleString()}</Typography></Box>{icon ?? <Chip label="LIVE" color="success" size="small" />}</Stack></CardContent></Card> }
function SelectField({ label, value, items, onChange }: { label: string; value: string; items: string[]; onChange: (value: string) => void }) { return <FormControl><InputLabel>{label}</InputLabel><Select label={label} value={value} onChange={(e) => onChange(e.target.value)}><MenuItem value="">ทั้งหมด</MenuItem>{items.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl> }
function VersionChips({ patient }: { patient: Patient }) { const values = (['v1','v2','v3','v4'] as const).filter((key) => patient[key]); return <Stack direction="row" gap={.5} flexWrap="wrap">{values.length ? values.map((value) => <Chip key={value} label={value.toUpperCase()} size="small" color="primary" variant="outlined" />) : <Typography color="text.secondary">–</Typography>}</Stack> }
function StatusChip({ status }: { status: Patient['status'] }) { return <Chip size="small" label={STATUS_LABELS[status]} color={status === 'active' ? 'success' : status === 'deceased' ? 'error' : 'warning'} /> }
function PreviewCount({ label, value, warning }: { label: string; value: number; warning?: boolean }) { return <Box sx={{ p: 2, borderRadius: 2, bgcolor: warning && value ? 'rgba(255,167,38,.12)' : 'rgba(57,208,187,.09)', textAlign: 'center' }}><Typography variant="h5" fontWeight={900}>{value.toLocaleString()}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box> }
