import { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Group } from 'react-konva'
import { useStore } from '../../store/useStore'

const W = 1100
const H = 580
const HUB = { x: 80, y: 180, w: 240, h: 240 }
const LAB = { x: 720, y: 160, w: 280, h: 280 }
const PRIMARY = '#a855f7'
const GREEN = '#34d399'

function useAnimatedAgents(agents) {
  const posRef = useRef({})
  const [positions, setPositions] = useState({})

  // Initialize positions when agents first load or count changes
  useEffect(() => {
    agents.forEach(agent => {
      if (!posRef.current[agent.id]) {
        posRef.current[agent.id] = {
          x: agent.x ?? 140,
          y: agent.y ?? 360
        }
      }
    })
    setPositions({ ...posRef.current })
  }, [agents.length])  // fires when agents are added/removed

  useEffect(() => {
    let frame
    const animate = () => {
      const next = { ...posRef.current }

      agents.forEach(agent => {
        const cur = posRef.current[agent.id] ?? {
          x: agent.x ?? 140,
          y: agent.y ?? 360
        }
        const tx = agent.targetX ?? agent.x ?? 140
        const ty = agent.targetY ?? agent.y ?? 360
        const dx = tx - cur.x
        const dy = ty - cur.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 1) {
          const speed = Math.min(2.5, dist * 0.04)
          next[agent.id] = {
            x: cur.x + (dx / dist) * speed,
            y: cur.y + (dy / dist) * speed
          }
        } else {
          next[agent.id] = { x: tx, y: ty }
        }
      })

      posRef.current = next
      setPositions({ ...next })  // always update, not just when changed
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [agents])

  return positions
}
const AGENT_COLORS = {
  junior: '#34d399',
  mid: '#60a5fa',
  senior: '#a855f7',
  expert: '#fbbf24',
}

function AgentNode({ x, y, agent, tick }) {
  const color = AGENT_COLORS[agent.skill_level] || PRIMARY
  const bobY = agent.isMoving ? Math.sin(tick * 0.15) * 3 : 
               agent.isWorking ? Math.sin(tick * 0.08) * 2 : 0

  return (
    <Group x={x} y={y + bobY}>
      {/* Glow shadow */}
      <Circle radius={14} fill={color} opacity={0.15} />
      {/* Body */}
      <Rect x={-10} y={2} width={20} height={20} cornerRadius={8} fill={color} opacity={0.9} />
      {/* Head */}
      <Circle y={-4} radius={11} fill={color} />
      {/* Eyes */}
      <Circle x={-4} y={-5} radius={3} fill="white" />
      <Circle x={4} y={-5} radius={3} fill="white" />
      <Circle x={-3} y={-4} radius={1.5} fill="#111" />
      <Circle x={5} y={-4} radius={1.5} fill="#111" />
      {/* Name */}
      <Text
        text={agent.name?.split(' ')[0]}
        x={-20} y={24}
        width={40}
        align="center"
        fontSize={8}
        fill={color}
      />
      {/* Working sparkle */}
      {agent.isWorking && (
        <Text text="✦" x={8} y={-18} fontSize={10} fill={color} opacity={0.8} />
      )}
    </Group>
  )
}

function BuildingNode({ x, y, w, h, title, subtitle, isActive, onClick }) {
  const color = isActive ? PRIMARY : '#3d2060'
  const glowOpacity = isActive ? 0.35 : 0.1

  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick}
      style={{ cursor: 'pointer' }}>
      {/* Outer glow */}
      <Rect width={w} height={h} cornerRadius={14}
        fill={PRIMARY} opacity={glowOpacity}
        shadowColor={PRIMARY} shadowBlur={isActive ? 40 : 10} shadowOpacity={0.6} />
      {/* Main body */}
      <Rect width={w} height={h} cornerRadius={14}
        fill="#0f0820" stroke={color} strokeWidth={1.5} />
      {/* Top accent */}
      <Rect width={w} height={3} cornerRadius={[14, 14, 0, 0]}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: w, y: 0 }}
        fillLinearGradientColorStops={[0, 'transparent', 0.5, PRIMARY, 1, 'transparent']}
      />
      {/* Corner brackets */}
      {[[0,0],[w-16,0],[0,h-16],[w-16,h-16]].map(([bx, by], i) => (
        <Group key={i} x={bx+4} y={by+4}>
          <Rect width={12} height={2} fill={PRIMARY} opacity={0.8} />
          <Rect width={2} height={12} fill={PRIMARY} opacity={0.8} />
        </Group>
      ))}
      {/* Title */}
      <Text text={title} x={16} y={16} fontSize={10}
        fill={PRIMARY} letterSpacing={3} fontStyle="bold" />
      <Text text={subtitle} x={16} y={32} fontSize={8}
        fill={PRIMARY} opacity={0.5} />
      {/* Terminal cells */}
      {[...Array(9)].map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3)
        return (
          <Rect key={i}
            x={16 + col * (( w - 40) / 3 + 4)} y={52 + row * 50}
            width={(w - 56) / 3} height={38}
            cornerRadius={6}
            fill={isActive ? '#a855f715' : '#00000040'}
            stroke={isActive ? '#a855f730' : '#ffffff10'}
            strokeWidth={1}
          />
        )
      })}
      {/* Click hint */}
      <Text text="CLICK TO INSPECT" x={w - 110} y={h - 18}
        fontSize={7} fill={PRIMARY} opacity={0.35} letterSpacing={2} />
    </Group>
  )
}

export default function SimulationWorld() {
  const agents = useStore(s => s.agents)
  const isResearching = useStore(s => s.isResearching)
  const [selectedZone, setSelectedZone] = useState(null)
  const [tick, setTick] = useState(0)
  const [stageSize, setStageSize] = useState({ w: W, h: H })
  const containerRef = useRef()
  const positions = useAnimatedAgents(agents)

  // Tick for animations
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50)
    return () => clearInterval(id)
  }, [])

  // Responsive stage
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setStageSize({ w: width, h: H })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const scale = stageSize.w / W

  const hubAgents = agents.filter(a => a.currentZone === 'hub')
  const labAgents = agents.filter(a => ['research','moving','returning'].includes(a.currentZone))

  // Animated dash offset for path
  const dashOffset = -(tick * 0.8) % 28

  return (
    <div ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-violet-500/20"
      style={{ height: H, background: '#080510' }}>

      <Stage width={stageSize.w} height={H} scaleX={scale} scaleY={scale}>
        <Layer>
          {/* Grid */}
          {[...Array(28)].map((_, i) => (
            <Line key={`h${i}`} points={[0, i*40, W, i*40]}
              stroke="#a855f7" strokeWidth={0.5} opacity={0.04} />
          ))}
          {[...Array(28)].map((_, i) => (
            <Line key={`v${i}`} points={[i*40, 0, i*40, H]}
              stroke="#a855f7" strokeWidth={0.5} opacity={0.04} />
          ))}

          {/* Road base */}
          <Line points={[HUB.x + HUB.w, HUB.y + HUB.h/2, LAB.x, LAB.y + LAB.h/2]}
            stroke="#a855f7" strokeWidth={8} opacity={0.08} lineCap="round" />

          {/* Animated path when researching */}
          {isResearching && (
            <Line
              points={[HUB.x + HUB.w, HUB.y + HUB.h/2, LAB.x, LAB.y + LAB.h/2]}
              stroke="#a855f7" strokeWidth={2.5}
              dash={[14, 10]} dashOffset={dashOffset}
              opacity={0.8} lineCap="round"
              shadowColor="#a855f7" shadowBlur={8} shadowOpacity={0.9}
            />
          )}

          {/* Buildings */}
          <BuildingNode
            x={HUB.x} y={HUB.y} w={HUB.w} h={HUB.h}
            title="AGENT HUB"
            subtitle={`${hubAgents.length} agents stationed`}
            isActive={!isResearching}
            onClick={() => setSelectedZone({ name: 'AGENT HUB', agents: hubAgents })}
          />
          <BuildingNode
            x={LAB.x} y={LAB.y} w={LAB.w} h={LAB.h}
            title="RESEARCH LAB"
            subtitle={`${labAgents.length} agents working`}
            isActive={isResearching}
            onClick={() => setSelectedZone({ name: 'RESEARCH LAB', agents: labAgents })}
          />

          {/* Agents */}
          {agents.map(agent => {
            const pos = positions[agent.id]
            if (!pos) return null
            return (
              <AgentNode
                key={agent.id}
                x={pos.x} y={pos.y}
                agent={agent}
                tick={tick}
              />
            )
          })}
        </Layer>
      </Stage>

      {/* Zone Detail Overlay — stays as HTML over canvas */}
      {selectedZone && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-end"
          onClick={() => setSelectedZone(null)}>
          <div className="w-full p-6 border-t border-violet-500/30 rounded-t-2xl"
            style={{ background: '#0f0820' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-xs tracking-[0.3em] text-violet-400 mb-1">ZONE DETAIL</div>
                <div className="text-white font-black text-lg tracking-wider">{selectedZone.name}</div>
              </div>
              <button onClick={() => setSelectedZone(null)} className="text-violet-400 text-xl">✕</button>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {selectedZone.agents.length === 0
                ? <div className="text-violet-400/50 text-sm py-4">No agents in this zone</div>
                : selectedZone.agents.map(agent => (
                  <div key={agent.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: `${AGENT_COLORS[agent.skill_level]}22`,
                               border: `1px solid ${AGENT_COLORS[agent.skill_level]}44` }}>
                      🤖
                    </div>
                    <div className="text-xs text-white font-semibold">{agent.name?.split(' ')[0]}</div>
                    <div className="text-xs text-violet-400">{agent.role}</div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full mt-1"
                      style={{
                        background: agent.animationState === 'working' ? '#34d39920' : '#a855f720',
                        color: agent.animationState === 'working' ? '#34d399' : '#a855f7'
                      }}>
                      {agent.animationState}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}