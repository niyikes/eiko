'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

type Mode = '1' | '4' | '6'
type AspectRatio = '1/1' | '3/4' | '4/3' | '9/16' | '16/9'

const ASPECTS: AspectRatio[] = ['1/1', '3/4', '4/3', '9/16', '16/9']

const W = 'f0ece4'
const DIM = '#444'
const DARK = '#111'
const BDR = '1pc solid #2a2a2a'
const BDR_W = '1px solid' + W

const DUOTONE_PRESETS = [
  { name: 'EMBER', color: [255, 80, 20] as [number, number, number] },
  { name: 'ACID', color: [180, 255, 0] as [number, number, number] },
  { name: 'COLD', color: [20, 120, 255] as [number, number, number] },
  { name: 'BLUSH', color: [255, 60, 140] as [number, number, number] },
  { name: 'SLIME', color: [0, 220, 120] as [number, number, number] },
  { name: 'VOID', color: [80, 0, 200] as [number, number, number] },
]

const ALL_FX_NAMES = [
  'invert', 'threshold', 'posterize', 'duotone',
  'bw', 'sepia', 'xpro', 'expired',
  'contrast', 'bleach', 'crush', 'halftone'
]



const FILTER_GROUPS = [
  {
    label: 'TONE',
    filters: [
      { id: 'invert', label: 'INVERT' },
      { id: 'threshold', label: 'THRESHOLD' },
      { id: 'posterize', label: 'POSTERIZE' },
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
      { id: 'halftone', label: 'HALFTONE' },
    ]
  },
]

function applyFiltersToCanvas(
  src: HTMLVideoElement | HTMLCanvasElement,
  dst: HTMLCanvasElement,
  filters: Set<string>,
  grain: number,
  duotoneColor: [number, number, number]
) {
  const w = (src as HTMLVideoElement).videoWidth || (src as HTMLCanvasElement).width || 640
  const h = (src as HTMLVideoElement).videoHeight || (src as HTMLCanvasElement).height || 480
  dst.width = w
  dst.height = h
  const ctx = dst.getContext('2d')!
  ctx.drawImage(src, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]

    if (filters.has('bw')) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      r = g = b = gray
    }
    if (filters.has('sepia')) {
      const tr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
      const tg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
      const tb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
      r = tr; g = tg; b = tb
    }
    if (filters.has('invert')) { r = 255 - r; g = 255 - g; b = 255 - b }
    if (filters.has('threshold')) {
      const v = (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? 255 : 0
      r = g = b = v
    }
    if (filters.has('posterize')) {
      const lvl = 4
      r = Math.round(r / 255 * (lvl - 1)) / (lvl - 1) * 255
      g = Math.round(g / 255 * (lvl - 1)) / (lvl - 1) * 255
      b = Math.round(b / 255 * (lvl - 1)) / (lvl - 1) * 255
    }
    if (filters.has('duotone')) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const t = gray / 255
      r = t * duotoneColor[0]
      g = t * duotoneColor[1]
      b = t * duotoneColor[2]
    }
    if (filters.has('xpro')) {
      r = Math.min(255, r * 1.1 + 10); g = Math.max(0, g * 0.85); b = Math.min(255, b * 1.2 + 20)
    }
    if (filters.has('expired')) {
      r = Math.min(255, r * 1.05 + 15); g = Math.max(0, g * 0.9 + 5); b = Math.max(0, b * 0.7)
    }
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
    if (filters.has('halftone')) {
      const gray = (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? 255 : 0
      r = g = b = gray
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
}

export default function PhotoBooth() {
  const [mode, setMode] = useState<Mode>('4')
  const [timerSecs, setTimerSecs] = useState(0)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [grain, setGrain] = useState(20)
  const [duotoneColor, setDuotoneColor] = useState<[number, number, number]>([255, 80, 20])
  const [aspect, setAspect] = useState<AspectRatio>('3/4')
  const [frames, setFrames] = useState<(string | null)[]>([null, null, null, null])
  const [cameraOn, setCameraOn] = useState(false)
  const [camDenied, setCamDenied] = useState(false)
  const [counting, setCounting] = useState(false)
  const [countNum, setCountNum] = useState(3)
  const [flashing, setFlashing] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [takenCount, setTakenCount] = useState(0)
  const [stripDone, setStripDone] = useState(false)
  const [clock, setClock] = useState('00:00:00')
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fxCanvas = useRef<HTMLCanvasElement>(null)
  const snapCanvas = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const stripCount = mode === '1' ? 1 : mode === '4' ? 4 : 6

  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date()
      setClock([n.getHours(), n.getMinutes(), n.getSeconds()].map(x => String(x).padStart(2, '0')).join(':'))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const liveLoop = useCallback(() => {
    const vid = videoRef.current
    const canvas = fxCanvas.current
    if (vid && canvas && vid.readyState >= 2) {
      applyFiltersToCanvas(vid, canvas, activeFilters, grain, duotoneColor)
    }
    animRef.current = requestAnimationFrame(liveLoop)
  }, [activeFilters, grain, duotoneColor])

  useEffect(() => {
    if (cameraOn) {
      animRef.current = requestAnimationFrame(liveLoop)
      return () => cancelAnimationFrame(animRef.current)
    }
  }, [cameraOn, liveLoop])

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = s
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.style.display = 'block' }
      setCameraOn(true)
    } catch { setCamDenied(true) }
  }, [])

  const doFlash = useCallback(() => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), 110)
  }, [])

  const captureFrame = useCallback((): string | null => {
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
    setFrames(Array(total).fill(null))
    let taken = 0
    const takeOne = () => {
      doFlash()
      const url = captureFrame()
      taken++
      setTakenCount(taken)
      setFrames(prev => { const n = [...prev]; n[taken - 1] = url; return n })
      if (taken < total) setTimeout(takeOne, 950)
      else { setShooting(false); setStripDone(true) }
    }
    takeOne()
  }, [doFlash, captureFrame])

  const handleShoot = useCallback(() => {
    if (counting || shooting) return
    if (!cameraOn) { startCamera(); return }
    const total = stripCount
    setStripDone(false)
    setFrames(Array(total).fill(null))
    setTakenCount(0)
    if (timerSecs > 0) {
      setCounting(true)
      setCountNum(timerSecs)
      let n = timerSecs
      const iv = setInterval(() => {
        n--
        if (n <= 0) { clearInterval(iv); setCounting(false); runStrip(total) }
        else setCountNum(n)
      }, 1000)
    } else { runStrip(total) }
  }, [counting, shooting, cameraOn, startCamera, timerSecs, stripCount, runStrip])

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
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
  const pixel = "'Pixelify Sans', monospace"
  const harmond = "'Harmond', 'Cormorant Garamond', Georgia, serif"

  const W = '#f0ece4'
  const DIM = '#666'
  const BDR = '2px solid #2a2a2a'
  const BDR_W = '2px solid ' + W

  return (
    <div style={{
      background: '#080808',
      color: W,
      fontFamily: mono,
      height: '100vh',
      width: '100%',
      display: 'grid',
      gridTemplateRows: '58px 1fr 28px',
      position: 'relative',
      overflow: 'hidden', // CRITICAL: Fixes horizontal scroll
    }}>

      {/* NOISE LAYER */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, opacity: 0.045,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── HEADER ── */}
      <header style={{ borderBottom: BDR_W, display: 'flex', alignItems: 'stretch' }}>
        <div style={{ padding: '0 20px', borderRight: BDR_W, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
          <div style={{ fontFamily: harmond, fontStyle: 'italic', fontWeight: 600, fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em' }}>eiko</div>
          <div style={{ fontFamily: pixel, fontSize: 8, color: DIM, letterSpacing: '0.2em', textTransform: 'uppercase' }}>PHOTOBOOTH</div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', borderRight: BDR_W, padding: '0 12px' }}>
          <div style={{
            whiteSpace: 'nowrap', fontSize: 8, letterSpacing: '0.2em', color: '#222', textTransform: 'uppercase',
            animation: 'ticker 20s linear infinite',
          }}>
            {'· eiko · '.repeat(20)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {[
            { label: cameraOn ? '● LIVE' : '○ OFF', active: cameraOn },
            { label: 'ARCHIVE' },
            { label: '↗ EXPORT' },
          ].map(({ label, active }) => (
            <div key={label} style={{
              padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center',
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: active ? W : DIM, borderLeft: BDR, cursor: 'pointer', fontFamily: pixel,
            }}>{label}</div>
          ))}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', overflow: 'hidden' }}>

        {/* LEFT */}
        <div style={{ borderRight: BDR_W, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ borderBottom: BDR, padding: '7px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 8, letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase', fontFamily: pixel }}>
            <span>VIEWFINDER</span>
            <span style={{ color: cameraOn ? W : '#333' }}>f/2.8 · 1/60 · ISO 400</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -30, right: -10, fontFamily: display, fontSize: 160, color: '#0d0d0d', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>EIKO</div>

            <div style={{
              width: '100%',
              maxWidth: aspect === '16/9' ? 480 : aspect === '9/16' ? 220 : aspect === '1/1' ? 320 : aspect === '4/3' ? 380 : 280,
              aspectRatio: aspect,
              borderRadius: 10,
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid #222',
              flexShrink: 0,
            }}>
              {[['top:8px', 'left:8px', '1px 0 0 1px'], ['top:8px', 'right:8px', '1px 1px 0 0'], ['bottom:8px', 'left:8px', '0 0 1px 1px'], ['bottom:8px', 'right:8px', '0 1px 1px 0']].map(([a, b, bw], i) => (
                <div key={i} style={{ position: 'absolute', width: 14, height: 14, borderColor: 'rgba(240,236,228,0.5)', borderStyle: 'solid', borderWidth: bw, ...Object.fromEntries([a, b].map(s => { const [k, v] = s.split(':'); return [k, v] })) }} />
              ))}

              {!cameraOn && !camDenied && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#2a2a2a', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', background: '#040404', fontFamily: pixel }}>
                  <div style={{ fontFamily: display, fontSize: 44, color: '#111', lineHeight: 1 }}>[ ]</div>
                  <div>CAMERA INACTIVE</div>
                </div>
              )}

              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
              <canvas ref={fxCanvas} style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOn ? 'block' : 'none', position: 'absolute', inset: 0 }} />

              {counting && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                  <div style={{ fontFamily: display, fontSize: 140, color: W, lineHeight: 1, textShadow: '0 0 30px rgba(255,255,255,0.12)' }}>{countNum}</div>
                </div>
              )}
              {flashing && <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />}
            </div>
          </div>

          <div style={{ borderTop: BDR_W, display: 'flex', height: 82, flexShrink: 0 }}>
            {frames.map((frame, i) => (
              <div key={i} onClick={() => frame && setSelectedFrame(frame)} style={{ flex: 1, borderRight: i < frames.length - 1 ? BDR : 'none', background: '#040404', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: frame ? 'zoom-in' : 'default' }}>
                {frame
                  ? <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontFamily: pixel, fontSize: 13, color: '#1a1a1a' }}>✕</span>
                }
                <span style={{ position: 'absolute', bottom: 3, left: 5, fontFamily: pixel, fontSize: 7, color: '#333', letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#080808' }}>
          <div style={{ borderBottom: BDR, padding: '14px 14px' }}>
            <div style={{ fontFamily: display, fontSize: 10, letterSpacing: '0.3em', color: '#444', marginBottom: 10 }}>SHOOT MODE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {([['1', 'SINGLE'], ['4', 'STRIP 4×'], ['6', 'BURST 6×']] as [Mode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => handleModeChange(m)} style={{
                  background: mode === m ? '#111' : 'none',
                  border: `1px solid ${mode === m ? W : '#222'}`,
                  color: mode === m ? W : '#555',
                  fontFamily: pixel, fontSize: 8, letterSpacing: '0.05em', textTransform: 'uppercase',
                  padding: '8px 4px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.5,
                }}>
                  <span style={{ fontFamily: display, fontSize: 20, display: 'block', lineHeight: 1, marginBottom: 2 }}>{m}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderBottom: BDR, padding: '12px 14px' }}>
            <div style={{ fontFamily: display, fontSize: 10, letterSpacing: '0.3em', color: '#444', marginBottom: 8 }}>TIMER</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {([['OFF', 0], ['3s', 3], ['5s', 5], ['10s', 10]] as [string, number][]).map(([label, val]) => (
                <button key={label} onClick={() => setTimerSecs(val)} style={{
                  flex: 1, background: timerSecs === val ? '#111' : 'none',
                  border: `1px solid ${timerSecs === val ? W : '#222'}`,
                  color: timerSecs === val ? W : '#555',
                  fontFamily: pixel, fontSize: 8, padding: '7px 2px', cursor: 'pointer', textAlign: 'center',
                }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ borderBottom: BDR, padding: '12px 14px' }}>
            <div style={{ fontFamily: display, fontSize: 10, letterSpacing: '0.3em', color: '#444', marginBottom: 8 }}>ASPECT RATIO</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {ASPECTS.map(a => (
                <button key={a} onClick={() => setAspect(a)} style={{
                  background: aspect === a ? '#111' : 'none',
                  border: `1px solid ${aspect === a ? W : '#222'}`,
                  color: aspect === a ? W : '#555',
                  fontFamily: pixel, fontSize: 8, padding: '5px 8px', cursor: 'pointer',
                }}>{a}</button>
              ))}
            </div>
          </div>

          <div style={{ borderBottom: BDR, padding: '12px 14px' }}>
            <div style={{ fontFamily: display, fontSize: 10, letterSpacing: '0.3em', color: '#444', marginBottom: 8 }}>FILTERS — LAYER EM</div>
            {FILTER_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: pixel, fontSize: 7, letterSpacing: '0.2em', color: '#333', marginBottom: 5, textTransform: 'uppercase' }}>// {group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {group.filters.map(f => (
                    <button key={f.id} onClick={() => toggleFilter(f.id)} style={{
                      background: activeFilters.has(f.id) ? '#111' : 'none',
                      border: `1px solid ${activeFilters.has(f.id) ? W : '#222'}`,
                      color: activeFilters.has(f.id) ? W : '#555',
                      fontFamily: pixel, fontSize: 7, textTransform: 'uppercase',
                      padding: '4px 7px', cursor: 'pointer',
                    }}>{f.label}</button>
                  ))}
                </div>
              </div>
            ))}

            {activeFilters.has('duotone') && (
              <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {DUOTONE_PRESETS.map(p => (
                  <button key={p.name} onClick={() => setDuotoneColor(p.color)} style={{ padding: '4px 6px', fontSize: '7px', fontFamily: pixel, background: `rgb(${p.color.join(',')})`, color: p.name === 'ACID' ? '#000' : '#fff', border: 'none', cursor: 'pointer' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontFamily: pixel, fontSize: 7, color: '#444' }}>GRAIN</span>
              <input type="range" min={0} max={100} value={grain} onChange={e => setGrain(+e.target.value)} style={{ flex: 1, accentColor: W }} />
              <span style={{ fontFamily: pixel, fontSize: 8, color: '#666', width: 22, textAlign: 'right' }}>{grain}</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: 14 }}>
            <button onClick={handleShoot} disabled={counting || shooting} style={{
              width: '100%', background: (counting || shooting) ? '#0d0d0d' : W,
              border: (counting || shooting) ? `2px solid ${W}` : 'none',
              fontFamily: display, fontSize: 26, letterSpacing: '0.25em',
              color: (counting || shooting) ? W : '#000', padding: '13px 16px', cursor: (counting || shooting) ? 'default' : 'pointer',
            }}>
              <span>⬤</span> {counting ? 'COUNTING...' : shooting ? `${takenCount}/${stripCount}` : stripDone ? 'RESHOOT' : 'SHOOT'}
            </button>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: BDR_W, display: 'flex', alignItems: 'center', height: 28, padding: '0 8px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, fontSize: 7, fontFamily: pixel, color: '#444', letterSpacing: '0.15em' }}>
          <span style={{ fontFamily: harmond, fontStyle: 'italic', fontSize: 11, color: '#666' }}>eiko</span>
          <span>—</span>
          <span>FILTER: {[...activeFilters].join('+').toUpperCase() || 'RAW'}</span>
          <span>—</span>
          <span>{clock}</span>
          <span>—</span>
          <span>ASPECT: {aspect}</span>
        </div>
      </footer>

      {/* LIGHTBOX */}
      {selectedFrame && (
        <div onClick={() => setSelectedFrame(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'zoom-out' }}>
          <img src={selectedFrame} style={{ maxWidth: '90%', maxHeight: '80%', border: BDR_W }} />
          <div style={{ marginTop: 20, display: 'flex', gap: 20 }}>
            <a href={selectedFrame} download={`eiko-${Date.now()}.jpg`} onClick={(e) => e.stopPropagation()} style={{ fontFamily: display, fontSize: 24, color: '#000', background: W, padding: '10px 30px', textDecoration: 'none', letterSpacing: '0.1em' }}>DOWNLOAD</a>
            <button style={{ fontFamily: display, fontSize: 24, color: W, background: 'none', border: BDR_W, padding: '10px 30px' }}>CLOSE</button>
          </div>
        </div>
      )}

      <canvas ref={snapCanvas} style={{ display: 'none' }} />

      <style>{`
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        button:hover:not(:disabled) { filter: brightness(1.15); }
        ::-webkit-scrollbar { width: 3px; background: #080808; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; }
      `}</style>
    </div>
  )
}