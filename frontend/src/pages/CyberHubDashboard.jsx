import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { hubAPI } from '../services/api'
import SimulationWorld from '../components/simulation/SimulationWorld'
import OperationsPanel from '../components/OperationsPanel'
import ActivityLog from '../components/ActivityLog'

export default function CyberHubDashboard() {
  const user       = useStore(s => s.user)
  const setAgents  = useStore(s => s.setAgents)
  const addActivity = useStore(s => s.addActivity)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await hubAPI.getAllAgents()
        setAgents(data)
      } catch (e) {
        console.error(e)
      }
    }

    load()
    addActivity('Cyber Hub online.')

    const interval = setInterval(() => {
      // Only refresh agents when no mission is running
      if (!useStore.getState().isActive) load()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen text-white overflow-hidden"
      style={{ background: '#040210', fontFamily: '"JetBrains Mono", monospace' }}>

      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6"
        style={{
          background: '#07031a',
          borderBottom: '1px solid rgba(0,229,255,0.12)',
        }}>
        <div className="font-black text-xl tracking-[0.45em]"
          style={{ color: '#00e5ff', fontFamily: '"Orbitron", monospace',
                   textShadow: '0 0 20px rgba(0,229,255,0.4)' }}>
          CYBER HUB
        </div>
        <div className="text-xs" style={{ color: 'rgba(0,229,255,0.45)' }}>
          Operator: {user?.name}
        </div>
      </header>

      {/* Main layout */}
      <div className="grid grid-cols-[1fr_380px] h-[calc(100vh-56px)]">

        {/* Left — simulation world */}
        <div className="p-4 overflow-hidden">
          <SimulationWorld />
        </div>

        {/* Right — panel + activity log */}
        <div className="flex flex-col overflow-hidden"
          style={{ borderLeft: '1px solid rgba(0,229,255,0.1)', background: '#06021a' }}>

          {/* Operations panel takes most height */}
          <div className="flex-1 overflow-hidden min-h-0">
            <OperationsPanel />
          </div>

          {/* Activity log at bottom, scrollable, max height */}
          <div className="max-h-44 overflow-y-auto flex-shrink-0"
            style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}>
            <ActivityLog />
          </div>

        </div>
      </div>
    </div>
  )
}