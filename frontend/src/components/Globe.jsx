import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import styles from './Globe.module.css'

const EARTH_R = 1
const KM_PER_UNIT = 6371
const TEX_BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets'

const CAT = {
  station: { color: '#ffffff', size: 0.060, label: 'Space Stations' },
  starlink: { color: '#99ccff', size: 0.022, label: 'Starlink' },
  oneweb: { color: '#7799ee', size: 0.022, label: 'OneWeb' },
  gps: { color: '#00d4ff', size: 0.036, label: 'Navigation (GPS/GNSS)' },
  weather: { color: '#ffb300', size: 0.038, label: 'Weather' },
  earth: { color: '#00ff9d', size: 0.030, label: 'Earth Obs.' },
  science: { color: '#ee88ff', size: 0.040, label: 'Science' },
  debris: { color: '#445566', size: 0.018, label: 'Debris / Rocket Body' },
  other: { color: '#8899aa', size: 0.022, label: 'Other' },
}

function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  )
}

function drawSatIcon(ctx, type, color, s) {
  const cx = s / 2
  const cy = s / 2

  switch (type) {
    case 'station':
      ctx.fillStyle = '#ffffffdd'
      ctx.fillRect(2, cy - 2, 60, 5)
      ctx.fillStyle = color + 'aa'
      ctx.fillRect(2, cy - 10, 16, 8)
      ctx.fillRect(2, cy + 3, 16, 8)
      ctx.fillRect(46, cy - 10, 16, 8)
      ctx.fillRect(46, cy + 3, 16, 8)
      ctx.fillStyle = '#ffffffee'
      ctx.fillRect(22, cy - 10, 20, 21)
      ctx.fillStyle = '#88ccffaa'
      ctx.fillRect(24, cy - 14, 16, 4)
      ctx.fillRect(24, cy + 11, 16, 4)
      break

    case 'starlink':
    case 'oneweb':
      ctx.fillStyle = color + 'cc'
      ctx.fillRect(8, cy - 2, 48, 5)
      ctx.fillStyle = color + '77'
      ctx.fillRect(24, cy - 14, 16, 12)
      break

    case 'gps':
      ctx.fillStyle = color + 'bb'
      ctx.fillRect(4, cy - 3, 18, 7)
      ctx.fillRect(42, cy - 3, 18, 7)
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3
        const x = cx + 11 * Math.cos(a)
        const y = cy + 11 * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = color + 'ee'
      ctx.fill()
      break

    case 'weather':
      ctx.fillStyle = color + 'bb'
      ctx.beginPath()
      ctx.arc(cx, cy, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#00000055'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3
        ctx.beginPath()
        ctx.moveTo(cx + 7 * Math.cos(a), cy + 7 * Math.sin(a))
        ctx.lineTo(cx + 22 * Math.cos(a), cy + 22 * Math.sin(a))
        ctx.stroke()
      }
      ctx.fillStyle = '#ffffffdd'
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'earth':
      ctx.fillStyle = color + '99'
      ctx.fillRect(12, 12, 40, 40)
      ctx.strokeStyle = color + 'ee'
      ctx.lineWidth = 2.5
      ctx.strokeRect(12, 12, 40, 40)
      ctx.fillStyle = '#000000bb'
      ctx.beginPath()
      ctx.arc(cx, cy, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = color + 'ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, 11, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = color + '88'
      ctx.fillRect(2, cy - 4, 10, 8)
      ctx.fillRect(52, cy - 4, 10, 8)
      break

    case 'science':
      ctx.fillStyle = color + 'ee'
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 - Math.PI / 2
        const r = i % 2 === 0 ? 28 : 9
        if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffffffdd'
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'debris':
      ctx.strokeStyle = color + 'aa'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(14, 14)
      ctx.lineTo(50, 50)
      ctx.moveTo(50, 14)
      ctx.lineTo(14, 50)
      ctx.moveTo(cx, 10)
      ctx.lineTo(cx, 54)
      ctx.stroke()
      break

    default:
      ctx.fillStyle = color + '99'
      ctx.beginPath()
      ctx.arc(cx, cy, 20, 0, Math.PI * 2)
      ctx.fill()
  }
}

const texCache = {}
function getCatTexture(type) {
  if (texCache[type]) return texCache[type]
  const meta = CAT[type] ?? CAT.other
  const s = 64
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  drawSatIcon(cv.getContext('2d'), type, meta.color, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.needsUpdate = true
  texCache[type] = tex
  return tex
}

function EarthMesh() {
  const meshRef = useRef()

  useEffect(() => {
    const mat = meshRef.current?.material
    if (!mat) return
    const loader = new THREE.TextureLoader()
    loader.load(`${TEX_BASE}/earth_atmos_2048.jpg`, t => { mat.map = t; mat.color.set('#ffffff'); mat.needsUpdate = true })
    loader.load(`${TEX_BASE}/earth_normal_2048.jpg`, t => { mat.normalMap = t; mat.needsUpdate = true })
    loader.load(`${TEX_BASE}/earth_specular_2048.jpg`, t => { mat.specularMap = t; mat.needsUpdate = true })
  }, [])

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_R, 72, 72]} />
        <meshPhongMaterial color="#1a3f6a" specular={new THREE.Color('#335577')} shininess={25} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.018, 72, 72]} />
        <meshPhongMaterial color="#4488ff" transparent opacity={0.07} depthWrite={false} />
      </mesh>
    </>
  )
}

function CatPoints({ catKey, satellites }) {
  const meta = CAT[catKey]
  const tex = useMemo(() => getCatTexture(catKey), [catKey])

  const { positions, count } = useMemo(() => {
    const sats = satellites.filter(s => (s.category ?? 'other') === catKey)
    const pos = new Float32Array(sats.length * 3)
    sats.forEach((sat, i) => {
      const r = EARTH_R + sat.alt_km / KM_PER_UNIT
      const v = latLonToVec3(sat.lat, sat.lon, r)
      pos[i * 3] = v.x
      pos[i * 3 + 1] = v.y
      pos[i * 3 + 2] = v.z
    })
    return { positions: pos, count: sats.length }
  }, [satellites, catKey])

  if (count === 0) return null

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={meta.size} transparent alphaTest={0.04} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function SelectedMarker({ satellite }) {
  if (!satellite) return null

  const cat = satellite.category ?? 'other'
  const meta = CAT[cat]
  const r = EARTH_R + satellite.alt_km / KM_PER_UNIT
  const pos = latLonToVec3(satellite.lat, satellite.lon, r)

  const iconTex = useMemo(() => {
    const s = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = s
    drawSatIcon(cv.getContext('2d'), cat, meta.color, s)
    return new THREE.CanvasTexture(cv)
  }, [cat, meta.color])

  const glowTex = useMemo(() => {
    const s = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = s
    const ctx = cv.getContext('2d')
    const g = ctx.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, 60)
    g.addColorStop(0, meta.color + '66')
    g.addColorStop(0.5, meta.color + '22')
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = '#00d4ffcc'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(s / 2, s / 2, 56, 0, Math.PI * 2)
    ctx.stroke()
    return new THREE.CanvasTexture(cv)
  }, [meta.color])

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <sprite scale={[0.30, 0.30, 0.30]}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} />
      </sprite>
      <sprite scale={[0.10, 0.10, 0.10]}>
        <spriteMaterial map={iconTex} transparent alphaTest={0.04} />
      </sprite>
    </group>
  )
}

function OrbitLine({ path }) {
  const geom = useMemo(() => {
    if (!path?.length) return null
    const pts = []
    for (let i = 0; i < path.length - 1; i++) {
      const a = latLonToVec3(path[i].lat, path[i].lon, EARTH_R + 0.025)
      const b = latLonToVec3(path[i + 1].lat, path[i + 1].lon, EARTH_R + 0.025)
      if (a.clone().normalize().dot(b.clone().normalize()) > -0.3) {
        pts.push(a, b)
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [path])

  if (!geom) return null

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#00d4ff" transparent opacity={0.45} />
    </lineSegments>
  )
}

function RaycastSelector({ satellites, onSelect }) {
  const { camera, gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const ray = new THREE.Raycaster()

    const onClick = e => {
      const rect = canvas.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        ((e.clientY - rect.top) / rect.height) * -2 + 1,
      )
      ray.setFromCamera(ndc, camera)

      let best = null
      let bestDist = 0.05
      for (const sat of satellites) {
        const r = EARTH_R + sat.alt_km / KM_PER_UNIT
        const p = latLonToVec3(sat.lat, sat.lon, r)
        const d = ray.ray.distanceToPoint(p)
        if (d < bestDist) {
          bestDist = d
          best = sat
        }
      }
      onSelect(best)
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [satellites, onSelect, camera, gl])

  return null
}

function Scene({ satellites, selected, onSelect, orbitPath }) {
  return (
    <>
      <color attach="background" args={['#070b10']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} color="#fff8f0" />
      <Stars radius={300} depth={60} count={5000} factor={3} saturation={0} fade speed={0} />
      <EarthMesh />
      <OrbitLine path={orbitPath} />
      {Object.keys(CAT).map(key => (
        <CatPoints key={key} catKey={key} satellites={satellites} />
      ))}
      <SelectedMarker satellite={selected} />
      <RaycastSelector satellites={satellites} onSelect={onSelect} />
      <OrbitControls enablePan={false} minDistance={1.35} maxDistance={6} dampingFactor={0.07} enableDamping />
    </>
  )
}

export default function Globe({ satellites, selected, onSelect, orbitPath }) {
  return (
    <div className={styles.wrap}>
      <Canvas camera={{ position: [0, 0, 2.7], fov: 45 }}>
        <Scene satellites={satellites} selected={selected} onSelect={onSelect} orbitPath={orbitPath} />
      </Canvas>
      <div className={styles.legend}>
        {Object.entries(CAT).map(([key, val]) => (
          <span key={key} style={{ color: val.color }}>◈ {val.label}</span>
        ))}
      </div>
    </div>
  )
}
