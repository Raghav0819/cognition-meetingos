import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage       from './pages/LandingPage'
import Login             from './pages/Login'
import PMDashboard       from './pages/PMDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import ManagerDashboard  from './pages/ManagerDashboard'
import MeetingDetail     from './pages/MeetingDetail'

function ProtectedRoute({ children }) {
  const { user, userProfile } = useAuth()
  if (!user || !userProfile) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"            element={<LandingPage />} />
      <Route path="/login"       element={<Login />} />
      <Route path="/pm"          element={<ProtectedRoute><PMDashboard /></ProtectedRoute>} />
      <Route path="/employee"    element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/manager"     element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
      <Route path="/meeting/:id" element={<ProtectedRoute><MeetingDetail /></ProtectedRoute>} />
      <Route path="*"            element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
