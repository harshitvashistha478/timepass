import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { enquiryAPI, researchAPI, developerAPI } from '../services/api'
import { useStore } from '../store/useStore'

// ─── Status messages ─────────────────────────────────────────────────────────
const ENQ_MSG = {
  pending:    '⏳ Query received...',
  routing:    '🧭 Enquiry Dept is routing your query...',
  dispatched: '✅ Dispatched to hub(s)',
  failed:     '❌ Routing failed',
}
const HUB_MSG = {
  pending:    '⏳ Queued...',
  processing: '⚡ Agents actively working...',
  completed:  '✅ Completed',
  failed:     '❌ Failed',
}

// ─── Markdown renderer ───────────────────────────────────────────────────────
function MdResult({ content }) {
  return (
    <ReactMarkdown components={{
      h1: ({ children }) => <h1 className="text-lg text-cyan-300 font-black mb-3 mt-1">{children}</h1>,
      h2: ({ children }) => <h2 className="text-base text-cyan-200 font-bold mt-5 mb-2">{children}</h2>,
      h3: ({ children }) => <h3 className="text-sm text-white font-semibold mt-4 mb-2">{children}</h3>,
      p:  ({ children }) => <p  className="text-cyan-100/80 text-sm leading-relaxed mb-3">{children}</p>,
      li: ({ children }) => <li className="text-cyan-100/80 text-sm mb-1">{children}</li>,
      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
      code: ({ children }) => (
        <code className="bg-violet-900/30 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      ),
      pre: ({ children }) => (
        <pre className="bg-black/40 border border-cyan-500/15 rounded-lg p-3 overflow-x-auto text-xs mb-3">
          {children}
        </pre>
      ),
    }}>
      {content}
    </ReactMarkdown>
  )
}

// ─── Hub result card ─────────────────────────────────────────────────────────
function ResultCard({ title, color, borderColor, result, status, onViewFull }) {
  if (!result && !status) return null
  return (
    <div className="border rounded-xl p-4" style={{ borderColor, background: `${color}08` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-bold" style={{ color }}>{title}</div>
        {result && (
          <button onClick={onViewFull}
            className="text-[10px] px-2 py-0.5 rounded-full transition-all hover:opacity-80"
            style={{ background: `${color}20`, color }}>
            VIEW FULL →
          </button>
        )}
      </div>
      {!result ? (
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            status === 'failed' ? 'bg-red-400' : 'animate-pulse'
          }`} style={{ background: status === 'failed' ? '#f87171' : color }} />
          <span style={{ color: `${color}bb` }}>{HUB_MSG[status] ?? status}</span>
        </div>
      ) : (
        <div className="text-xs line-clamp-3" style={{ color: `${color}99` }}>
          {result.substring(0, 120)}...
        </div>
      )}
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────
export default function OperationsPanel() {
  const user               = useStore(s => s.user)
  const isActive           = useStore(s => s.isActive)
  const setIsActive        = useStore(s => s.setIsActive)
  const setActiveHubs      = useStore(s => s.setActiveHubs)
  const addActivity        = useStore(s => s.addActivity)

  const researchResult     = useStore(s => s.researchResult)
  const setResearchResult  = useStore(s => s.setResearchResult)
  const devResult          = useStore(s => s.devResult)
  const setDevResult       = useStore(s => s.setDevResult)
  const setResearchSessionId = useStore(s => s.setResearchSessionId)
  const setDevSessionId    = useStore(s => s.setDevSessionId)

  const moveAgentsToEnquiry  = useStore(s => s.moveAgentsToEnquiry)
  const setAgentsRouting     = useStore(s => s.setAgentsRouting)
  const dispatchAgents       = useStore(s => s.dispatchAgents)
  const setAgentsWorking     = useStore(s => s.setAgentsWorking)
  const returnAgentsToHub    = useStore(s => s.returnAgentsToHub)
  const finishReturn         = useStore(s => s.finishReturn)

  const [tab, setTab]                 = useState('ENQUIRY')
  const [query, setQuery]             = useState('')
  const [enquiryStatus, setEnquiryStatus] = useState(null)
  const [enquiryReasoning, setEnquiryReasoning] = useState(null)
  const [enquiryHubs, setEnquiryHubs] = useState([])
  const [researchStatus, setResearchStatus] = useState(null)
  const [devStatus, setDevStatus]     = useState(null)
  const [error, setError]             = useState(null)

  const enqPoll = useRef(null)
  const resPoll = useRef(null)
  const devPoll = useRef(null)

  const stopAll = () => {
    clearInterval(enqPoll.current)
    clearInterval(resPoll.current)
    clearInterval(devPoll.current)
  }
  useEffect(() => () => stopAll(), [])

  // ── All done check ──────────────────────────────────────────────────────
  const checkDone = (hubs, latestRes, latestDev) => {
    const resDone = !hubs.includes('research')  || !!latestRes
    const devDone = !hubs.includes('developer') || !!latestDev
    if (resDone && devDone) {
      setIsActive(false)
      setActiveHubs([])
      returnAgentsToHub()
      addActivity('All missions complete. Agents returning.')
      setTimeout(() => {
        finishReturn()
        addActivity('Hub secured. Agents back on standby.')
      }, 3500)
    }
  }

  // ── Poll research ────────────────────────────────────────────────────────
  const pollResearch = (sessionId, hubs) => {
    resPoll.current = setInterval(async () => {
      try {
        const { data } = await researchAPI.getResult(sessionId)
        setResearchStatus(data.status)
        if (data.status === 'processing') addActivity('Research Lab: Agents processing...')
        if (data.status === 'completed') {
          clearInterval(resPoll.current)
          setResearchResult(data.result)
          addActivity('Research Lab: Report complete ✅')
          setTab('RESEARCH')
          checkDone(hubs, data.result, useStore.getState().devResult)
        }
        if (data.status === 'failed') {
          clearInterval(resPoll.current)
          addActivity('Research Lab: Mission failed ❌')
          checkDone(hubs, 'failed', useStore.getState().devResult)
        }
      } catch (e) { console.error('Research poll:', e) }
    }, 3000)
  }

  // ── Poll developer ───────────────────────────────────────────────────────
  const pollDeveloper = (sessionId, hubs) => {
    devPoll.current = setInterval(async () => {
      try {
        const { data } = await developerAPI.getResult(sessionId)
        setDevStatus(data.status)
        if (data.status === 'processing') addActivity('Dev Hub: Agents coding...')
        if (data.status === 'completed') {
          clearInterval(devPoll.current)
          setDevResult(data.result)
          addActivity('Dev Hub: Work complete ✅')
          if (!useStore.getState().researchResult) setTab('DEVELOPER')
          checkDone(hubs, useStore.getState().researchResult, data.result)
        }
        if (data.status === 'failed') {
          clearInterval(devPoll.current)
          addActivity('Dev Hub: Mission failed ❌')
          checkDone(hubs, useStore.getState().researchResult, 'failed')
        }
      } catch (e) { console.error('Dev poll:', e) }
    }, 3000)
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!query.trim() || isActive) return

    stopAll()
    setError(null)
    setResearchResult(null)
    setDevResult(null)
    setEnquiryStatus(null)
    setEnquiryReasoning(null)
    setEnquiryHubs([])
    setResearchStatus(null)
    setDevStatus(null)
    setIsActive(true)
    setTab('ENQUIRY')
    addActivity(`Query submitted: "${query}"`)

    try {
      const { data } = await enquiryAPI.submit(user.id, query)
      const enqId = data.enquiry_session_id
      setEnquiryStatus('pending')
      addActivity('Enquiry Dept received query. Agents mobilising...')

      moveAgentsToEnquiry()
      setTimeout(() => {
        setAgentsRouting()
        addActivity('Agents at Enquiry Dept — routing in progress.')
      }, 3200)

      // Poll enquiry
      enqPoll.current = setInterval(async () => {
        try {
          const { data: r } = await enquiryAPI.getResult(enqId)
          setEnquiryStatus(r.status)

          if (r.status === 'routing') {
            addActivity('Enquiry Dept: Analysing query intent...')
          }

          if (r.status === 'dispatched') {
            clearInterval(enqPoll.current)

            const hubs = r.routing_decision ?? []
            setEnquiryHubs(hubs)
            setActiveHubs(hubs)
            setEnquiryReasoning(r.reasoning)
            addActivity(`Routing → ${hubs.map(h => h.toUpperCase()).join(' + ')}`)
            addActivity(`Reason: ${r.reasoning}`)

            dispatchAgents(hubs)
            setTimeout(() => {
              setAgentsWorking()
              addActivity(`Agents deployed to: ${hubs.join(', ')}`)
            }, 3500)

            if (r.research_session_id) {
              setResearchSessionId(r.research_session_id)
              pollResearch(r.research_session_id, hubs)
            }
            if (r.dev_session_id) {
              setDevSessionId(r.dev_session_id)
              pollDeveloper(r.dev_session_id, hubs)
            }
          }

          if (r.status === 'failed') {
            clearInterval(enqPoll.current)
            setError('Enquiry routing failed.')
            setIsActive(false)
            setActiveHubs([])
            returnAgentsToHub()
            setTimeout(finishReturn, 3200)
          }
        } catch (e) { console.error('Enquiry poll:', e) }
      }, 2500)

    } catch (e) {
      console.error(e)
      setError('Failed to submit query to Enquiry Dept.')
      setIsActive(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-cyan-500/15" style={{ background: '#08041a' }}>
        <div className="text-[9px] tracking-[0.45em] text-cyan-400/55 mb-1">COMMAND CENTER</div>
        <div className="text-lg font-black tracking-[0.18em] text-white">OPERATIONS PANEL</div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-cyan-500/12" style={{ background: '#06031a' }}>
        {['ENQUIRY', 'RESEARCH', 'DEVELOPER'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 relative py-2.5 text-[9px] font-bold tracking-[0.25em] transition-all"
            style={{
              color: tab === t ? '#00e5ff' : '#3d2a5a',
              borderBottom: tab === t ? '2px solid #00e5ff' : '2px solid transparent',
              background: tab === t ? 'rgba(0,229,255,0.04)' : 'transparent',
            }}>
            {t}
            {/* Notification dot */}
            {t === 'RESEARCH' && researchResult && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400" />
            )}
            {t === 'DEVELOPER' && devResult && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#070318' }}>

        {/* ── ENQUIRY TAB ── */}
        {tab === 'ENQUIRY' && (
          <div className="p-4 space-y-4">

            {/* Input */}
            <div className="border border-cyan-500/18 rounded-xl p-4"
              style={{ background: 'rgba(0,229,255,0.02)' }}>
              <div className="text-[9px] tracking-[0.35em] text-cyan-400/60 mb-2.5">QUERY</div>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                disabled={isActive}
                placeholder="Ask anything — research a topic, build an app, analyse data..."
                className="w-full bg-black/20 border border-cyan-500/10 rounded-lg p-3 text-sm text-cyan-100 placeholder:text-cyan-300/22 outline-none resize-none focus:border-cyan-400/28 transition-all"
                style={{ fontFamily: 'inherit' }}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-[9px] text-cyan-300/35">⌘/CTRL + ENTER to dispatch</div>
                <button onClick={handleSubmit}
                  disabled={isActive || !query.trim()}
                  className="px-5 py-2 rounded-lg text-[10px] font-bold tracking-[0.25em] transition-all"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.02)' : 'rgba(0,229,255,0.1)',
                    border: `1px solid ${isActive ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.35)'}`,
                    color:  isActive ? '#3d2a5a' : '#00e5ff',
                    boxShadow: isActive ? 'none' : '0 0 16px rgba(0,229,255,0.14)',
                  }}>
                  {isActive ? 'ACTIVE...' : 'DISPATCH'}
                </button>
              </div>
            </div>

            {/* Enquiry status */}
            {enquiryStatus && (
              <div className="border border-cyan-500/18 rounded-xl p-3.5 bg-black/18">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    enquiryStatus === 'dispatched' ? 'bg-green-400'
                    : enquiryStatus === 'failed'   ? 'bg-red-400'
                    : 'bg-amber-400 animate-pulse'
                  }`} />
                  <div className="text-xs text-cyan-100">{ENQ_MSG[enquiryStatus]}</div>
                </div>
                {enquiryHubs.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {enquiryHubs.map(h => (
                      <span key={h} className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{
                          background: h === 'research' ? 'rgba(0,229,255,0.15)' : 'rgba(96,165,250,0.15)',
                          color:      h === 'research' ? '#00e5ff' : '#60a5fa',
                          border: `1px solid ${h === 'research' ? 'rgba(0,229,255,0.3)' : 'rgba(96,165,250,0.3)'}`,
                        }}>
                        {h.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                {enquiryReasoning && (
                  <div className="mt-2.5 text-[10px] text-cyan-300/55 italic leading-relaxed">
                    "{enquiryReasoning}"
                  </div>
                )}
              </div>
            )}

            {/* Hub live statuses */}
            {(researchStatus || devStatus) && (
              <div className="space-y-2">
                {researchStatus && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-cyan-500/14 text-xs">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      researchStatus === 'completed' ? 'bg-green-400'
                      : researchStatus === 'failed'  ? 'bg-red-400'
                      : 'bg-cyan-400 animate-pulse'
                    }`} />
                    <span className="text-cyan-400/60">Research Lab</span>
                    <span className="text-cyan-200">{HUB_MSG[researchStatus] ?? researchStatus}</span>
                  </div>
                )}
                {devStatus && (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-blue-500/14 text-xs">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      devStatus === 'completed' ? 'bg-green-400'
                      : devStatus === 'failed'  ? 'bg-red-400'
                      : 'bg-blue-400 animate-pulse'
                    }`} />
                    <span className="text-blue-400/60">Dev Hub</span>
                    <span className="text-blue-200">{HUB_MSG[devStatus] ?? devStatus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="border border-red-500/25 bg-red-500/8 rounded-xl p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Mini result previews side by side when both complete */}
            {(researchResult || devResult) && enquiryHubs.length === 2 && (
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  title="RESEARCH"
                  color="#00e5ff"
                  borderColor="rgba(0,229,255,0.25)"
                  result={researchResult}
                  status={researchStatus}
                  onViewFull={() => setTab('RESEARCH')}
                />
                <ResultCard
                  title="DEVELOPER"
                  color="#60a5fa"
                  borderColor="rgba(96,165,250,0.25)"
                  result={devResult}
                  status={devStatus}
                  onViewFull={() => setTab('DEVELOPER')}
                />
              </div>
            )}
            {/* Single result preview when only one hub */}
            {enquiryHubs.length === 1 && (
              <>
                {enquiryHubs[0] === 'research' && researchResult && (
                  <ResultCard
                    title="RESEARCH RESULT"
                    color="#00e5ff"
                    borderColor="rgba(0,229,255,0.25)"
                    result={researchResult}
                    status={researchStatus}
                    onViewFull={() => setTab('RESEARCH')}
                  />
                )}
                {enquiryHubs[0] === 'developer' && devResult && (
                  <ResultCard
                    title="DEVELOPER OUTPUT"
                    color="#60a5fa"
                    borderColor="rgba(96,165,250,0.25)"
                    result={devResult}
                    status={devStatus}
                    onViewFull={() => setTab('DEVELOPER')}
                  />
                )}
              </>
            )}

          </div>
        )}

        {/* ── RESEARCH TAB ── */}
        {tab === 'RESEARCH' && (
          <div className="p-4">
            {!researchResult ? (
              <div className="text-center py-14">
                <div className="text-4xl mb-3 opacity-30">🔬</div>
                <div className="text-cyan-400/40 text-sm">No research results yet</div>
                <div className="text-cyan-400/25 text-xs mt-1">Submit a query via the Enquiry tab</div>
              </div>
            ) : (
              <div className="border border-cyan-500/18 rounded-xl p-4"
                style={{ background: 'rgba(0,229,255,0.02)' }}>
                <div className="text-[9px] tracking-[0.4em] text-cyan-400/60 mb-4">RESEARCH REPORT</div>
                <MdResult content={researchResult} />
              </div>
            )}
          </div>
        )}

        {/* ── DEVELOPER TAB ── */}
        {tab === 'DEVELOPER' && (
          <div className="p-4">
            {!devResult ? (
              <div className="text-center py-14">
                <div className="text-4xl mb-3 opacity-30">💻</div>
                <div className="text-blue-400/40 text-sm">No developer output yet</div>
                <div className="text-blue-400/25 text-xs mt-1">Submit a coding query via the Enquiry tab</div>
              </div>
            ) : (
              <div className="border border-blue-500/18 rounded-xl p-4"
                style={{ background: 'rgba(96,165,250,0.02)' }}>
                <div className="text-[9px] tracking-[0.4em] text-blue-400/60 mb-4">DEVELOPER OUTPUT</div>
                <MdResult content={devResult} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}