import { AdminApp } from './components/AdminApp'
import { MedplumProvider } from '@medplum/react'
import { MedplumClient } from '@medplum/core'
import { MantineProvider } from '@mantine/core'
import { ThemeProvider } from './components/theme-provider'
// Import Mantine styles first, then Tailwind can override
import '@mantine/core/styles.css'
import './App.css'
import { config } from './config'

const medplum = new MedplumClient({
  baseUrl: config.api.baseUrl,
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
