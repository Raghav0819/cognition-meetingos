import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PMDashboard       from './pages/PMDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import ManagerDashboard  from './pages/ManagerDashboard'
import MeetingDetail     from './pages/MeetingDetail'
import Login             from './pages/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Login />} />
        <Route path="/pm"            element={<PMDashboard />} />
        <Route path="/employee"      element={<EmployeeDashboard />} />
        <Route path="/manager"       element={<ManagerDashboard />} />
        <Route path="/meeting/:id"   element={<MeetingDetail />} />
        <Route path="*"              element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}