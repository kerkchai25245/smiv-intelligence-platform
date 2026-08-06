import React from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { App } from './App'
import './styles.css'
import 'leaflet/dist/leaflet.css'

const theme = createTheme({ palette: { mode: 'dark', primary: { main: '#39d0bb' }, background: { default: '#07111e', paper: '#0d1c2a' } }, typography: { fontFamily: 'Inter, system-ui, sans-serif' }, shape: { borderRadius: 14 } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'not-configured'}>
      <ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
