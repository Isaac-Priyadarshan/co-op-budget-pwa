import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { ErrorBoundary } from './components/feedback/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <UserProvider>
          <AppShell />
        </UserProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
