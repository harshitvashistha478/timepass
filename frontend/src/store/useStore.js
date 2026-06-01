import { create } from 'zustand'

const HUB_POSITION = { x: 140, y: 360 }
const RESEARCH_POSITION = { x: 800, y: 310 }

export const useStore = create((set, get) => ({

  // USER
  user: null,
  setUser: (user) => set({ user }),

  // AGENTS
  agents: [],

  setAgents: (agents) => {
    const current = get().agents
    const isResearching = get().isResearching

    // Never overwrite positions during an active mission
    if (isResearching) return

    const enhancedAgents = agents.map((agent, index) => {
      const existing = current.find(a => a.id === agent.id)
      const col = index % 3
      const row = Math.floor(index / 3)
      const spawnX = HUB_POSITION.x + col * 38
      const spawnY = HUB_POSITION.y + row * 48

      return {
        ...agent,
        x:            existing?.x            ?? spawnX,
        y:            existing?.y            ?? spawnY,
        targetX:      existing?.targetX      ?? spawnX,
        targetY:      existing?.targetY      ?? spawnY,
        currentZone:  existing?.currentZone  ?? 'hub',
        isMoving:     existing?.isMoving     ?? false,
        isWorking:    existing?.isWorking    ?? false,
        animationState: existing?.animationState ?? 'idle'
      }
    })

    set({ agents: enhancedAgents })
  },

  moveAgentsToResearch: () => {
    set((state) => ({
      agents: state.agents.map((agent, index) => ({
        ...agent,
        targetX: RESEARCH_POSITION.x + (index % 3) * 42,
        targetY: RESEARCH_POSITION.y + Math.floor(index / 3) * 50,
        currentZone: 'moving',
        isMoving: true,
        isWorking: false,
        animationState: 'walking'
      }))
    }))
  },

  setAgentsWorking: () => {
    set((state) => ({
      agents: state.agents.map((agent) => ({
        ...agent,
        currentZone: 'research',
        isMoving: false,
        isWorking: true,
        animationState: 'working'
      }))
    }))
  },

  returnAgentsToHub: () => {
    set((state) => ({
      agents: state.agents.map((agent, index) => ({
        ...agent,
        targetX: HUB_POSITION.x + (index % 3) * 38,
        targetY: HUB_POSITION.y + Math.floor(index / 3) * 48,
        currentZone: 'returning',
        isMoving: true,
        isWorking: false,
        animationState: 'walking'
      }))
    }))
  },

  finishReturn: () => {
    set((state) => ({
      agents: state.agents.map((agent, index) => ({
        ...agent,
        // Restore exact spawn position so they don't drift
        targetX: HUB_POSITION.x + (index % 3) * 38,
        targetY: HUB_POSITION.y + Math.floor(index / 3) * 48,
        currentZone: 'hub',
        isMoving: false,
        isWorking: false,
        animationState: 'idle'
      }))
    }))
  },

  // RESEARCH
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),

  researchResult: null,
  setResearchResult: (result) => set({ researchResult: result }),

  isResearching: false,
  setIsResearching: (v) => set({ isResearching: v }),

  // ACTIVITY
  activityLog: [],

  addActivity: (message) => set((state) => ({
    activityLog: [
      {
        id: Date.now(),
        message,
        time: new Date().toLocaleTimeString()
      },
      ...state.activityLog.slice(0, 19)
    ]
  }))
}))