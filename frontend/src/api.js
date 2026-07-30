import axios from 'axios'
import { auth } from '../firebase'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'https://cognition-meetingos.onrender.com' })

// Attach Firebase Auth Token to every request to secure endpoints
api.interceptors.request.use(async config => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken()
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export const getMeetings       = ()         => api.get('/meetings/')
export const getMeeting        = (id)       => api.get(`/meetings/${id}`)
export const getMeetingLogs    = (id)       => api.get(`/meetings/${id}/logs`)
export const uploadTranscript  = (data)     => api.post('/meetings/upload-transcript', data)
export const getAllTasks        = ()         => api.get('/tasks/')
export const getUserTasks      = (name)     => api.get(`/tasks/user/${name}`)
export const validateTask      = (id, data) => api.post(`/tasks/${id}/validate`, data)
export const updateTaskStatus  = (id, data) => api.patch(`/tasks/${id}/status`, data)
export const checkOverdueTasks = ()         => api.post('/tasks/check-overdue')
export const regenerateSummary = (id)       => api.post(`/meetings/${id}/regenerate-summary`)
export const chatMeeting       = (id, data) => api.post(`/meetings/${id}/chat`, data)
