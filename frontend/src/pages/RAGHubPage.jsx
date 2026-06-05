import { useState, useEffect, useRef, useCallback } from 'react'
import { ragAPI } from '../services/api'
import { useStore } from '../store/useStore'

// ── Tiny helpers ──────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString()

function StatusPill({ status }) {
  const map = {
    processing: { label: 'PROCESSING', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    ready:      { label: 'READY',      color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
    failed:     { label: 'FAILED',     color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  },
  }
  const s = map[status] ?? { label: status.toUpperCase(), color: '#7aa3c4', bg: 'rgba(122,163,196,0.10)' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  )
}

function Spinner({ size = 14, color = '#06b6d4' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}30`, borderTopColor: color,
      borderRadius: '50%', animation: 'rag-spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

function FileIcon({ type }) {
  const icons = { pdf: '📄', docx: '📝', doc: '📝', md: '📋', markdown: '📋', txt: '📃' }
  return <span style={{ fontSize: 16 }}>{icons[type] ?? '📁'}</span>
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-10" style={{ opacity: 0.55 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div className="text-sm font-semibold mb-1" style={{ color: '#e8f4ff', fontFamily: '"Syne",sans-serif' }}>{title}</div>
      <div className="text-xs leading-relaxed" style={{ color: '#5a7a9a', maxWidth: 220 }}>{sub}</div>
    </div>
  )
}

// ── Session sidebar ───────────────────────────────────────────────────────────

function SessionSidebar({ sessions, activeId, onSelect, onNew, loading }) {
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: '"DM Sans",sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(26,58,92,0.6)' }}>
        <div className="text-xs tracking-widest mb-2" style={{ color: '#06b6d4', opacity: 0.6 }}>RAG WORKSPACES</div>
        <button onClick={onNew}
          className="w-full py-2 rounded-xl text-xs font-bold tracking-widest transition-all"
          style={{
            background: 'rgba(6,182,212,0.10)',
            border: '1px solid rgba(6,182,212,0.30)',
            color: '#06b6d4',
          }}>
          + NEW WORKSPACE
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        )}
        {!loading && sessions.length === 0 && (
          <EmptyState icon="📂" title="No workspaces yet" sub="Create one to start uploading documents." />
        )}
        {sessions.map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)}
            className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
            style={{
              background:  activeId === s.id ? 'rgba(6,182,212,0.12)' : 'transparent',
              border:      `1px solid ${activeId === s.id ? 'rgba(6,182,212,0.35)' : 'transparent'}`,
              color:       activeId === s.id ? '#e8f4ff' : '#7aa3c4',
            }}>
            <div className="text-sm font-medium truncate">{s.name}</div>
            <div className="text-xs mt-0.5" style={{ color: activeId === s.id ? '#5a8a9a' : '#3d6080' }}>
              {new Date(s.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── New workspace modal ───────────────────────────────────────────────────────

function NewWorkspaceModal({ onConfirm, onCancel, loading }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(2,8,20,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#071628', border: '1px solid rgba(6,182,212,0.25)', boxShadow: '0 0 60px rgba(6,182,212,0.12)' }}
        onClick={e => e.stopPropagation()}>
        <div className="text-base font-bold mb-1" style={{ color: '#e8f4ff', fontFamily: '"Syne",sans-serif' }}>
          New Workspace
        </div>
        <p className="text-xs mb-4" style={{ color: '#5a7a9a' }}>
          A workspace holds your documents and chat history.
        </p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()) }}
          placeholder="e.g. Project Research, Legal Docs…"
          className="w-full px-4 py-2.5 rounded-xl text-sm mb-4 outline-none"
          style={{
            background: 'rgba(13,32,64,0.7)',
            border: '1px solid rgba(6,182,212,0.25)',
            color: '#e8f4ff',
            fontFamily: '"DM Sans",sans-serif',
          }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,58,92,0.8)', color: '#5a7a9a' }}>
            CANCEL
          </button>
          <button onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim() || loading}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: name.trim() ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.04)',
              border: `1px solid ${name.trim() ? 'rgba(6,182,212,0.4)' : 'rgba(6,182,212,0.15)'}`,
              color: name.trim() ? '#06b6d4' : '#3d6080',
              cursor: !name.trim() || loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? <Spinner size={12} /> : 'CREATE ↗'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({ onUpload, uploading }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    if (!files || !files.length) return
    onUpload(Array.from(files))
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      onClick={() => !uploading && inputRef.current?.click()}
      className="rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
      style={{
        background:  dragging ? 'rgba(6,182,212,0.08)' : 'rgba(13,32,64,0.5)',
        border:      `1.5px dashed ${dragging ? '#06b6d4' : 'rgba(26,58,92,0.9)'}`,
        minHeight:   100,
        boxShadow:   dragging ? '0 0 24px rgba(6,182,212,0.15)' : 'none',
        transition:  'all 0.2s ease',
        opacity:     uploading ? 0.6 : 1,
        cursor:      uploading ? 'not-allowed' : 'pointer',
      }}>
      {uploading ? (
        <>
          <Spinner size={20} />
          <span className="text-xs" style={{ color: '#5a7a9a' }}>Uploading & indexing…</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 24 }}>☁</span>
          <div className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>
            Drop files or click to upload
          </div>
          <div className="text-xs" style={{ color: '#3d6080' }}>
            PDF · DOCX · MD · TXT — up to 50 MB each
          </div>
        </>
      )}
      <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.doc,.md,.markdown,.txt"
        className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  )
}

// ── Document list ─────────────────────────────────────────────────────────────

function DocumentList({ docs, onDelete, deletingId }) {
  if (!docs.length) return (
    <EmptyState icon="📭" title="No documents yet" sub="Upload files above to start chatting with your documents." />
  )
  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(7,22,40,0.7)', border: '1px solid rgba(26,58,92,0.5)' }}>
          <FileIcon type={doc.file_type} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: '#e8f4ff' }}>{doc.filename}</div>
            <div className="text-xs mt-0.5" style={{ color: '#3d6080' }}>
              {doc.status === 'ready' ? `${fmt(doc.chunk_count)} chunks · ${fmt(doc.char_count)} chars` : 'Processing…'}
            </div>
          </div>
          <StatusPill status={doc.status} />
          <button
            onClick={() => onDelete(doc.id)}
            disabled={deletingId === doc.id}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: 11, cursor: 'pointer',
              opacity: deletingId === doc.id ? 0.4 : 1,
            }}>
            {deletingId === doc.id ? '…' : '✕'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Chat message ──────────────────────────────────────────────────────────────

function ChatMessage({ msg, expandedChunks, onToggleChunks }) {
  const isUser = msg.role === 'user'
  const metrics = msg.evaluation_metrics
  const chunks = msg.retrieved_chunks ?? []

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1"
          style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', fontSize: 13 }}>
          🤖
        </div>
      )}

      <div className="max-w-[78%] flex flex-col gap-2">
        {/* Bubble */}
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={
            isUser
              ? { background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#e8f4ff', borderBottomRightRadius: 4 }
              : { background: 'rgba(7,22,40,0.9)',    border: '1px solid rgba(26,58,92,0.6)',   color: '#c8dff2', borderBottomLeftRadius: 4 }
          }>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: '"DM Sans",sans-serif', margin: 0 }}>{msg.content}</pre>
        </div>

        {/* Metadata row for assistant messages */}
        {!isUser && (chunks.length > 0 || metrics) && (
          <div className="flex items-center gap-3 px-1">
            {chunks.length > 0 && (
              <button onClick={() => onToggleChunks(msg.id)}
                className="text-xs flex items-center gap-1.5 transition-all"
                style={{ color: expandedChunks ? '#06b6d4' : '#3d6080' }}>
                <span style={{ fontSize: 10 }}>{expandedChunks ? '▼' : '▶'}</span>
                {chunks.length} source{chunks.length !== 1 ? 's' : ''}
              </button>
            )}
            {metrics && typeof metrics === 'object' && (
              <div className="flex items-center gap-2">
                {Object.entries(metrics).slice(0, 3).map(([k, v]) => (
                  v != null && (
                    <span key={k} className="text-xs"
                      style={{ color: '#3d6080' }}>
                      {k.replace(/_/g, ' ')}: <span style={{ color: '#5a8a9a' }}>{typeof v === 'number' ? v.toFixed(2) : v}</span>
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Source chunks */}
        {!isUser && expandedChunks && chunks.length > 0 && (
          <div className="space-y-2 pl-1">
            {chunks.map((c, i) => (
              <div key={c.id ?? i} className="rounded-xl p-3"
                style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold" style={{ color: '#06b6d4', opacity: 0.7 }}>
                    SOURCE {i + 1}
                  </span>
                  <span className="text-xs truncate" style={{ color: '#3d6080' }}>{c.filename}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#5a7a9a' }}>
                  {(c.compressed_text || c.text || '').substring(0, 280)}
                  {(c.compressed_text || c.text || '').length > 280 ? '…' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13 }}>
          👤
        </div>
      )}
    </div>
  )
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({ sessionId, hasReadyDocs }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState(null)
  const [expandedChunks, setExpandedChunks] = useState({})
  const bottomRef = useRef(null)

  // Load history when session changes
  useEffect(() => {
    if (!sessionId) return
    setMessages([])
    setError(null)
    ragAPI.getMessages(sessionId)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleChunks = (id) => setExpandedChunks(prev => ({ ...prev, [id]: !prev[id] }))

  const handleSend = async () => {
    if (!input.trim() || sending || !hasReadyDocs) return
    const q = input.trim()
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, role: 'user', content: q }])
    setSending(true)
    try {
      const { data } = await ragAPI.chat(sessionId, q)
      setMessages(prev => [...prev, {
        id: data.message_id,
        role: 'assistant',
        content: data.answer,
        retrieved_chunks: data.retrieved_chunks,
        evaluation_metrics: data.evaluation_metrics,
        expanded_queries: data.expanded_queries,
      }])
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to get answer. Try again.')
      setMessages(prev => prev.filter(m => !m.id.startsWith('tmp-')))
    } finally {
      setSending(false)
    }
  }

  if (!sessionId) return (
    <EmptyState icon="💬" title="Select a workspace" sub="Pick or create a workspace on the left to start chatting." />
  )

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center" style={{ opacity: 0.5 }}>
            <span style={{ fontSize: 32, marginBottom: 12 }}>🔍</span>
            <div className="text-sm font-semibold mb-1" style={{ color: '#e8f4ff', fontFamily: '"Syne",sans-serif' }}>
              Ready to answer
            </div>
            <div className="text-xs" style={{ color: '#5a7a9a', maxWidth: 220 }}>
              {hasReadyDocs
                ? 'Ask anything about your documents. The RAG pipeline will find relevant passages.'
                : 'Upload at least one document and wait for it to be indexed before chatting.'}
            </div>
          </div>
        )}
        {messages.map(m => (
          <ChatMessage key={m.id} msg={m}
            expandedChunks={!!expandedChunks[m.id]}
            onToggleChunks={toggleChunks} />
        ))}
        {sending && (
          <div className="flex justify-start gap-3">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', fontSize: 13 }}>
              🤖
            </div>
            <div className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{ background: 'rgba(7,22,40,0.9)', border: '1px solid rgba(26,58,92,0.6)', borderBottomLeftRadius: 4 }}>
              <Spinner size={12} />
              <span className="text-xs" style={{ color: '#5a7a9a' }}>Searching documents…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs px-4 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(26,58,92,0.5)' }}>
        {!hasReadyDocs && (
          <div className="mb-2 text-xs px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <span>⚠</span> Upload and index at least one document before chatting.
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={sending || !hasReadyDocs}
            placeholder={hasReadyDocs ? 'Ask a question… (Enter to send)' : 'Index a document first…'}
            rows={2}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: 'rgba(13,32,64,0.6)',
              border: '1px solid rgba(26,58,92,0.7)',
              color: '#e8f4ff',
              fontFamily: '"DM Sans",sans-serif',
              opacity: (!hasReadyDocs || sending) ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !hasReadyDocs}
            className="h-10 px-4 rounded-xl text-xs font-bold tracking-widest transition-all flex items-center gap-2"
            style={{
              background: (input.trim() && !sending && hasReadyDocs) ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.04)',
              border: `1px solid ${(input.trim() && !sending && hasReadyDocs) ? 'rgba(6,182,212,0.4)' : 'rgba(6,182,212,0.12)'}`,
              color: (input.trim() && !sending && hasReadyDocs) ? '#06b6d4' : '#3d6080',
              cursor: (!input.trim() || sending || !hasReadyDocs) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}>
            {sending ? <Spinner size={12} /> : 'SEND ↗'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main RAG Hub Page ─────────────────────────────────────────────────────────

export default function RAGHubPage() {
  const user = useStore(s => s.user)

  const [sessions, setSessions]         = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)

  const [docs, setDocs]         = useState([])
  const [docsLoading, setDocsLoading]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [deletingDocId, setDeletingDocId] = useState(null)

  const pollRef = useRef(null)

  // ── Load sessions ──────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await ragAPI.listSessions(user.id)
      setSessions(data)
    } catch (e) { console.error(e) }
    finally { setSessionsLoading(false) }
  }, [user])

  useEffect(() => { loadSessions() }, [loadSessions])

  // ── Load documents when session changes ───────────────────────────────────
  const loadDocs = useCallback(async (sid) => {
    if (!sid) return
    setDocsLoading(true)
    try {
      const { data } = await ragAPI.listDocuments(sid)
      setDocs(data)
    } catch (e) { console.error(e) }
    finally { setDocsLoading(false) }
  }, [])

  useEffect(() => {
    clearInterval(pollRef.current)
    if (!activeSessionId) { setDocs([]); return }
    loadDocs(activeSessionId)

    // Poll every 3s while any doc is processing
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await ragAPI.listDocuments(activeSessionId)
        setDocs(data)
        if (data.every(d => d.status !== 'processing')) clearInterval(pollRef.current)
      } catch (e) { clearInterval(pollRef.current) }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [activeSessionId, loadDocs])

  // ── Create session ─────────────────────────────────────────────────────────
  const handleCreateSession = async (name) => {
    setCreatingSession(true)
    try {
      const { data } = await ragAPI.createSession(user.id, name)
      setSessions(prev => [data, ...prev])
      setActiveSessionId(data.id)
      setShowNewModal(false)
    } catch (e) { console.error(e) }
    finally { setCreatingSession(false) }
  }

  // ── Upload documents ───────────────────────────────────────────────────────
  const handleUpload = async (files) => {
    if (!activeSessionId) return
    setUploading(true)
    setUploadError(null)
    try {
      const { data } = await ragAPI.uploadDocuments(activeSessionId, files)
      setDocs(prev => [...data, ...prev])
    } catch (e) {
      setUploadError(e.response?.data?.detail ?? 'Upload failed. Check file type and size.')
    } finally { setUploading(false) }
  }

  // ── Delete document ────────────────────────────────────────────────────────
  const handleDeleteDoc = async (docId) => {
    setDeletingDocId(docId)
    try {
      await ragAPI.deleteDocument(activeSessionId, docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch (e) { console.error(e) }
    finally { setDeletingDocId(null) }
  }

  const hasReadyDocs = docs.some(d => d.status === 'ready')

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ fontFamily: '"DM Sans",sans-serif', height: 'calc(100vh - 56px)' }}>

      {/* ── Sidebar: sessions ── */}
      <div className="w-56 flex-shrink-0 flex flex-col"
        style={{ borderRight: '1px solid rgba(26,58,92,0.5)', background: 'rgba(7,22,40,0.5)' }}>
        <SessionSidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={setActiveSessionId}
          onNew={() => setShowNewModal(true)}
          loading={sessionsLoading}
        />
      </div>

      {/* ── Main content ── */}
      {!activeSessionId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ maxWidth: 320 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗄️</div>
            <div className="text-xl font-bold mb-2" style={{ color: '#e8f4ff', fontFamily: '"Syne",sans-serif' }}>
              RAG Master Hub
            </div>
            <p className="text-sm mb-6" style={{ color: '#5a7a9a', lineHeight: 1.65 }}>
              Upload your documents, then ask questions in natural language.
              The pipeline uses hybrid search, reranking, and contextual compression to find precise answers.
            </p>
            <button onClick={() => setShowNewModal(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold tracking-widest transition-all"
              style={{
                background: 'rgba(6,182,212,0.12)',
                border: '1px solid rgba(6,182,212,0.35)',
                color: '#06b6d4',
                boxShadow: '0 0 24px rgba(6,182,212,0.12)',
              }}>
              + CREATE WORKSPACE
            </button>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {['Hybrid Search', 'HyDE Expansion', 'Cross-Encoder Reranking', 'MMR Diversity', 'Multi-turn Chat'].map(f => (
                <span key={f} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', color: '#5a8a9a' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* Documents panel */}
          <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
            style={{ borderRight: '1px solid rgba(26,58,92,0.5)', background: 'rgba(3,11,24,0.4)' }}>

            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(26,58,92,0.5)' }}>
              <div className="text-xs tracking-widest mb-0.5" style={{ color: '#06b6d4', opacity: 0.6 }}>DOCUMENTS</div>
              <div className="text-sm font-bold" style={{ color: '#e8f4ff', fontFamily: '"Syne",sans-serif' }}>
                {sessions.find(s => s.id === activeSessionId)?.name ?? 'Workspace'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <UploadZone onUpload={handleUpload} uploading={uploading} />

              {uploadError && (
                <div className="text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  ⚠ {uploadError}
                </div>
              )}

              {docsLoading ? (
                <div className="flex items-center justify-center py-6"><Spinner /></div>
              ) : (
                <DocumentList docs={docs} onDelete={handleDeleteDoc} deletingId={deletingDocId} />
              )}
            </div>

            {/* Doc count footer */}
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(26,58,92,0.4)', background: 'rgba(7,22,40,0.6)' }}>
              <span className="text-xs" style={{ color: '#3d6080' }}>
                {docs.length} file{docs.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs" style={{ color: hasReadyDocs ? '#10b981' : '#f59e0b' }}>
                {hasReadyDocs ? `${docs.filter(d => d.status === 'ready').length} ready` : 'indexing…'}
              </span>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(26,58,92,0.5)', background: 'rgba(7,22,40,0.4)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: hasReadyDocs ? '#10b981' : '#f59e0b' }} />
              <span className="text-xs tracking-widest" style={{ color: '#5a7a9a' }}>CHAT</span>
              {hasReadyDocs && (
                <span className="text-xs ml-auto" style={{ color: '#3d6080' }}>
                  Pipeline: HyDE → Hybrid Search → Rerank → Answer
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel sessionId={activeSessionId} hasReadyDocs={hasReadyDocs} />
            </div>
          </div>
        </div>
      )}

      {/* New workspace modal */}
      {showNewModal && (
        <NewWorkspaceModal
          onConfirm={handleCreateSession}
          onCancel={() => setShowNewModal(false)}
          loading={creatingSession}
        />
      )}

      <style>{`
        @keyframes rag-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}