'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

type Mode = '1' | '4' | '6'

const W = '#f0ece4'
const DIM = '#888'
const BDR = '2px solid #222'
const GLOW = `0 0 20px rgba(240, 236, 228, 0.08)`

const OVERLAY_TEXTURES = [
  '/textures/Texture1.png',
  '/textures/Texture2.png',
  '/textures/Texture3.png',
  '/textures/Texture4.png',
  '/textures/Texture5.png',
  '/textures/Texture6.png',
  '/textures/Texture7.png',
  '/textures/Texture8.png',
  '/textures/Texture9.png',
  '/textures/Texture10.png',
  '/textures/Texture11.png',
  '/textures/Texture12.png',
  '/textures/Texture13.png',
  '/textures/Texture14.png',
  '/textures/Texture15.png',
]

const DUOTONE_PRESETS = [
  { name: 'ACID', color: [180, 255, 0] as [number, number, number] },
  { name: 'EMBER', color: [242, 53, 53] as [number, number, number] },
  { name: 'BLUSH', color: [255, 60, 140] as [number, number, number] },
  { name: 'VOID', color: [131, 56, 236] as [number, number, number] },
  { name: 'BREEZE', color: [62, 138, 217] as [number, number, number] },
]

const sidebar_filters = [
  {
    label: 'TONE',
    filters: [
      { id: 'invert', label: 'INVERT' },
      { id: 'threshold', label: 'THRESHOLD' },
      { id: 'posterize', label: 'POSTERIZE' },
      { id: 'halftone', label: 'HALFTONE' },
      { id: 'duotone', label: 'DUOTONE' },
    ]
  },
  {
    label: 'FILM LOOK',
    filters: [
      { id: 'bw', label: 'B&W' },
      { id: 'sepia', label: 'SEPIA' },
      { id: 'xpro', label: 'X-PRO' },
      { id: 'expired', label: 'EXPIRED' },
      { id: 'crt', label: 'CRT' },
      { id: 'glow', label: 'GLOW' },
    ]
  },
  {
    label: 'DAMAGE',
    filters: [
      { id: 'contrast', label: 'HI-CONTRAST' },
      { id: 'bleach', label: 'BLEACH' },
      { id: 'crush', label: 'CRUSH' },
    ]
  },
]

function filter_to_cam(
  src: HTMLVideoElement | HTMLCanvasElement,
  dst: HTMLCanvasElement,
  filters: Set<string>,
  grain: number,
  duotoneColor: [number, number, number],
  thresholdVal: number = 128,
  halftone_size: number = 8
) {
  const w = (src as HTMLVideoElement).videoWidth || (src as HTMLCanvasElement).width || 640
  const h = (src as HTMLVideoElement).videoHeight || (src as HTMLCanvasElement).height || 480
  dst.width = w
  dst.height = h
  const ctx = dst.getContext('2d', { willReadFrequently: true })!
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(src, -w, 0, w, h)
  ctx.restore()
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    if (filters.has('bw')) { const gray = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = gray }
    if (filters.has('sepia')) {
      const tr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
      const tg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
      const tb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
      r = tr; g = tg; b = tb
    }
    if (filters.has('invert')) { r = 255 - r; g = 255 - g; b = 255 - b }
    if (filters.has('threshold')) { const v = (0.299 * r + 0.587 * g + 0.114 * b) > thresholdVal ? 255 : 0; r = g = b = v }
    if (filters.has('posterize')) {
      const lvl = 4
      r = Math.round(r / 255 * (lvl - 1)) / (lvl - 1) * 255
      g = Math.round(g / 255 * (lvl - 1)) / (lvl - 1) * 255
      b = Math.round(b / 255 * (lvl - 1)) / (lvl - 1) * 255
    }
    if (filters.has('duotone')) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const t = gray / 255
      r = t * duotoneColor[0]; g = t * duotoneColor[1]; b = t * duotoneColor[2]
    }
    if (filters.has('xpro')) { r = Math.min(255, r * 1.1 + 10); g = Math.max(0, g * 0.85); b = Math.min(255, b * 1.2 + 20) }
    if (filters.has('expired')) { r = Math.min(255, r * 1.05 + 15); g = Math.max(0, g * 0.9 + 5); b = Math.max(0, b * 0.7) }
    if (filters.has('contrast')) {
      const f = 2.5
      r = Math.min(255, Math.max(0, f * (r - 128) + 128))
      g = Math.min(255, Math.max(0, f * (g - 128) + 128))
      b = Math.min(255, Math.max(0, f * (b - 128) + 128))
    }
    if (filters.has('bleach')) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = Math.min(255, (r + (gray - r) * 0.6) * 1.3)
      g = Math.min(255, (g + (gray - g) * 0.6) * 1.3)
      b = Math.min(255, (b + (gray - b) * 0.6) * 1.3)
    }
    if (filters.has('crush')) {
      r = r < 40 ? 0 : r > 220 ? 255 : r
      g = g < 40 ? 0 : g > 220 ? 255 : g
      b = b < 40 ? 0 : b > 220 ? 255 : b
    }
    if (grain > 0) {
      const noise = (Math.random() - 0.5) * grain * 2.5
      r = Math.min(255, Math.max(0, r + noise))
      g = Math.min(255, Math.max(0, g + noise))
      b = Math.min(255, Math.max(0, b + noise))
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b
  }

  ctx.putImageData(imageData, 0, 0)

  if (filters.has('crt')) {
    const srcData = ctx.getImageData(0, 0, w, h)
    const sd = srcData.data
    for (let y = 0; y < h; y++) {
      const line = y % 3
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const col = x % 3
        if (line === 2) {
          sd[i] *= 0.3; sd[i+1] *= 0.3; sd[i+2] *= 0.3
        } else if (col === 0) {
          sd[i+1] *= 0.5; sd[i+2] *= 0.5
        } else if (col === 1) {
          sd[i] *= 0.5; sd[i+2] *= 0.5
        } else {
          sd[i] *= 0.5; sd[i+1] *= 0.5
        }
      }
    }
    ctx.putImageData(srcData, 0, 0)
  }

  if (filters.has('glow')) {
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    tmp.getContext('2d')!.drawImage(dst, 0, 0)
    ctx.save()
    ctx.filter = 'blur(8px)'
    ctx.globalAlpha = 0.55
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(tmp, 0, 0)
    ctx.filter = 'blur(18px)'
    ctx.globalAlpha = 0.3
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
  }

  if (filters.has('halftone')) {
    const srcData = ctx.getImageData(0, 0, w, h)
    const sd = srcData.data
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += halftone_size) {
      for (let x = 0; x < w; x += halftone_size) {
        const i = (Math.floor(y) * w + Math.floor(x)) * 4
        if (i >= sd.length) continue
        const brightness = (0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2]) / 255
        const dotBrightness = filters.has('duotone')
          ? Math.pow(brightness, 0.5)
          : brightness
        const rad = dotBrightness * (halftone_size / 2)
        if (rad > 0.2) {
          ctx.fillStyle = filters.has('duotone')
            ? `rgb(${sd[i]},${sd[i+1]},${sd[i+2]})`
            : '#ffffff'
          ctx.beginPath()
          ctx.arc(x + halftone_size / 2, y + halftone_size / 2, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

export default function PhotoBooth() {
  const [mode, setMode] = useState<Mode>('4')
  const [active_filt, setactive_filt] = useState<Set<string>>(new Set())
  const [grain, setGrain] = useState(20)
  const [duotoneColor, setDuotoneColor] = useState<[number, number, number]>([255, 80, 20])
  const [frames, setFrames] = useState<(string | null)[]>([null, null, null, null])
  const [cameraOn, setCameraOn] = useState(false)
  const [cam_deny, setcam_deny] = useState(false)
  const [counting, setCounting] = useState(false)
  const [countNum, setCountNum] = useState(3)
  const [flashing, setFlashing] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [takenCount, setTakenCount] = useState(0)
  const [stripDone, setStripDone] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)
  const [thresholdVal, setThresholdVal] = useState(128)
  const [halftone_size, setHalftone_size] = useState(8)
  const [currentTexture, setCurrentTexture] = useState<string>('')
  const [cursorType, setCursorType] = useState<'default' | 'pointer' | 'zoom-in'>('default')

  const dotRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fxCanvas = useRef<HTMLCanvasElement>(null)
  const snapCanvas = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const active_filtRef = useRef(active_filt)
  const grainRef = useRef(grain)
  const duotoneColorRef = useRef(duotoneColor)
  const thresholdValRef = useRef(thresholdVal)
  const halftone_sizeRef = useRef(halftone_size)

  const stripCount = mode === '1' ? 1 : mode === '4' ? 4 : 6

  useEffect(() => { halftone_sizeRef.current = halftone_size }, [halftone_size])
  useEffect(() => { active_filtRef.current = active_filt }, [active_filt])
  useEffect(() => { grainRef.current = grain }, [grain])
  useEffect(() => { duotoneColorRef.current = duotoneColor }, [duotoneColor])
  useEffect(() => { thresholdValRef.current = thresholdVal }, [thresholdVal])

  useEffect(() => {
    const idx = Math.floor(Math.random() * OVERLAY_TEXTURES.length)
    setCurrentTexture(OVERLAY_TEXTURES[idx])

    const handleMouseMove = (e: MouseEvent) => {
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + 'px'
        dotRef.current.style.top = e.clientY + 'px'
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const tick = useCallback(() => {
    const vid = videoRef.current
    const canvas = fxCanvas.current
    if (vid && canvas && vid.readyState >= 2) {
      filter_to_cam(vid, canvas, active_filtRef.current, grainRef.current, duotoneColorRef.current, thresholdValRef.current, halftone_sizeRef.current)
    }
    animRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    if (cameraOn) {
      animRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(animRef.current)
    }
  }, [cameraOn, tick])

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = s
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.style.display = 'block' }
      setCameraOn(true)
    } catch { setcam_deny(true) }
  }, [])

  const flash = useCallback(() => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), 110)
  }, [])

  const shoot = useCallback((): string | null => {
    const canvas = fxCanvas.current
    const snap = snapCanvas.current
    if (!canvas || !snap) return null
    snap.width = canvas.width; snap.height = canvas.height
    snap.getContext('2d')!.drawImage(canvas, 0, 0)
    return snap.toDataURL('image/jpeg', 0.92)
  }, [])

  const runStrip = useCallback((total: number) => {
    setShooting(true)
    setStripDone(false)
    setTakenCount(0)
    let taken = 0
    const takeOne = () => {
      setCounting(true)
      let n = 3
      setCountNum(n)
      const cd = setInterval(() => {
        n--
        if (n <= 0) {
          clearInterval(cd)
          setCounting(false)
          flash()
          const url = shoot()
          taken++
          setTakenCount(taken)
          setFrames(prev => { const next = [...prev]; next[taken - 1] = url; return next })
          if (taken < total) setTimeout(takeOne, 650)
          else { setShooting(false); setStripDone(true) }
        } else { setCountNum(n) }
      }, 650)
    }
    takeOne()
  }, [flash, shoot])

  const handleShoot = useCallback(() => {
    if (counting || shooting) return
    if (!cameraOn) { startCamera(); return }
    runStrip(stripCount)
  }, [counting, shooting, cameraOn, startCamera, stripCount, runStrip])

  const filter_toggle = (id: string) => {
    setactive_filt(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleModeChange = (m: Mode) => {
    setMode(m)
    const n = m === '1' ? 1 : m === '4' ? 4 : 6
    setFrames(Array(n).fill(null))
    setTakenCount(0); setStripDone(false)
  }

  const mono = "'Space Mono', monospace"
  const display = "'Bebas Neue', sans-serif"
  const pixFont = "'Pixelify Sans', monospace"

  const textureBg = currentTexture
    ? `url("${currentTexture}") center/cover no-repeat`
    : 'none'

  return (
    <div style={{ background: '#0d0d0d', color: W, fontFamily: mono, height: '100vh', width: '100%', display: 'grid', position: 'relative', overflow: 'hidden', cursor: 'none' }}>

      <div ref={dotRef} style={{
        position: 'fixed',
        left: '-100px',
        top: '-100px',
        width: cursorType === 'pointer' ? '8px' : '10px',
        height: cursorType === 'pointer' ? '8px' : '10px',
        border: '1.5px solid #f0ece4',
        borderRadius: '50%',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        zIndex: 999999,
        transition: 'width 0.1s, height 0.1s, background 0.1s',
        background: cursorType === 'zoom-in' ? '#f0ece4' : 'transparent',
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', overflow: 'hidden', height: '100vh' }}>

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 24, gap: 20 }}>

          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: textureBg,
            opacity: 0.5,
            mixBlendMode: 'multiply' as const,
          }} />

          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 1,
          }}>
            <div style={{ position: 'absolute', top: 10, left: 10, width: 18, height: 18, borderTop: '1px solid #3a3a3a', borderLeft: '1px solid #3a3a3a', pointerEvents: 'none', zIndex: 10 }} />
            <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderTop: '1px solid #3a3a3a', borderRight: '1px solid #3a3a3a', pointerEvents: 'none', zIndex: 10 }} />
            <div style={{ position: 'absolute', bottom: 10, left: 10, width: 18, height: 18, borderBottom: '1px solid #3a3a3a', borderLeft: '1px solid #3a3a3a', pointerEvents: 'none', zIndex: 10 }} />
            <div style={{ position: 'absolute', bottom: 10, right: 10, width: 18, height: 18, borderBottom: '1px solid #3a3a3a', borderRight: '1px solid #3a3a3a', pointerEvents: 'none', zIndex: 10 }} />

            <div style={{ width: '100%', maxWidth: 580, aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', position: 'relative', border: '2px solid #1a1a1a', flexShrink: 0, boxShadow: cameraOn ? GLOW : 'none', transition: 'all 0.4s ease' }}>
              {!cameraOn && !cam_deny && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#444', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', background: '#020202', fontFamily: pixFont }}>
                  <div style={{ fontFamily: display, fontSize: 50, color: '#111', lineHeight: 1 }}>[ ]</div>
                  <div>CAMERA INACTIVE</div>
                </div>
              )}
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
              <canvas ref={fxCanvas} style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOn ? 'block' : 'none', position: 'absolute', inset: 0, zIndex: 1 }} />
              {counting && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000cc', backdropFilter: 'blur(4px)', zIndex: 20 }}>
                  <div style={{ fontFamily: pixFont, fontStyle: 'italic', fontSize: 64, color: W, lineHeight: 1 }}>{countNum}</div>
                </div>
              )}
              {flashing && <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 30 }} />}
            </div>
          </div>

          <div style={{ display: 'flex', height: 120, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: '#121212', border: BDR, padding: 8, gap: 8, zIndex: 1 }}>
            {frames.map((frame, i) => (
              <div
                key={i}
                onClick={() => frame && setSelectedFrame(frame)}
                onMouseEnter={() => { if (frame) setCursorType('zoom-in') }}
                onMouseLeave={() => setCursorType('default')}
                style={{ flex: 1, background: '#050505', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: frame ? 'zoom-in' : 'default', borderRadius: 8, border: frame ? '1px solid #333' : '1px dashed #222' }}
              >
                {frame
                  ? <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontFamily: pixFont, fontSize: 16, color: '#222' }}>✕</span>
                }
                <span style={{ position: 'absolute', bottom: 6, left: 8, fontFamily: pixFont, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: BDR, padding: '24px 0', position: 'relative' }}>

          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: textureBg,
            opacity: 0.5,
            mixBlendMode: 'multiply' as const,
          }} />

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: '#121212', opacity: 0.4 }} />

          <div style={{ borderBottom: BDR, padding: '0 24px 24px 24px', position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: display, fontSize: 14, letterSpacing: '0.2em', color: DIM, marginBottom: 16 }}>SHOOT MODE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {([['1', 'SINGLE'], ['4', 'STRIP 4×'], ['6', 'BURST 6×']] as [Mode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  onMouseEnter={() => setCursorType('pointer')}
                  onMouseLeave={() => setCursorType('default')}
                  style={{ background: mode === m ? '#1a1a1a' : '#090909', border: `2px solid ${mode === m ? W : '#222'}`, color: mode === m ? W : '#666', fontFamily: pixFont, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '16px 12px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.5, borderRadius: '10px', transition: 'all 0.2s ease' }}
                >
                  <span style={{ fontFamily: display, fontSize: 28, display: 'block', lineHeight: 1, marginBottom: 4, color: mode === m ? W : '#333' }}>{m}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '24px', position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: display, fontSize: 14, letterSpacing: '0.2em', color: DIM, marginBottom: 16 }}>FILTERS</div>
            {sidebar_filters.map(group => (
              <div key={group.label} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: pixFont, fontSize: 10, letterSpacing: '0.15em', color: '#555', marginBottom: 10, textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: 4 }}>// {group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {group.filters.map(f => (
                    <button
                      key={f.id}
                      onClick={() => filter_toggle(f.id)}
                      onMouseEnter={() => setCursorType('pointer')}
                      onMouseLeave={() => setCursorType('default')}
                      style={{ background: active_filt.has(f.id) ? '#1a1a1a' : '#090909', border: `2px solid ${active_filt.has(f.id) ? W : '#222'}`, color: active_filt.has(f.id) ? W : '#666', fontFamily: pixFont, fontSize: 11, textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s ease' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {active_filt.has('duotone') && (
              <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap', background: '#090909', padding: 12, borderRadius: 8, border: '1px solid #222' }}>
                {DUOTONE_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setDuotoneColor(p.color)}
                    onMouseEnter={() => setCursorType('pointer')}
                    onMouseLeave={() => setCursorType('default')}
                    style={{ padding: '8px 12px', fontSize: '10px', borderRadius: '6px', fontFamily: pixFont, background: `rgb(${p.color.join(',')})`, color: p.name === 'ACID' ? '#000' : '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {active_filt.has('halftone') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, background: '#090909', padding: 12, borderRadius: 8, border: '1px solid #222' }}>
                <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM }}>DOT SIZE</span>
                <input type='range' min={4} max={24} step={1} value={halftone_size} onChange={e => setHalftone_size(+e.target.value)} style={{ flex: 1, accentColor: W }} />
                <span style={{ fontFamily: pixFont, fontSize: 11, color: DIM, width: 25, textAlign: 'right' }}>{halftone_size}</span>
              </div>
            )}

            {active_filt.has('threshold') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, background: '#090909', padding: 12, borderRadius: 8, border: '1px solid #222' }}>
                <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM }}>THRESHOLD</span>
                <input type="range" min={0} max={255} value={thresholdVal} onChange={e => setThresholdVal(+e.target.value)} style={{ flex: 1, accentColor: W }} />
                <span style={{ fontFamily: pixFont, fontSize: 11, color: DIM, width: 25, textAlign: 'right' }}>{thresholdVal}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, background: '#090909', padding: 12, borderRadius: 8, border: '1px solid #222' }}>
              <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM }}>GRAIN</span>
              <input type="range" min={0} max={100} value={grain} onChange={e => setGrain(+e.target.value)} style={{ flex: 1, accentColor: W }} />
              <span style={{ fontFamily: pixFont, fontSize: 11, color: DIM, width: 25, textAlign: 'right' }}>{grain}</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: '0 24px', position: 'relative', zIndex: 1 }}>
            <button
              onClick={handleShoot}
              disabled={counting || shooting}
              onMouseEnter={() => setCursorType('pointer')}
              onMouseLeave={() => setCursorType('default')}
              style={{ width: '100%', background: (counting || shooting) ? 'none' : W, color: (counting || shooting) ? DIM : '#000', border: `2px solid ${(counting || shooting) ? '#333' : W}`, fontFamily: pixFont, fontSize: 12, letterSpacing: '0.2em', padding: '16px 20px', borderRadius: '10px', cursor: (counting || shooting) ? 'not-allowed' : 'pointer', transition: '0.2s ease', textTransform: 'uppercase', fontWeight: 'bold' }}
            >
              {counting ? `${countNum}` : shooting ? `${takenCount} / ${stripCount}` : stripDone ? '↺  RESHOOT' : '⬤  SHOOT'}
            </button>
          </div>
        </div>
      </div>

      {selectedFrame && (
        <div onClick={() => setSelectedFrame(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#050505f5', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'none' }}>
          <img src={selectedFrame} style={{ maxWidth: '90%', maxHeight: '70%', border: BDR, borderRadius: '16px' }} alt="Captured" />
          <div style={{ marginTop: 30, display: 'flex', gap: 16 }}>
            <a href={selectedFrame} download={`booth-${Date.now()}.jpg`} onClick={(e) => e.stopPropagation()} style={{ fontFamily: display, fontSize: 24, color: '#000', background: W, padding: '12px 36px', textDecoration: 'none', letterSpacing: '0.05em', borderRadius: '10px', fontWeight: 'bold' }}>DOWNLOAD</a>
            <button
              onClick={() => setSelectedFrame(null)}
              onMouseEnter={() => setCursorType('pointer')}
              onMouseLeave={() => setCursorType('default')}
              style={{ fontFamily: display, fontSize: 24, color: W, background: '#1a1a1a', border: BDR, padding: '12px 36px', borderRadius: '10px' }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <canvas ref={snapCanvas} style={{ display: 'none' }} />

      <style>{`
        * { cursor: none !important; }
        button:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        button:active:not(:disabled) { transform: translateY(0px); }
        ::-webkit-scrollbar { width: 6px; background: #121212; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
      `}</style>
    </div>
  )
}