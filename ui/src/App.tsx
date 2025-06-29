import { AdminApp } from './components/AdminApp'
import { MedplumProvider } from '@medplum/react'
import { MedplumClient } from '@medplum/core'
import './App.css'

const medplum = new MedplumClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8445',
});

function App() {
  return (
    <MedplumProvider medplum={medplum}>
      <AdminApp />
    </MedplumProvider>
  )
}

export default App
