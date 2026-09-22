import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Backdrop from './components/Backdrop'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Library from './pages/Library'
import Landing from './pages/Landing'
import Collections from './pages/Collections'
import Archive from './pages/Archive'
import Trash from './pages/Trash'
import Import from './pages/Import'

function Protected({ children }) {
  const { user, demo, loading } = useAuth()
  if (loading) return null
  return user || demo ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <>
      <Backdrop />
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/app"
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route index element={<Library />} />
            <Route path="c/:collectionId" element={<Library />} />
            <Route path="tag/:tagName" element={<Library />} />
            <Route path="collections" element={<Collections />} />
            <Route path="archive" element={<Archive />} />
            <Route path="trash" element={<Trash />} />
            <Route path="import" element={<Import />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}
