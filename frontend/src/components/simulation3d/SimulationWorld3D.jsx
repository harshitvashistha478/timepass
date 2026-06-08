/**
 * SimulationWorld3D.jsx — FULL OVERHAUL
 *
 * What's new vs the old file:
 *   • Human-like agents: sphere head, helmet visor, capsule torso/limbs, shoulder pads, boots
 *   • Clickable agents → slide-in AgentDetailPanel (top-right)
 *   • Facing direction: agents rotate to face their direction of travel
 *   • Grid glow: opacity 0.04 → 0.20 (active) / 0.10 (idle)
 *   • Building emissive: ×5-10 brighter; corner neon pillars; holographic screen on face
 *   • 3 patrol drones cruising above the skyline
 *   • 35 ambient floating data-particles
 *   • Live HUD overlay (status / agent count / active hubs)
 *   • Brighter scene lighting: 4 colored point lights, stronger ambient
 *   • Neon road edge strips; always-on street lamp point lights
 *   • DataPackets arc higher (×1.5) and glow at intensity 5
 */

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

// ─── World constants ──────────────────────────────────────────────────────────

const BUILDINGS = {
  hub: {
    pos: [-10, 0, 0], size: [3, 6, 2.5],
    color: '#06b6d4', label: 'AGENT HUB',
    desc: 'Central factory. Spawns and manages all AI agents on demand.', key: 'hub',
  },
  enquiry: {
    pos: [-2.5, 0, 0], size: [3.8, 9.5, 3],
    color: '#f59e0b', label: 'ENQUIRY DEPT',
    desc: 'Smart front-door. Routes queries to the right hub using LLM reasoning.', key: 'enquiry',
  },
  research: {
    pos: [5, 0, 0], size: [3, 6.5, 2.5],
    color: '#8b5cf6', label: 'RESEARCH LAB',
    desc: 'Deep analysis, fact-finding, market research and written reports.', key: 'research',
  },
  dev: {
    pos: [10, 0, 0], size: [2.5, 5, 2],
    color: '#10b981', label: 'DEV HUB',
    desc: 'Full-stack builds, architecture decisions, code reviews and DevOps.', key: 'dev',
  },
}

const ROAD_Z = 1.8
const AGENT_Y = 0.5

const ZONE_3D = {
  hub:        [-10,  AGENT_Y, ROAD_Z],
  toEnquiry:  [-6.5, AGENT_Y, ROAD_Z],
  enquiry:    [-2.5, AGENT_Y, ROAD_Z],
  toResearch: [1.5,  AGENT_Y, ROAD_Z],
  research:   [5,    AGENT_Y, ROAD_Z],
  toDev:      [7.5,  AGENT_Y, ROAD_Z],
  dev:        [10,   AGENT_Y, ROAD_Z],
  returning:  [-6.5, AGENT_Y, ROAD_Z],
}

const SKILL_COLORS = {
  junior: '#10b981',
  mid:    '#06b6d4',
  senior: '#8b5cf6',
  expert: '#f59e0b',
}

const DEFAULT_CAM  = new THREE.Vector3(0, 14, 22)
const DEFAULT_LOOK = new THREE.Vector3(0, 3, 0)

// ─── Camera controller ────────────────────────────────────────────────────────

function CameraController({ zoomTarget }) {
  const { camera } = useThree()
  const ctrlRef = useRef()
  const camPos  = useRef(DEFAULT_CAM.clone())
  const lookAt  = useRef(DEFAULT_LOOK.clone())
  const tCamPos = useRef(DEFAULT_CAM.clone())
  const tLookAt = useRef(DEFAULT_LOOK.clone())

  useEffect(() => {
    if (!zoomTarget) {
      tCamPos.current.copy(DEFAULT_CAM)
      tLookAt.current.copy(DEFAULT_LOOK)
    } else {
      const b  = BUILDINGS[zoomTarget]
      const bx = b.pos[0]
      const bh = b.size[1]
      tCamPos.current.set(
        bx,
        bh * 0.45 + 2,
        b.pos[2] + 4
      )
      tLookAt.current.set(bx, bh * 0.4, b.pos[2])
    }
  }, [zoomTarget])

  useFrame(() => {
    camPos.current.lerp(tCamPos.current, 0.05)
    lookAt.current.lerp(tLookAt.current, 0.05)
    camera.position.copy(camPos.current)
    camera.lookAt(lookAt.current)
    if (ctrlRef.current) ctrlRef.current.target.copy(lookAt.current)
  })

  return (
    <OrbitControls
      ref={ctrlRef}
      enablePan={false}
      minDistance={6}
      maxDistance={35}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.2}
      enabled={!zoomTarget}
    />
  )
}

// ─── City ground ──────────────────────────────────────────────────────────────

function CityGround({ isActive }) {
  return (
    <group>
      {/* Tarmac */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#040d1a" roughness={0.9} metalness={0.2} />
      </mesh>

      {/* Glowing grid — vertical */}
      {Array.from({ length: 25 }, (_, i) => {
        const x = -12 + i
        return (
          <line key={`v${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([x, 0, -8, x, 0, 8])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#06b6d4" opacity={isActive ? 0.20 : 0.09} transparent />
          </line>
        )
      })}

      {/* Glowing grid — horizontal */}
      {Array.from({ length: 17 }, (_, i) => {
        const z = -8 + i
        return (
          <line key={`h${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-12, 0, z, 13, 0, z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#06b6d4" opacity={isActive ? 0.20 : 0.09} transparent />
          </line>
        )
      })}

      {/* Road strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, ROAD_Z]}>
        <planeGeometry args={[28, 2.5]} />
        <meshStandardMaterial color="#050c18" roughness={0.85} />
      </mesh>

      {/* Road center dashes */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-13 + i * 2, 0.02, ROAD_Z]}>
          <planeGeometry args={[0.9, 0.08]} />
          <meshStandardMaterial
            color={isActive ? '#06b6d4' : '#1a3050'}
            emissive={isActive ? '#06b6d4' : '#0a1828'}
            emissiveIntensity={isActive ? 1.4 : 0.3}
          />
        </mesh>
      ))}

      {/* Neon road edge strips */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, ROAD_Z - 1.28]}>
        <planeGeometry args={[28, 0.07]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={isActive ? 5 : 1.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, ROAD_Z + 1.28]}>
        <planeGeometry args={[28, 0.07]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={isActive ? 5 : 1.5} />
      </mesh>

      {/* Street lamps — always lit */}
      {[-9, -6, -1, 2, 6, 9].map(x => (
        <group key={x} position={[x, 0, 3.8]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 4, 6]} />
            <meshStandardMaterial color="#0d1f35" />
          </mesh>
          <mesh position={[0.5, 3.8, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={isActive ? 3.5 : 2} />
          </mesh>
          <pointLight position={[0.5, 3.8, 0]} color="#f59e0b" intensity={isActive ? 1.5 : 0.8} distance={7} />
        </group>
      ))}
    </group>
  )
}

// ─── 3-D Building ─────────────────────────────────────────────────────────────

function Building3D({ config, isActive, agentCount, onClick }) {
  const meshRef   = useRef()
  const ringRef   = useRef()
  const glowRef   = useRef()
  const screenRef = useRef()
  const [hovered, setHovered] = useState(false)
  const { pos, size, color, label } = config
  const [bx, , bz] = pos
  const [bw, bh, bd] = size

  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(bw, bh, bd)),
    [bw, bh, bd],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ringRef.current)  ringRef.current.rotation.y = t * 0.5
    if (glowRef.current)  glowRef.current.intensity  = isActive ? (1.8 + Math.sin(t * 2) * 0.6) : 0
    if (meshRef.current) {
      const target = hovered ? 1.03 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1)
    }
    if (screenRef.current) {
      screenRef.current.material.emissiveIntensity = isActive
        ? 0.55 + Math.sin(t * 2.8 + bx) * 0.28
        : 0.1
    }
  })

  const windows = useMemo(() => {
    const wins = []
    const cols   = bw > 3.2 ? 4 : 3
    const floors = Math.floor(bh / 1.4) - 1
    for (let fi = 0; fi < floors; fi++) {
      for (let ci = 0; ci < cols; ci++) {
        const wx  = bx - bw / 2 + (ci + 0.7) * (bw / cols)
        const wy  = 0.8 + fi * 1.35
        const lit = (fi + ci * 2 + 1) % 5 !== 0 || isActive
        wins.push({ wx, wy, lit, fi, ci })
      }
    }
    return wins
  }, [bx, bw, bh, isActive])

  return (
    <group
      position={[bx, bh / 2, bz]}
      onClick={e => { e.stopPropagation(); onClick() }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      <pointLight ref={glowRef} color={color} intensity={0} distance={16} decay={2} />

      {/* Building body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial
          color="#040d1c"
          emissive={color}
          emissiveIntensity={isActive ? 0.22 : hovered ? 0.14 : 0.07}
          roughness={0.25}
          metalness={0.72}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.8 : hovered ? 0.55 : 0.28}
        />
      </lineSegments>

      {/* Windows */}
      {windows.map(({ wx, wy, lit, fi, ci }) => (
        <mesh key={`w${fi}-${ci}`} position={[wx - bx, wy - bh / 2, bd / 2 + 0.01]}>
          <planeGeometry args={[0.22, 0.38]} />
          <meshStandardMaterial
            color={lit ? color : '#060f1e'}
            emissive={lit ? color : '#000'}
            emissiveIntensity={isActive ? 1.4 : lit ? 0.5 : 0}
            transparent
            opacity={lit ? 0.95 : 0.4}
          />
        </mesh>
      ))}

      {/* Holographic data screen on front face */}
      <mesh ref={screenRef} position={[0, bh * 0.05, bd / 2 + 0.03]}>
        <planeGeometry args={[bw * 0.65, bh * 0.38]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.1}
          transparent
          opacity={0.13}
        />
      </mesh>
      {/* Scanning line on screen (active only) */}
      {isActive && (
        <ScanLine bw={bw} bh={bh} bd={bd} color={color} />
      )}

      {/* Roof platform */}
      <mesh position={[0, bh / 2 + 0.15, 0]}>
        <boxGeometry args={[bw + 0.3, 0.2, bd + 0.3]} />
        <meshStandardMaterial color="#060f1e" emissive={color} emissiveIntensity={isActive ? 0.55 : 0.1} />
      </mesh>

      {/* Antenna shaft */}
      <mesh position={[0, bh / 2 + 1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 2, 8]} />
        <meshStandardMaterial color="#0d2040" emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Antenna tip */}
      <mesh position={[0, bh / 2 + 2.3, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 6 : 2} />
      </mesh>
      {isActive && (
        <>
          <pointLight position={[0, bh / 2 + 2.3, 0]} color={color} intensity={3} distance={10} />
          <mesh position={[0, bh / 2 + 2.3, 0]}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.14} />
          </mesh>
        </>
      )}

      {/* Spinning holographic base ring */}
      {isActive && (
        <group ref={ringRef} position={[0, -bh / 2 + 0.1, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bw * 0.75, 0.055, 8, 36]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bw * 0.44, 0.035, 6, 28]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent opacity={0.55} />
          </mesh>
        </group>
      )}

      {/* Corner neon pillars */}
      {isActive && [
        [-bw / 2, -bd / 2],
        [ bw / 2, -bd / 2],
        [-bw / 2,  bd / 2],
        [ bw / 2,  bd / 2],
      ].map(([ex, ez], i) => (
        <mesh key={i} position={[ex, 0, ez]}>
          <cylinderGeometry args={[0.045, 0.045, bh, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} transparent opacity={0.65} />
        </mesh>
      ))}

      {/* Floating label */}
      <Billboard position={[0, bh / 2 + 3.2, 0]}>
        <Text
          fontSize={0.36}
          color={isActive ? 'white' : color}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
          outlineColor={color}
          outlineWidth={isActive ? 0.015 : 0.006}
        >
          {label}
        </Text>
        {agentCount > 0 && (
          <Text position={[0, -0.5, 0]} fontSize={0.26} color={color} anchorX="center" anchorY="middle">
            {`● ${agentCount} AGENT${agentCount > 1 ? 'S' : ''}`}
          </Text>
        )}
      </Billboard>
    </group>
  )
}

function ScanLine({ bw, bh, bd, color }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) {
      ref.current.position.y = (((t * 0.6) % 1) - 0.5) * bh * 0.36
      ref.current.material.opacity = 0.55 + Math.sin(t * 4) * 0.2
    }
  })
  return (
    <mesh ref={ref} position={[0, 0, bd / 2 + 0.04]}>
      <planeGeometry args={[bw * 0.63, 0.05]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} transparent opacity={0.6} />
    </mesh>
  )
}

function FloatingOrb({ position }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (!ref.current) return

    ref.current.position.y =
      position[1] +
      Math.sin(clock.elapsedTime * 2) * 0.2
  })

  return (
    <mesh
      ref={ref}
      position={position}
    >
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial
        color="#06b6d4"
        emissive="#06b6d4"
        emissiveIntensity={4}
      />
    </mesh>
  )
}
// ─── Human-like Agent ─────────────────────────────────────────────────────────

function HumanAgent3D({ agent, index, onSelect }) {
  const groupRef  = useRef()
  const bodyRef   = useRef()
  const headRef   = useRef()
  const leftLeg   = useRef()
  const rightLeg  = useRef()
  const leftArm   = useRef()
  const rightArm  = useRef()
  const eyeGlow   = useRef()
  const [hovered, setHovered] = useState(false)

  const color   = SKILL_COLORS[agent.skill_level] || '#06b6d4'
  const zone    = agent.currentZone || 'hub'
  const walking = agent.animationState === 'walking'
  const working = agent.animationState === 'working'

  const targetPos = useMemo(() => {
    const base = ZONE_3D[zone] || ZONE_3D.hub
    const col  = ((index % 3) + 3) % 3
    const row  = Math.floor(Math.abs(index) / 3)
    return new THREE.Vector3(base[0] + (col - 1) * 0.62, base[1], base[2] + row * 0.62)
  }, [zone, index])

  const curPos  = useRef(targetPos.clone())
  const prevPos = useRef(targetPos.clone())

  useFrame(({ clock }) => {
    const t   = clock.getElapsedTime()
    const spd = walking ? 0.04 : 0.08

    curPos.current.lerp(targetPos, spd)

    if (groupRef.current) {
      groupRef.current.position.copy(curPos.current)

      // Face direction of travel
      const moveDir = new THREE.Vector3().subVectors(curPos.current, prevPos.current)
      if (moveDir.lengthSq() > 0.0000015) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z)
        groupRef.current.rotation.y += (targetAngle - groupRef.current.rotation.y) * 0.15
      }
    }
    prevPos.current.copy(curPos.current)

    if (walking) {
      const swing = Math.sin(t * 6) * 0.6
      if (leftLeg.current)  leftLeg.current.rotation.x  =  swing
      if (rightLeg.current) rightLeg.current.rotation.x = -swing
      if (leftArm.current)  leftArm.current.rotation.x  = -swing * 0.5
      if (rightArm.current) rightArm.current.rotation.x =  swing * 0.5
      if (groupRef.current) groupRef.current.position.y = curPos.current.y + Math.abs(Math.sin(t * 6)) * 0.05
      if (headRef.current)  headRef.current.rotation.y  = Math.sin(t * 3) * 0.07
    } else {
      if (leftLeg.current)  leftLeg.current.rotation.x  = 0
      if (rightLeg.current) rightLeg.current.rotation.x = 0
    }

    if (working) {
      if (leftArm.current)  leftArm.current.rotation.x  = -0.85 + Math.sin(t * 4) * 0.38
      if (rightArm.current) rightArm.current.rotation.x = -0.85 - Math.sin(t * 4) * 0.38
      if (bodyRef.current)  bodyRef.current.material.emissiveIntensity = 0.38 + Math.sin(t * 5) * 0.22
      if (eyeGlow.current)  eyeGlow.current.intensity   = 0.65 + Math.sin(t * 6) * 0.38
    } else {
      if (!walking) {
        if (leftArm.current)  leftArm.current.rotation.x  = 0
        if (rightArm.current) rightArm.current.rotation.x = 0
      }
      // Idle breathing
      if (bodyRef.current && !walking) bodyRef.current.scale.y = 1 + Math.sin(t * 1.6) * 0.014
      if (eyeGlow.current) eyeGlow.current.intensity = hovered ? 0.55 : 0.18
    }
  })

  const eyeColor = hovered ? '#ffffff' : color

  return (
    <group
      ref={groupRef}
      onClick={e => { e.stopPropagation(); onSelect(agent) }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      {/* Eye / head light */}
      <pointLight ref={eyeGlow} position={[0, 1.08, 0.22]} color={color} intensity={0.18} distance={2.2} />

      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -AGENT_Y + 0.01, 0]}>
        <circleGeometry args={[0.28, 14]} />
        <meshStandardMaterial color="#000" transparent opacity={0.4} />
      </mesh>

      {/* Hover selection ring */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -AGENT_Y + 0.025, 0]}>
          <ringGeometry args={[0.3, 0.4, 28]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} transparent opacity={0.75} />
        </mesh>
      )}

      {/* ── LEFT LEG ── pivot at hip */}
      <group ref={leftLeg} position={[-0.105, 0.24, 0]}>
        {/* Thigh */}
        <mesh position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.072, 0.18, 4, 8]} />
          <meshStandardMaterial color="#0a1e36" emissive={color} emissiveIntensity={0.14} metalness={0.75} roughness={0.3} />
        </mesh>
        {/* Knee cap */}
        <mesh position={[0, -0.28, 0.04]}>
          <sphereGeometry args={[0.058, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
        </mesh>
        {/* Calf */}
        <mesh position={[0, -0.45, 0]}>
          <capsuleGeometry args={[0.058, 0.16, 4, 8]} />
          <meshStandardMaterial color="#071525" emissive={color} emissiveIntensity={0.1} metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.59, 0.04]}>
          <boxGeometry args={[0.13, 0.09, 0.2]} />
          <meshStandardMaterial color="#040e1c" emissive={color} emissiveIntensity={0.22} metalness={0.9} />
        </mesh>
      </group>

      {/* ── RIGHT LEG ── */}
      <group ref={rightLeg} position={[0.105, 0.24, 0]}>
        <mesh position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.072, 0.18, 4, 8]} />
          <meshStandardMaterial color="#0a1e36" emissive={color} emissiveIntensity={0.14} metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.28, 0.04]}>
          <sphereGeometry args={[0.058, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
        </mesh>
        <mesh position={[0, -0.45, 0]}>
          <capsuleGeometry args={[0.058, 0.16, 4, 8]} />
          <meshStandardMaterial color="#071525" emissive={color} emissiveIntensity={0.1} metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.59, 0.04]}>
          <boxGeometry args={[0.13, 0.09, 0.2]} />
          <meshStandardMaterial color="#040e1c" emissive={color} emissiveIntensity={0.22} metalness={0.9} />
        </mesh>
      </group>

      {/* ── PELVIS / BELT ── */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.31, 0.09, 0.19]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} metalness={0.82} />
      </mesh>

      {/* ── TORSO ── */}
      <mesh ref={bodyRef} position={[0, 0.57, 0]} castShadow>
        <capsuleGeometry args={[0.152, 0.3, 4, 10]} />
        <meshStandardMaterial
          color="#061828"
          emissive={color}
          emissiveIntensity={working ? 0.32 : 0.13}
          roughness={0.22}
          metalness={0.88}
        />
      </mesh>

      {/* Chest badge / data screen */}
      <mesh position={[0, 0.62, 0.175]}>
        <planeGeometry args={[0.19, 0.21]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={working ? 3.5 : 1.4} transparent opacity={0.92} />
      </mesh>
      {/* Chest stripe */}
      <mesh position={[0, 0.46, 0.174]}>
        <planeGeometry args={[0.27, 0.04]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent opacity={0.72} />
      </mesh>

      {/* ── LEFT ARM ── pivot at shoulder */}
      <group ref={leftArm} position={[-0.245, 0.72, 0]}>
        {/* Shoulder pad */}
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.098, 10, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.72} />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.062, 0.17, 4, 8]} />
          <meshStandardMaterial color="#071525" emissive={color} emissiveIntensity={0.1} metalness={0.8} roughness={0.28} />
        </mesh>
        {/* Elbow */}
        <mesh position={[0, -0.245, 0]}>
          <sphereGeometry args={[0.052, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.375, 0]}>
          <capsuleGeometry args={[0.052, 0.155, 4, 8]} />
          <meshStandardMaterial color="#0a1e36" emissive={color} emissiveIntensity={0.12} metalness={0.82} roughness={0.25} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.49, 0]}>
          <sphereGeometry args={[0.062, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={working ? 2.5 : 0.55} />
        </mesh>
      </group>

      {/* ── RIGHT ARM ── */}
      <group ref={rightArm} position={[0.245, 0.72, 0]}>
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.098, 10, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.72} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.062, 0.17, 4, 8]} />
          <meshStandardMaterial color="#071525" emissive={color} emissiveIntensity={0.1} metalness={0.8} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.245, 0]}>
          <sphereGeometry args={[0.052, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
        </mesh>
        <mesh position={[0, -0.375, 0]}>
          <capsuleGeometry args={[0.052, 0.155, 4, 8]} />
          <meshStandardMaterial color="#0a1e36" emissive={color} emissiveIntensity={0.12} metalness={0.82} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.49, 0]}>
          <sphereGeometry args={[0.062, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={working ? 2.5 : 0.55} />
        </mesh>
      </group>

      {/* ── NECK ── */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.063, 0.078, 0.13, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.38} metalness={0.82} />
      </mesh>

      {/* ── HEAD GROUP ── */}
      <group ref={headRef}>
        {/* Head sphere */}
        <mesh position={[0, 1.09, 0]} castShadow>
          <sphereGeometry args={[0.172, 20, 20]} />
          <meshStandardMaterial
            color="#061828"
            emissive={color}
            emissiveIntensity={0.22}
            roughness={0.12}
            metalness={0.96}
          />
        </mesh>

        {/* Helmet ridge — torus around head equator */}
        <mesh position={[0, 1.09, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.173, 0.024, 4, 30]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
        </mesh>

        {/* Visor — dark panel */}
        <mesh position={[0, 1.065, 0.153]}>
          <boxGeometry args={[0.258, 0.135, 0.032]} />
          <meshStandardMaterial color="#000710" transparent opacity={0.92} roughness={0} metalness={1} />
        </mesh>

        {/* Eyes — glow through visor */}
        <mesh position={[-0.072, 1.077, 0.165]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={hovered ? 8 : 5} />
        </mesh>
        <mesh position={[0.072, 1.077, 0.165]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={hovered ? 8 : 5} />
        </mesh>

        {/* Antenna */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.19, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[0, 1.41, 0]}>
          <sphereGeometry args={[0.038, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} />
        </mesh>
      </group>

      {/* Working particles */}
      {working && (
        <>
          <WorkingParticle color={color} offset={0} />
          <WorkingParticle color={color} offset={2.1} />
          <WorkingParticle color={color} offset={4.2} />
        </>
      )}
    </group>
  )
}

function WorkingParticle({ color, offset }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + offset
    if (ref.current) {
      ref.current.position.x = Math.sin(t * 2.5) * 0.42
      ref.current.position.y = 0.72 + Math.abs(Math.sin(t * 1.8)) * 0.72
      ref.current.position.z = Math.cos(t * 2.5) * 0.42
      ref.current.material.opacity = 0.4 + Math.sin(t * 3) * 0.35
    }
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.052, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} transparent opacity={0.75} />
    </mesh>
  )
}

// ─── Ambient floating particles ───────────────────────────────────────────────

function FloatingParticle({ x, y, z, speed, phase, color, size }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase
    if (ref.current) {
      ref.current.position.y = y + Math.sin(t) * 0.95
      ref.current.position.x = x + Math.cos(t * 0.42) * 0.45
      ref.current.material.opacity = 0.22 + Math.sin(t * 1.6) * 0.18
    }
  })
  return (
    <mesh ref={ref} position={[x, y, z]}>
      <sphereGeometry args={[size, 5, 5]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} transparent opacity={0.35} />
    </mesh>
  )
}

function AmbientParticles() {
  const particles = useMemo(() => {
    const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b']
    return Array.from({ length: 38 }, (_, i) => ({
      x: (Math.random() - 0.5) * 26,
      z: (Math.random() - 0.5) * 10,
      y: 2.8 + Math.random() * 7.5,
      speed: 0.22 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      color: colors[i % colors.length],
      size: 0.038 + Math.random() * 0.058,
    }))
  }, [])

  return <>{particles.map((p, i) => <FloatingParticle key={i} {...p} />)}</>
}

// ─── Patrol drones ────────────────────────────────────────────────────────────

function PatrolDrone({ orbitPhase, color, height }) {
  const groupRef = useRef()
  const r1 = useRef()
  const r2 = useRef()
  const r3 = useRef()
  const r4 = useRef()
  const scanLight = useRef()

  useFrame(({ clock }) => {
    const t  = clock.getElapsedTime()
    const x  = Math.sin(t * 0.38 + orbitPhase) * 9.5
    const z  = Math.cos(t * 0.22 + orbitPhase) * 2.8 - 0.5
    const y  = height + Math.sin(t * 0.85 + orbitPhase) * 0.5

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z)
      const vx = Math.cos(t * 0.38 + orbitPhase) * 0.38
      const vz = -Math.sin(t * 0.22 + orbitPhase) * 0.22
      groupRef.current.rotation.y = Math.atan2(vx, vz)
      groupRef.current.rotation.z = Math.sin(t * 0.85) * 0.07
    }

    const rs = t * 28
    if (r1.current) r1.current.rotation.y =  rs
    if (r2.current) r2.current.rotation.y = -rs
    if (r3.current) r3.current.rotation.y =  rs
    if (r4.current) r4.current.rotation.y = -rs
    if (scanLight.current) scanLight.current.intensity = 0.55 + Math.sin(t * 3.2) * 0.25
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.34, 0.1, 0.34]} />
        <meshStandardMaterial color="#071828" emissive={color} emissiveIntensity={0.5} metalness={0.96} roughness={0.08} />
      </mesh>
      {/* Center dome */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshStandardMaterial color="#030d1e" emissive={color} emissiveIntensity={0.85} metalness={0.9} roughness={0} transparent opacity={0.82} />
      </mesh>

      {/* Rotor 1 — front-left */}
      <mesh ref={r1} position={[-0.26, 0.04, -0.26]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.52} />
      </mesh>
      {/* Rotor 2 — front-right */}
      <mesh ref={r2} position={[0.26, 0.04, -0.26]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.52} />
      </mesh>
      {/* Rotor 3 — back-left */}
      <mesh ref={r3} position={[-0.26, 0.04, 0.26]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.52} />
      </mesh>
      {/* Rotor 4 — back-right */}
      <mesh ref={r4} position={[0.26, 0.04, 0.26]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.52} />
      </mesh>

      {/* Scan light */}
      <pointLight ref={scanLight} position={[0, -0.22, 0]} color={color} intensity={0.55} distance={7} />
      {/* LED */}
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6} />
      </mesh>
    </group>
  )
}

// ─── Animated data packet ─────────────────────────────────────────────────────

function DataPacket({ from, to, color, delay, speed = 0.45 }) {
  const ref     = useRef()
  const t       = useRef(delay)
  const fromVec = useMemo(() => new THREE.Vector3(...from), [])
  const toVec   = useMemo(() => new THREE.Vector3(...to), [])

  useFrame((_, delta) => {
    t.current = (t.current + delta * speed) % 1
    if (ref.current) {
      const arc = Math.sin(t.current * Math.PI) * 1.3
      ref.current.position.lerpVectors(fromVec, toVec, t.current)
      ref.current.position.y += arc
      ref.current.material.opacity = Math.sin(t.current * Math.PI)
    }
  })

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6} transparent opacity={1} />
    </mesh>
  )
}

// ─── Connection beam ──────────────────────────────────────────────────────────

function ConnectionBeam({ from, to, color, active }) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [])
  const geom   = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setFromPoints(points)
    return g
  }, [points])

  return (
    <line geometry={geom}>
      <lineBasicMaterial color={color} transparent opacity={active ? 0.7 : 0.12} />
    </line>
  )
}

// ─── Scene environment ────────────────────────────────────────────────────────

function SceneEnvironment({ isActive }) {
  const moonRef = useRef()
  useFrame(({ clock }) => {
    if (moonRef.current) moonRef.current.intensity = 0.22 + Math.sin(clock.getElapsedTime() * 0.3) * 0.04
  })
  return (
    <>
      <fog attach="fog" args={['#020810', 24, 58]} />
      <ambientLight intensity={0.2} color="#0a1a2e" />
      <directionalLight ref={moonRef} position={[-8, 20, -5]} intensity={0.22} color="#a0c8f0" castShadow />
      {/* Per-building accent lights */}
      <pointLight position={[-10, 4, 0]} color="#06b6d4" intensity={isActive ? 2.0 : 0.6} distance={14} />
      <pointLight position={[-2.5, 5, 0]} color="#f59e0b" intensity={isActive ? 2.5 : 1.0} distance={18} />
      <pointLight position={[5,   4, 0]} color="#8b5cf6" intensity={isActive ? 2.0 : 0.6} distance={14} />
      <pointLight position={[10,  3, 0]} color="#10b981" intensity={isActive ? 2.0 : 0.6} distance={14} />
      <Stars radius={80} depth={40} count={2200} factor={3.5} saturation={0.3} fade speed={0.5} />
    </>
  )
}

// ─── Agent detail panel (top-right overlay) ───────────────────────────────────

function AgentDetailPanel({ agent, onClose }) {
  const color = SKILL_COLORS[agent.skill_level] || '#06b6d4'
  const stateColor =
    agent.animationState === 'working' ? '#10b981' :
    agent.animationState === 'walking' ? '#f59e0b' : '#5a7a9a'
  const stateLabel =
    agent.animationState === 'working' ? 'WORKING' :
    agent.animationState === 'walking' ? 'IN TRANSIT' : 'IDLE'

  return (
    <div style={{
      position: 'absolute', top: 14, right: 14,
      background: 'rgba(4,12,26,0.97)',
      border: `1px solid ${color}45`,
      borderRadius: 20,
      padding: '20px 22px',
      minWidth: 230,
      boxShadow: `0 0 50px ${color}22, 0 8px 40px rgba(0,0,0,0.55)`,
      backdropFilter: 'blur(18px)',
      animation: 'slideIn 0.28s ease both',
      zIndex: 10,
    }}>
      {/* Top glow bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        borderRadius: '20px 20px 0 0',
        opacity: agent.animationState === 'working' ? 1 : 0.55,
      }} />

      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 12, right: 12,
        background: `${color}1a`, border: `1px solid ${color}35`,
        borderRadius: 8, color, padding: '3px 10px',
        fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em',
      }}>✕</button>

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: `${color}18`, border: `1.5px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 25,
          boxShadow: agent.animationState === 'working' ? `0 0 22px ${color}55` : 'none',
        }}>🧑‍💻</div>
        <div>
          <div style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 15 }}>{agent.name || 'Agent'}</div>
          <div style={{ color, fontSize: 11, marginTop: 2, opacity: 0.82 }}>{agent.role || 'AI Worker'}</div>
        </div>
      </div>

      {/* Skill badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: `${color}14`, border: `1px solid ${color}38`,
        borderRadius: 8, padding: '4px 12px', marginBottom: 13,
      }}>
        <span style={{ color, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.13em' }}>
          ⭐ {(agent.skill_level || 'unknown').toUpperCase()}
        </span>
      </div>

      {/* Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: `${stateColor}0f`, border: `1px solid ${stateColor}28`,
        borderRadius: 10, padding: '8px 12px', marginBottom: 12,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: stateColor,
          boxShadow: `0 0 8px ${stateColor}`, display: 'inline-block',
          animation: agent.animationState !== 'idle' ? 'pulseDot 1.4s ease infinite' : 'none',
        }} />
        <span style={{ color: stateColor, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.1em' }}>
          {stateLabel}
        </span>
      </div>

      {/* Zone */}
      <div style={{ fontSize: 11 }}>
        <span style={{ color: '#3d6080', marginRight: 8, letterSpacing: '0.1em' }}>ZONE</span>
        <span style={{ color: '#7aa3c4', fontWeight: 600 }}>
          {(agent.currentZone || 'hub').toUpperCase().replace('TO', '→')}
        </span>
      </div>
    </div>
  )
}

// ─── Building inspection panel ────────────────────────────────────────────────

function BuildingInspectionPanel({ zone, onClose }) {
  const { name, desc, color, agents } = zone
  return (
    <div
      className="absolute inset-0 flex items-end"
      style={{ background: 'rgba(2,8,20,0.62)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full"
        style={{
          background: 'rgba(4,11,24,0.98)',
          border: `1px solid ${color}38`,
          borderBottom: 'none',
          borderRadius: '22px 22px 0 0',
          boxShadow: `0 -18px 90px ${color}22, 0 0 0 1px ${color}12`,
          animation: 'slideUpPanel 0.35s cubic-bezier(0.34,1.26,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          borderRadius: '22px 22px 0 0', opacity: 0.85,
        }} />

        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 44, height: 4, borderRadius: 4, background: `${color}45` }} />
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-xs tracking-widest mb-1" style={{ color, opacity: 0.75 }}>ZONE INSPECTION</div>
              <h3 className="text-2xl font-bold tracking-wider"
                style={{ color: '#e8f4ff', fontFamily: '"Syne", sans-serif', textShadow: `0 0 26px ${color}72` }}>
                {name}
              </h3>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#5a7a9a', maxWidth: 440 }}>{desc}</p>
            </div>
            <button onClick={onClose} style={{
              background: `${color}18`, border: `1px solid ${color}38`,
              borderRadius: 12, color, padding: '7px 16px',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
            }}>✕ CLOSE</button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-5">
            {[
              { label: 'AGENTS',     value: agents.length },
              { label: 'WORKING',    value: agents.filter(a => a.animationState === 'working').length },
              { label: 'IN TRANSIT', value: agents.filter(a => a.animationState === 'walking').length },
              { label: 'IDLE',       value: agents.filter(a => a.animationState === 'idle').length },
            ].map(({ label, value }) => (
              <div key={label} style={{
                flex: 1, background: `${color}0a`, border: `1px solid ${color}28`,
                borderRadius: 14, padding: '10px 12px', textAlign: 'center',
              }}>
                <div className="text-xl font-bold" style={{ color: '#e8f4ff', fontFamily: '"Syne", sans-serif' }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color, opacity: 0.68, letterSpacing: '0.1em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Agent cards */}
          {agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '22px 0', color: '#3d6080', fontSize: 13 }}>
              No agents currently assigned to this zone.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              {agents.map(agent => {
                const ac = SKILL_COLORS[agent.skill_level] || '#06b6d4'
                const sc = agent.animationState === 'working' ? '#10b981' :
                           agent.animationState === 'walking' ? '#f59e0b' : '#5a7a9a'
                return (
                  <div key={agent.id} style={{
                    flexShrink: 0, minWidth: 160, position: 'relative', overflow: 'hidden',
                    background: `${ac}08`, border: `1px solid ${ac}28`,
                    borderRadius: 16, padding: '14px 16px',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, transparent, ${ac}, transparent)`,
                      opacity: agent.animationState === 'working' ? 1 : 0.32,
                    }} />
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${ac}18`, border: `1px solid ${ac}42`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginBottom: 10,
                      boxShadow: agent.animationState === 'working' ? `0 0 20px ${ac}55` : 'none',
                    }}>🧑‍💻</div>
                    <div style={{ color: '#e8f4ff', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                      {agent.name?.split(' ')[0] ?? 'Agent'}
                    </div>
                    <div style={{ color: '#5a7a9a', fontSize: 10, marginBottom: 8 }}>
                      {agent.role ?? 'Unknown role'}
                    </div>
                    <div style={{
                      display: 'inline-block', background: `${ac}18`, border: `1px solid ${ac}42`,
                      borderRadius: 6, padding: '2px 8px', fontSize: 9,
                      color: ac, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6,
                    }}>
                      {agent.skill_level?.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', background: sc,
                        boxShadow: `0 0 6px ${sc}`,
                        animation: agent.animationState !== 'idle' ? 'pulseDot 1.5s ease infinite' : 'none',
                      }} />
                      <span style={{ color: sc, fontWeight: 600, textTransform: 'uppercase' }}>
                        {agent.animationState}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpPanel {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Live HUD (top-left overlay) ──────────────────────────────────────────────

function LiveHUD({ agents, isActive, activeHubs }) {
  const statColor = isActive ? '#10b981' : '#5a7a9a'
  return (
    <div style={{
      position: 'absolute', top: 14, left: 14,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none', zIndex: 5,
    }}>
      {/* System status */}
      <div style={{
        background: 'rgba(3,9,20,0.88)',
        border: `1px solid ${isActive ? 'rgba(6,182,212,0.42)' : 'rgba(26,58,92,0.5)'}`,
        borderRadius: 12, padding: '7px 13px',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: statColor,
          boxShadow: isActive ? `0 0 10px ${statColor}` : 'none',
          display: 'inline-block',
          animation: isActive ? 'pulseDot 1.2s ease infinite' : 'none',
        }} />
        <span style={{ color: statColor, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em' }}>
          {isActive ? 'SYSTEM ACTIVE' : 'STANDBY'}
        </span>
      </div>

      {/* Agent count */}
      <div style={{
        background: 'rgba(3,9,20,0.85)',
        border: '1px solid rgba(6,182,212,0.22)',
        borderRadius: 12, padding: '8px 13px',
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{ color: '#3d6080', fontSize: 8.5, letterSpacing: '0.16em', marginBottom: 3 }}>AGENTS DEPLOYED</div>
        <div style={{ color: '#e8f4ff', fontSize: 22, fontWeight: 800, fontFamily: '"Syne", sans-serif', lineHeight: 1 }}>
          {agents.length}
          <span style={{ color: '#3d6080', fontSize: 10, fontWeight: 400, marginLeft: 5 }}>ACTIVE</span>
        </div>
      </div>

      {/* Active hubs */}
      {activeHubs.length > 0 && (
        <div style={{
          background: 'rgba(3,9,20,0.85)',
          border: '1px solid rgba(26,58,92,0.42)',
          borderRadius: 12, padding: '8px 13px',
          backdropFilter: 'blur(14px)',
        }}>
          <div style={{ color: '#3d6080', fontSize: 8.5, letterSpacing: '0.16em', marginBottom: 5 }}>HUBS ONLINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activeHubs.map(h => {
              const hc = h === 'research' ? '#8b5cf6' : '#10b981'
              return (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: hc,
                    boxShadow: `0 0 7px ${hc}`, display: 'inline-block',
                  }} />
                  <span style={{ color: '#7aa3c4', fontSize: 10, fontWeight: 600 }}>
                    {h.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
function BuildingInterior({ building }) {
  const config = BUILDINGS[building]

  return (
    <group
      position={[
        config.pos[0],
        2,
        config.pos[2]
      ]}
    >
      {/* Floor */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[4, 0.1, 4]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#06b6d4"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Table */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[1.5, 0.1, 1]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      <group position={[-0.8,0.1,0]}>
        <mesh position={[0,0.65,0]}>
          <sphereGeometry args={[0.18,16,16]} />
          <meshStandardMaterial color="#ffd6b0" />
        </mesh>

        <mesh position={[0,0.3,0]}>
          <capsuleGeometry args={[0.12,0.45,4,8]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>
      </group>

      <group position={[0.8,0.1,0]}>
        <mesh position={[0,0.65,0]}>
          <sphereGeometry args={[0.18,16,16]} />
          <meshStandardMaterial color="#ffd6b0" />
        </mesh>

        <mesh position={[0,0.3,0]}>
          <capsuleGeometry args={[0.12,0.45,4,8]} />
          <meshStandardMaterial color="#8b5cf6" />
        </mesh>
      </group>

      {/* Screen */}
      <mesh position={[0, 1, -1.8]}>
        <boxGeometry args={[2, 1, 0.05]} />
        <meshStandardMaterial
          color="#000"
          emissive="#06b6d4"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  )
}


export default function SimulationWorld3D() {
  const agents     = useStore(s => s.agents)
  const isActive   = useStore(s => s.isActive)
  const activeHubs = useStore(s => s.activeHubs)

  const [zoomTarget,    setZoomTarget]    = useState(null)
  const [selectedZone,  setSelectedZone]  = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [enteredBuilding, setEnteredBuilding] = useState(null)

  const resActive = activeHubs.includes('research')
  const devActive = activeHubs.includes('developer')

  const inZone = zones =>
    agents.filter(a => Array.isArray(zones) ? zones.includes(a.currentZone) : a.currentZone === zones)

  const agentsByBuilding = {
    hub:      inZone(['hub', 'returning']),
    enquiry:  inZone(['toEnquiry', 'enquiry']),
    research: inZone(['toResearch', 'research']),
    dev:      inZone(['toDev', 'dev']),
  }

  const handleBuildingClick = useCallback(key => {
  const b = BUILDINGS[key]

  setZoomTarget(key)
  setEnteredBuilding(key)

  setSelectedAgent(null)

  setSelectedZone({
    name: b.label,
    desc: b.desc,
    color: b.color,
    key,
    agents: agentsByBuilding[key] || [],
  })
}, [agentsByBuilding])

  const handleClose = () => {
    setZoomTarget(null)
    setSelectedZone(null)
    setSelectedAgent(null)
    setEnteredBuilding(null)
  }

  const bPos   = key => BUILDINGS[key].pos
  const BEAM_H = 1.5

  return (
    <div
      className="relative w-full"
      style={{
        height: 580, borderRadius: 18, overflow: 'hidden',
        border: '1px solid rgba(6,182,212,0.22)',
        boxShadow: '0 0 90px rgba(6,182,212,0.09), 0 0 0 1px rgba(6,182,212,0.05)',
      }}
    >
      {/* ── Three.js canvas ── */}
      <Canvas
        camera={{ position: [0, 14, 22], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{
          background:
            'radial-gradient(circle at 50% 20%, #16274d 0%, #091120 45%, #02040a 100%)'
        }}
        onClick={() => { if (zoomTarget) handleClose() }}
      >
        <SceneEnvironment isActive={isActive} />
        <CameraController zoomTarget={zoomTarget} />
        <CityGround isActive={isActive} />

        {/* Buildings */}
        {Object.values(BUILDINGS).map(b => (
          <Building3D
            key={b.key}
            config={b}
            isActive={
              b.key === 'enquiry'  ? true :
              b.key === 'hub'      ? (isActive || agentsByBuilding.hub.length > 0) :
              b.key === 'research' ? resActive :
              b.key === 'dev'      ? devActive : false
            }
            agentCount={agentsByBuilding[b.key]?.length || 0}
            onClick={() => handleBuildingClick(b.key)}
          />
        ))}
        {enteredBuilding && (
          <BuildingInterior
            building={enteredBuilding}
            onClose={() => setEnteredBuilding(null)}
          />
        )}

        {/* Human agents */}
        {agents.map((agent, i) => (
          <HumanAgent3D
            key={agent.id}
            agent={agent}
            index={i}
            onSelect={a => { setSelectedAgent(a); setSelectedZone(null); setZoomTarget(null) }}
          />
        ))}

        {/* Static router agent at Enquiry */}
        <HumanAgent3D
          agent={{
            id: 'router', name: 'Router', skill_level: 'expert',
            currentZone: 'enquiry',
            animationState: agentsByBuilding.enquiry.length > 0 ? 'working' : 'idle',
          }}
          index={-1}
          onSelect={a => { setSelectedAgent(a); setSelectedZone(null); setZoomTarget(null) }}
        />

        {/* Connection beams */}
        <ConnectionBeam from={[bPos('hub')[0], BEAM_H, bPos('hub')[2]]}      to={[bPos('enquiry')[0],  BEAM_H, bPos('enquiry')[2]]}  color="#06b6d4" active={isActive} />
        <ConnectionBeam from={[bPos('enquiry')[0], BEAM_H, bPos('enquiry')[2]]} to={[bPos('research')[0], BEAM_H, bPos('research')[2]]} color="#8b5cf6" active={resActive} />
        <ConnectionBeam from={[bPos('enquiry')[0], BEAM_H, bPos('enquiry')[2]]} to={[bPos('dev')[0],      BEAM_H, bPos('dev')[2]]}      color="#10b981" active={devActive} />

        {/* Data packets */}
        {isActive && [0, 0.33, 0.66].map(d => (
          <DataPacket key={`hub-enq-${d}`}
            from={[bPos('hub')[0], BEAM_H, bPos('hub')[2]]}
            to={[bPos('enquiry')[0], BEAM_H, bPos('enquiry')[2]]}
            color="#06b6d4" delay={d} />
        ))}
        {resActive && [0, 0.5].map(d => (
          <DataPacket key={`enq-res-${d}`}
            from={[bPos('enquiry')[0], BEAM_H, bPos('enquiry')[2]]}
            to={[bPos('research')[0], BEAM_H, bPos('research')[2]]}
            color="#8b5cf6" delay={d} speed={0.35} />
        ))}
        {devActive && [0.25, 0.75].map(d => (
          <DataPacket key={`enq-dev-${d}`}
            from={[bPos('enquiry')[0], BEAM_H, bPos('enquiry')[2]]}
            to={[bPos('dev')[0], BEAM_H, bPos('dev')[2]]}
            color="#10b981" delay={d} speed={0.35} />
        ))}

        {/* Patrol drones */}
        <PatrolDrone orbitPhase={0}   color="#06b6d4" height={7.5} />
        <PatrolDrone orbitPhase={2.1} color="#8b5cf6" height={8.8} />
        <PatrolDrone orbitPhase={4.2} color="#10b981" height={7.0} />

        {/* Ambient particles */}
        <AmbientParticles />
        {enteredBuilding && (
          <BuildingInterior
            building={enteredBuilding}
          />
        )}
      </Canvas>

      {/* ── React overlays ── */}
      <LiveHUD agents={agents} isActive={isActive} activeHubs={activeHubs} />

      {/* Hint bar */}
      {!selectedZone && !selectedAgent && (
        <div
          className="absolute bottom-4 left-1/2"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(3,9,20,0.82)',
            border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 28, padding: '6px 20px',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
            animation: 'fadeUp 0.6s ease 0.4s both',
          }}
        >
          <span style={{ color: '#5a7a9a', fontSize: 10.5, letterSpacing: '0.1em' }}>
            🖱 CLICK BUILDING OR AGENT TO INSPECT  ·  SCROLL ZOOM  ·  DRAG ORBIT
          </span>
        </div>
      )}

      {/* Agent detail panel */}
      {selectedAgent && !selectedZone && (
        <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}

      {/* Building inspection panel */}
      {selectedZone && (
        <BuildingInspectionPanel zone={selectedZone} onClose={handleClose} />
      )}
    </div>
  )
}