import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DataProvider } from './data/DataContext'
import { useData } from './data/useData'
import Standings from './pages/Standings'
import ErrorBanner from './components/ErrorBanner'

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <InnerApp />
      </DataProvider>
    </BrowserRouter>
  )
}

const InnerApp: React.FC = () => {
  const { loadError } = useData()
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img
            src="/assets/logo.svg"
            onError={(event) => {
              event.currentTarget.src = '/favicon.svg'
            }}
            alt="Family World Cup Predictor logo"
            height={44}
          />
          <div>
            <h1>2026 World Cup Predictions</h1>
          </div>
        </div>
        <nav />
      </header>
      <div style={{ padding: '0 20px' }}>
        <ErrorBanner message={loadError} />
      </div>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Standings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
