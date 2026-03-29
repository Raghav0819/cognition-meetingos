import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getMeetings       = ()         => api.get('/meetings/')
export const getMeeting        = (id)       => api.get(`/meetings/${id}`)
export const getMeetingLogs    = (id)       => api.get(`/meetings/${id}/logs`)
export const uploadTranscript  = (data)     => api.post('/meetings/upload-transcript', data)
export const getAllTasks        = ()         => api.get('/tasks/')
export const getUserTasks      = (name)     => api.get(`/tasks/user/${name}`)
export const validateTask      = (id, data) => api.post(`/tasks/${id}/validate`, data)
export const updateTaskStatus  = (id, data) => api.patch(`/tasks/${id}/status`, data)