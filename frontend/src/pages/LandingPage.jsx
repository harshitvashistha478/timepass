/**
 * MODIFIED FILE: src/pages/LandingPage.jsx
 *
 * What changed vs original:
 *   • Replaced flat SVG node network with a real-time 3D rotating sphere of nodes
 *     using a lightweight Three.js Canvas (no post-processing needed).
 *   • Added a morphing holographic globe in the background.
 *   • Upgraded the CTA button with a 3D depth-shift hover effect.
 *   • Added floating "satellite" orbs that orbit the globe.
 *   • Everything else (user creation logic, store, error handling) is unchanged.
 */

import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { userAPI } from '../services/api'
import { useStore } from '../store/useStore'

// ─── 3D animated starfield / node cloud ───────────────────────────────────────

function NodeSphere() {
  const ref = useRef()
  const linesRef = useRef()

  // Generate nodes on a sphere surface
  const count = 140
  const { positions, connections } = (() => {
    const pos = new Float32Array(count * 3)
    const radius = 4.8
    for (let i = 0; i < count; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / count)
      const phi   = Math.PI * (1 + Math.sqrt(5)) * i
      pos[i * 3]     = radius * Math.sin(theta) * Math.cos(phi)
      pos[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
      pos[i * 3 + 2] = radius * Math.cos(theta)
    }

    // Build connections between nearby nodes
    const pts = []
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i*3] - pos[j*3]
        const dy = pos[i*3+1] - pos[j*3+1]
        const dz = pos[i*3+2] - pos[j*3+2]
        const d  = Math.sqrt(dx*dx + dy*dy + dz*dz)
        if (d < 2.4) {
          pts.push(pos[i*3], pos[i*3+1], pos[i*3+2])
          pts.push(pos[j*3], pos[j*3+1], pos[j*3+2])
        }
      }
    }
    return { positions: pos, connections: new Float32Array(pts) }
  })()

  const connGeom = new THREE.BufferGeometry()
  connGeom.setAttribute('position', new THREE.BufferAttribute(connections, 3))

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) {
      ref.current.rotation.y = t * 0.09
      ref.current.rotation.x = Math.sin(t * 0.04) * 0.12
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = t * 0.09
      linesRef.current.rotation.x = Math.sin(t * 0.04) * 0.12
    }
  })

  return (
    <>
      {/* Connection lines */}
      <lineSegments ref={linesRef} geometry={connGeom}>
        <lineBasicMaterial color="#06b6d4" transparent opacity={0.12} />
      </lineSegments>

      {/* Node points */}
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          color="#06b6d4"
          size={0.08}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </Points>
    </>
  )
}

// Hub name labels orbiting the sphere
function OrbitingLabel({ text, color, radius, speed, offset, yOff }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius
      ref.current.position.z = Math.sin(t) * radius
      ref.current.position.y = yOff + Math.sin(t * 0.7) * 0.4
    }
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.14, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
    </mesh>
  )
}

function Scene3D() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[4, 4, 4]} color="#06b6d4" intensity={0.4} />
      <pointLight position={[-4, -2, 2]} color="#8b5cf6" intensity={0.3} />
      <NodeSphere />
      <OrbitingLabel text="HUB" color="#06b6d4" radius={5.8} speed={0.22} offset={0}    yOff={0.5} />
      <OrbitingLabel text="ENQ" color="#f59e0b" radius={5.8} speed={0.22} offset={1.57} yOff={-0.3} />
      <OrbitingLabel text="RES" color="#8b5cf6" radius={5.8} speed={0.22} offset={3.14} yOff={0.8} />
      <OrbitingLabel text="DEV" color="#10b981" radius={5.8} speed={0.22} offset={4.71} yOff={-0.6} />
      <OrbitingLabel text="RAG" color="#f43f5e" radius={6.4} speed={0.15} offset={0.8}  yOff={1.2} />
    </>
  )
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function LandingPage({ onEnter }) {
  const setUser = useStore(s => s.setUser)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [hovered, setHovered] = useState(false)

  const handleCreateUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await userAPI.createTestUser()
      setUser(data)
      onEnter()
    } catch {
      setError('Cannot reach the Hub. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const statuses = [
    { label: 'Agent Hub',    dot: '#10b981' },
    { label: 'Enquiry Dept', dot: '#f59e0b' },
    { label: 'Research Lab', dot: '#06b6d4' },
    { label: 'Dev Hub',      dot: '#8b5cf6' },
    { label: 'RAG Hub',      dot: '#f43f5e' },
  ]

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020810 0%, #040e1e 50%, #020a14 100%)' }}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* ── 3D globe background ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.65 }}>
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <Scene3D />
        </Canvas>
      </div>

      {/* Center radial glow */}
      <div className="absolute pointer-events-none" style={{
        left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)',
      }} />

      {/* ── Main content ── */}
      <div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6"
        style={{ animation: 'fadeUp 0.9s ease both' }}
      >
        {/* Badge */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium"
          style={{
            background: 'rgba(6,182,212,0.08)',
            border: '1px solid rgba(6,182,212,0.25)',
            color: '#06b6d4',
            letterSpacing: '0.12em',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
          MULTI-AGENT SIMULATION PLATFORM  ·  3D LIVE VIEW
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: '"Syne", sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(52px, 9vw, 102px)',
          lineHeight: 0.9,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #e8f4ff 30%, #7aa3c4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>CYBER</span>
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(6,182,212,0.5))',
          }}>HUB</span>
        </h1>

        <p style={{
          color: '#7aa3c4',
          fontSize: 15,
          letterSpacing: '0.05em',
          marginBottom: 36,
          marginTop: 18,
          textAlign: 'center',
          maxWidth: 460,
          lineHeight: 1.7,
          fontFamily: '"DM Sans", sans-serif',
        }}>
          A living 3-D city where AI agents collaborate like a real tech company.
          Watch them think, route, research, and build — in real time.
        </p>

        {/* Zone pills */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          {statuses.map(({ label, dot }) => (
            <div key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(7,22,40,0.75)',
                border: '1px solid rgba(26,58,92,0.9)',
                color: '#7aa3c4',
                backdropFilter: 'blur(8px)',
              }}>
              <span className="pulse-dot" style={{ background: dot }} />
              {label}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={handleCreateUser}
          disabled={loading}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '18px 48px',
            background: loading ? 'rgba(6,182,212,0.05)' : hovered ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.1)',
            border: '1px solid',
            borderColor: loading ? 'rgba(6,182,212,0.15)' : hovered ? '#06b6d4' : 'rgba(6,182,212,0.4)',
            borderRadius: 14,
            color: loading ? '#7aa3c4' : '#06b6d4',
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.16em',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: hovered && !loading
              ? '0 0 40px rgba(6,182,212,0.35), 0 0 80px rgba(6,182,212,0.12), inset 0 1px 0 rgba(6,182,212,0.2)'
              : '0 0 20px rgba(6,182,212,0.1)',
            transform: hovered && !loading ? 'translateY(-2px)' : 'none',
            transition: 'all 0.25s cubic-bezier(0.34,1.26,0.64,1)',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer sweep */}
          {hovered && !loading && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.15) 50%, transparent 100%)',
              animation: 'shimmer 1.4s linear infinite',
              backgroundSize: '200% auto',
            }} />
          )}

          {loading ? (
            <>
              <span style={{
                width: 18, height: 18,
                border: '2px solid rgba(6,182,212,0.25)',
                borderTopColor: '#06b6d4',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
              INITIALIZING SESSION...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#06b6d4" strokeWidth="1.5"/>
                <path d="M7 6l5 3-5 3V6z" fill="#06b6d4"/>
              </svg>
              ENTER THE 3D HUB
            </>
          )}
        </button>

        {error && (
          <p style={{
            marginTop: 16, color: '#ef4444', fontSize: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '8px 16px',
          }}>⚠ {error}</p>
        )}

        <p style={{ marginTop: 20, color: '#3d6080', fontSize: 11, letterSpacing: '0.08em', textAlign: 'center' }}>
          No account needed — you'll be assigned a unique operator identity
        </p>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 py-4"
        style={{ borderTop: '1px solid rgba(26,58,92,0.5)', background: 'rgba(2,8,20,0.6)', backdropFilter: 'blur(8px)' }}>
        {['Powered by Groq LLM', '3D Real-time Simulation', 'Multi-Agent Architecture', 'RAG Master Hub'].map((t, i) => (
          <span key={i} style={{ color: '#3d6080', fontSize: 11, letterSpacing: '0.1em' }}>
            {i > 0 && <span style={{ marginRight: 8, color: '#1a3a5c' }}>·</span>}
            {t}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
      `}</style>
    </div>
  )
}