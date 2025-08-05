import { AdminApp } from './components/AdminApp'
import { MedplumProvider } from '@medplum/react'
import { MedplumClient } from '@medplum/core'
import { MantineProvider } from '@mantine/core'
import { ThemeProvider } from './components/theme-provider'
// Import Mantine styles first, then Tailwind can override
import '@mantine/core/styles.css'
import './App.css'

const medplum = new MedplumClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8445',
});

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="proxy-smart-theme">
      <MantineProvider>
        <MedplumProvider medplum={medplum}>
          <AdminApp />
        </MedplumProvider>
      </MantineProvider>
    </ThemeProvider>
  )
}

export default App
