import React from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { App } from './App'
import './styles.css'

const theme = createTheme({
  palette: { mode: 'dark', primary: { main: '#43d7c0' }, secondary: { main: '#8291ff' }, background: { default: '#06111d', paper: '#102331' }, success: { main: '#62d482' } },
  typography: { fontFamily: 'Inter, "Noto Sans Thai", system-ui, sans-serif', h3: { letterSpacing: '-.04em' }, h4: { letterSpacing: '-.03em' } },
  shape: { borderRadius: 16 },
  components: {
    MuiCard: { styleOverrides: { root: { border: '1px solid rgba(148,180,200,.12)', boxShadow: '0 18px 45px rgba(0,0,0,.18)', backgroundImage: 'none' } } },
    MuiTableHead: { styleOverrides: { root: { background: 'rgba(67,215,192,.07)' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 750 } } },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'not-configured'}>
      <ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
