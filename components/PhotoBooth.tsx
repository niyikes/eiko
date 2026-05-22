'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

type Mode = '1' | '4' | '6'

const W = '#f0ece4'
const DIM = '#888'
const BDR = '1px solid #2a2a2a'

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`

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
  if (filters.has('halftone')) {
    const srcData = ctx.getImageData(0, 0, w, h)
    const sd = srcData.data
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    for (let y = 0; y < h; y += halftone_size) {
      for (let x = 0; x < w; x += halftone_size) {
        const i = (Math.floor(y) * w + Math.floor(x)) * 4
        if (i >= sd.length) continue
        const brightness = (0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2]) / 255
        const rad = brightness * (halftone_size / 2)
        if (rad > 0.2) {
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

  useEffect(() => { active_filtRef.current = active_filt }, [active_filt])
  useEffect(() => { grainRef.current = grain }, [grain])
  useEffect(() => { duotoneColorRef.current = duotoneColor }, [duotoneColor])
  useEffect(() => { thresholdValRef.current = thresholdVal }, [thresholdVal])
  useEffect(() => { halftone_sizeRef.current = halftone_size }, [halftone_size])

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
  const pixFont = "'Pixelify Sans', monospace"
  const display = "'Bebas Neue', sans-serif"

  return (
    <div style={{ background: '#0d0d0d', color: W, fontFamily: mono, height: '100vh', width: '100%', display: 'grid', position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, opacity: 0.6, backgroundImage: NOISE, backgroundRepeat: 'repeat', mixBlendMode: 'overlay' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.75) 100%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden', height: '100vh' }}>

        <div style={{
          display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 20, gap: 16,
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.012) 59px, rgba(255,255,255,0.012) 60px), repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.012) 59px, rgba(255,255,255,0.012) 60px)`
        }}>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', position: 'relative', overflow: 'hidden', border: '1px solid #1c1c1c', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.9)' }}>

            <div style={{ position: 'absolute', top: 10, left: 10, width: 20, height: 20, borderTop: '1px solid #3a3a3a', borderLeft: '1px solid #3a3a3a', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderTop: '1px solid #3a3a3a', borderRight: '1px solid #3a3a3a', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 10, left: 10, width: 20, height: 20, borderBottom: '1px solid #3a3a3a', borderLeft: '1px solid #3a3a3a', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderBottom: '1px solid #3a3a3a', borderRight: '1px solid #3a3a3a', pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontFamily: pixFont, fontSize: 9, letterSpacing: '0.3em', color: '#2e2e2e', textTransform: 'uppercase' }}>VIEWFINDER — {cameraOn ? 'LIVE' : 'STANDBY'}</span>
            </div>

            <div style={{ width: '100%', maxWidth: 560, aspectRatio: '4/3', overflow: 'hidden', position: 'relative', border: cameraOn ? '1px solid #2e2e2e' : '1px solid #161616', flexShrink: 0, boxShadow: cameraOn ? '0 0 0 1px #111, 0 0 30px rgba(0,0,0,0.9)' : 'none', transition: 'all 0.4s ease' }}>
              {!cameraOn && !cam_deny && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#2a2a2a', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', background: '#020202', fontFamily: pixFont }}>
                  <div style={{ fontFamily: display, fontSize: 48, color: '#151515', lineHeight: 1 }}>[ — ]</div>
                  <div>NO SIGNAL</div>
                </div>
              )}
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
              <canvas ref={fxCanvas} style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOn ? 'block' : 'none', position: 'absolute', inset: 0 }} />
              {counting && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)', zIndex: 20 }}>
                  <div style={{ fontFamily: display, fontSize: 180, color: W, lineHeight: 1, opacity: 0.9, letterSpacing: '-0.05em' }}>{countNum}</div>
                </div>
              )}
              {flashing && <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 30 }} />}
            </div>
          </div>

          {mode !== '1' && (
            <div style={{ display: 'flex', height: 100, flexShrink: 0, overflow: 'hidden', background: '#080808', border: '1px solid #1c1c1c', padding: 6, gap: 6, boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.8)' }}>
              {frames.map((frame, i) => (
                <div key={i} onClick={() => frame && setSelectedFrame(frame)} style={{ flex: 1, background: '#040404', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: frame ? 'zoom-in' : 'default', border: frame ? '1px solid #2e2e2e' : '1px dashed #191919' }}>
                  {frame
                    ? <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontFamily: pixFont, fontSize: 14, color: '#1e1e1e' }}>—</span>
                  }
                  <span style={{ position: 'absolute', bottom: 4, left: 6, fontFamily: pixFont, fontSize: 8, color: '#333', letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#0a0a0a', backgroundImage: NOISE, backgroundBlendMode: 'overlay', borderLeft: '1px solid #1e1e1e', padding: '20px 0', boxShadow: 'inset 3px 0 16px rgba(0,0,0,0.6)' }}>

          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ fontFamily: pixFont, fontSize: 9, letterSpacing: '0.3em', color: '#333', marginBottom: 14, textTransform: 'uppercase' }}>// MODE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {([['1', 'SINGLE'], ['4', '4× STRIP'], ['6', '6× BURST']] as [Mode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => handleModeChange(m)} style={{ background: mode === m ? '#141414' : 'transparent', border: `1px solid ${mode === m ? '#444' : '#222'}`, color: mode === m ? W : '#444', fontFamily: pixFont, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 8px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.6, boxShadow: mode === m ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none', transition: 'all 0.15s ease' }}>
                  <span style={{ fontFamily: display, fontSize: 26, display: 'block', lineHeight: 1, marginBottom: 3, color: mode === m ? W : '#333' }}>{m}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ fontFamily: pixFont, fontSize: 9, letterSpacing: '0.3em', color: '#333', marginBottom: 16, textTransform: 'uppercase' }}>// FILTERS</div>
            {sidebar_filters.map(group => (
              <div key={group.label} style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: pixFont, fontSize: 8, letterSpacing: '0.2em', color: '#2e2e2e', marginBottom: 8, textTransform: 'uppercase', borderBottom: '1px solid #181818', paddingBottom: 6 }}>{group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.filters.map(f => (
                    <button key={f.id} onClick={() => filter_toggle(f.id)} style={{ background: active_filt.has(f.id) ? '#161616' : 'transparent', border: `1px solid ${active_filt.has(f.id) ? '#555' : '#1e1e1e'}`, color: active_filt.has(f.id) ? W : '#444', fontFamily: pixFont, fontSize: 9, textTransform: 'uppercase', padding: '6px 10px', cursor: 'pointer', letterSpacing: '0.1em', boxShadow: active_filt.has(f.id) ? 'inset 0 1px 0 rgba(255,255,255,0.05), 2px 2px 0 #000' : 'none', transition: 'all 0.1s ease' }}>{f.label}</button>
                  ))}
                </div>
              </div>
            ))}

            {active_filt.has('duotone') && (
              <div style={{ marginTop: 4, marginBottom: 18, padding: '10px 12px', background: '#070707', border: '1px solid #1e1e1e', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
                <div style={{ fontFamily: pixFont, fontSize: 8, letterSpacing: '0.2em', color: '#2e2e2e', marginBottom: 8 }}>PALETTE</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DUOTONE_PRESETS.map(p => (
                    <button key={p.name} onClick={() => setDuotoneColor(p.color)} style={{ padding: '6px 10px', fontSize: '9px', fontFamily: pixFont, background: `rgb(${p.color.join(',')})`, color: p.name === 'ACID' ? '#000' : '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active_filt.has('halftone') && (
              <div style={{ marginBottom: 14, padding: '10px 12px', background: '#070707', border: '1px solid #1e1e1e', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: pixFont, fontSize: 9, color: '#444', letterSpacing: '0.1em', minWidth: 60 }}>DOT SIZE</span>
                  <input type="range" min={4} max={24} step={1} value={halftone_size} onChange={e => setHalftone_size(+e.target.value)} style={{ flex: 1, accentColor: W }} />
                  <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM, width: 20, textAlign: 'right' }}>{halftone_size}</span>
                </div>
              </div>
            )}

            {active_filt.has('threshold') && (
              <div style={{ marginBottom: 14, padding: '10px 12px', background: '#070707', border: '1px solid #1e1e1e', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: pixFont, fontSize: 9, color: '#444', letterSpacing: '0.1em', minWidth: 60 }}>CUT</span>
                  <input type="range" min={0} max={255} value={thresholdVal} onChange={e => setThresholdVal(+e.target.value)} style={{ flex: 1, accentColor: W }} />
                  <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM, width: 25, textAlign: 'right' }}>{thresholdVal}</span>
                </div>
              </div>
            )}

            <div style={{ padding: '10px 12px', background: '#070707', border: '1px solid #1e1e1e', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: pixFont, fontSize: 9, color: '#444', letterSpacing: '0.1em', minWidth: 60 }}>GRAIN</span>
                <input type="range" min={0} max={100} value={grain} onChange={e => setGrain(+e.target.value)} style={{ flex: 1, accentColor: W }} />
                <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM, width: 20, textAlign: 'right' }}>{grain}</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontFamily: pixFont, fontSize: 8, letterSpacing: '0.2em', color: '#222', marginBottom: 8, textTransform: 'uppercase' }}>
              {active_filt.size > 0 ? [...active_filt].join(' · ').toUpperCase() : 'NO FILTERS'}
            </div>
            <button
              onClick={handleShoot}
              disabled={counting || shooting}
              style={{
                width: '100%',
                background: (counting || shooting) ? 'transparent' : W,
                color: (counting || shooting) ? '#333' : '#0d0d0d',
                border: `1px solid ${(counting || shooting) ? '#252525' : W}`,
                fontFamily: display,
                fontSize: 28,
                letterSpacing: '0.2em',
                padding: '16px 20px',
                cursor: (counting || shooting) ? 'not-allowed' : 'pointer',
                transition: 'all 0.1s ease',
                textTransform: 'uppercase',
                boxShadow: (counting || shooting) ? 'none' : '3px 3px 0 #555, inset 0 1px 0 rgba(255,255,255,0.15)',
                position: 'relative' as const,
              }}
            >
              {counting ? countNum : shooting ? `${takenCount} / ${stripCount}` : stripDone ? '↺ RESHOOT' : '⬤ SHOOT'}
            </button>
          </div>

        </div>
      </div>

      {selectedFrame && (
        <div onClick={() => setSelectedFrame(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(3,3,3,0.97)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'zoom-out' }}>
          <img src={selectedFrame} style={{ maxWidth: '90%', maxHeight: '70%', border: '1px solid #2e2e2e', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }} alt="Captured" />
          <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
            <a href={selectedFrame} download={`eiko-${Date.now()}.jpg`} onClick={(e) => e.stopPropagation()} style={{ fontFamily: display, fontSize: 22, color: '#0d0d0d', background: W, padding: '11px 32px', textDecoration: 'none', letterSpacing: '0.1em', boxShadow: '3px 3px 0 #666' }}>SAVE</a>
            <button onClick={() => setSelectedFrame(null)} style={{ fontFamily: display, fontSize: 22, color: W, background: 'transparent', border: '1px solid #2e2e2e', padding: '11px 32px', cursor: 'pointer', letterSpacing: '0.1em' }}>CLOSE</button>
          </div>
        </div>
      )}

      <canvas ref={snapCanvas} style={{ display: 'none' }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Pixelify+Sans&display=swap');
        * { box-sizing: border-box; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        button:active:not(:disabled) { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #555 !important; }
        ::-webkit-scrollbar { width: 3px; background: #080808; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; }
        input[type=range] { cursor: pointer; height: 2px; }
        input[type=range]::-webkit-slider-runnable-track { height: 2px; background: #222; }
        input[type=range]::-webkit-slider-thumb { width: 10px; height: 10px; border-radius: 0; background: ${W}; margin-top: -4px; }
      `}</style>
    </div>
  )
}