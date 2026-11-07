import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import ReportPage from './pages/ReportPage'
import SchemaPage from './pages/SchemaPage'
import { ConnectionProvider } from './context/ConnectionContext'
import { ChatProvider } from './context/ChatContext'
import ErrorBoundary from './components/ui/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ConnectionProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/schema" element={<SchemaPage />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  )
}
