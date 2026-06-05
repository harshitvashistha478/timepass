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


export const ragAPI = {
  // Sessions
  createSession:  (userId, name)       => api.post('/rag/sessions', { user_id: userId, name }),
  listSessions:   (userId)             => api.get(`/rag/sessions/user/${userId}`),
  getSession:     (sessionId)          => api.get(`/rag/sessions/${sessionId}`),
  deleteSession:  (sessionId)          => api.delete(`/rag/sessions/${sessionId}`),

  // Documents
  uploadDocuments: (sessionId, files) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return api.post(`/rag/sessions/${sessionId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  listDocuments:  (sessionId)          => api.get(`/rag/sessions/${sessionId}/documents`),
  getDocument:    (sessionId, docId)   => api.get(`/rag/sessions/${sessionId}/documents/${docId}`),
  deleteDocument: (sessionId, docId)   => api.delete(`/rag/sessions/${sessionId}/documents/${docId}`),

  // Chat
  chat:        (sessionId, query)   => api.post(`/rag/sessions/${sessionId}/chat`, { query }),
  getMessages: (sessionId)          => api.get(`/rag/sessions/${sessionId}/messages`),
}


export const hubAPI = {
  getAllAgents: () => api.get('/hub/agents')
}