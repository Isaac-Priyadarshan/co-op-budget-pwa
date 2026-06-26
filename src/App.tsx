import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { ErrorBoundary } from './components/feedback/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { EntryScreen } from './screens/entry/EntryScreen'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <UserProvider>
          <Routes>
            <Route path="/entry/:type/:categoryId" element={<EntryScreen />} />
            <Route path="*" element={<AppShell />} />
          </Routes>
        </UserProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
