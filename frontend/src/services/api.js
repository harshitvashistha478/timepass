import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

export const userAPI = {
  createTestUser: () => api.post('/users/create-test-user'),
  getUser: (id) => api.get(`/users/${id}`)
}

export const enquiryAPI = {
  submit: (userId, query) => api.post('/enquiry/submit', { user_id: userId, query }),
  getResult: (sessionId) => api.get(`/enquiry/${sessionId}`),
  getHistory: (userId) => api.get(`/enquiry/history/${userId}`)
}

export const researchAPI = {
  submit: (userId, topic) => api.post('/research/submit', { user_id: userId, topic }),
  getResult: (sessionId) => api.get(`/research/${sessionId}`),
  getHistory: (userId) => api.get(`/research/history/${userId}`)
}

export const developerAPI = {
  submit: (userId, query) => api.post('/developer/submit', { user_id: userId, query }),
  getResult: (sessionId) => api.get(`/developer/${sessionId}`),
  getHistory: (userId) => api.get(`/developer/history/${userId}`)
}

export const hubAPI = {
  getAllAgents: () => api.get('/hub/agents')
}