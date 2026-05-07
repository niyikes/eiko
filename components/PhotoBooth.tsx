'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

type Mode = '1' | '4' | '6'
type AspectRatio = '1/1' | '3/4' | '4/3' | '9/16' | '16/9'

const W = '#f0ece4'
const DIM = '#666'
const BDR = '2px solid #2a2a2a'
const BDR_W = '2px solid ' + W
const GLOW = `0 0 15px rgba(240, 236, 228, 0.15)`

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
      {id: 'halftone', label: 'HALFTONE'},
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


function filter_to_cam 
(
  src: HTMLVideoElement | HTMLCanvasElement,
  dst: HTMLCanvasElement,
  filters: Set<string>,
  grain: number,
  duotoneColor: [number, number, number],

  thresholdVal: number = 128
) {
  const w = (src as HTMLVideoElement).videoWidth || (src as HTMLCanvasElement).width || 640
  const h = (src as HTMLVideoElement).videoHeight || (src as HTMLCanvasElement).height || 480
  dst.width = w
  dst.height = h
  const ctx = dst.getContext('2d')!
  ctx.drawImage(src, 0, 0, w, h)
  ctx.scale(-1,1)
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data

  const gray = new Uint8ClampedArray(w * h)

for (let i = 0, j = 0; i < d.length; i += 4, j++) {
  gray[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  }

const integral = new Uint32Array(w * h)
for (let y = 0; y < h; y++) {
  let sum = 0
  for (let x = 0; x < w; x++) {
    const idx = y * w + x
    sum += gray[idx]
    integral[idx] = sum + (y > 0 ? integral[idx - w] : 0)
  }
}

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]

    //black and white
    if (filters.has('bw')) { const gray = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = gray }

    //sepia
    if (filters.has('sepia')) {
      const tr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
      const tg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
      const tb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
      r = tr; g = tg; b = tb
    }

    if (filters.has('invert')) 
      {
         r = 255 - r; g = 255 - g; b = 255 - b
      }


    if (filters.has('threshold')) 
      { 
        const v = (0.299 * r + 0.587 * g + 0.114 * b) > thresholdVal ? 255 : 0; r = g = b = v
      }


    if (filters.has('posterize'))
      {
      const lvl = 4
      r = Math.round(r / 255 * (lvl - 1)) / (lvl - 1) * 255
      g = Math.round(g / 255 * (lvl - 1)) / (lvl - 1) * 255
      b = Math.round(b / 255 * (lvl - 1)) / (lvl - 1) * 255
    }


    if (filters.has('duotone'))
      {
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
}

/*
async function buildString(
  frames: string[],
  filters: string[],
  date: string,
  showDate: boolean
): Promise<string> {
  
}
*/

export default function PhotoBooth() {
  const [mode, setMode] = useState<Mode>('4')
  const [active_filt, setactive_filt] = useState<Set<string>>(new Set())
  const [grain, setGrain] = useState(20)
  const [duotoneColor, setDuotoneColor] = useState<[number, number, number]>([255, 80, 20])
  const [aspect] = useState<AspectRatio>('4/3')
  const [frames, setFrames] = useState<(string | null)[]>([null, null, null, null])
  const [cameraOn, setCameraOn] = useState(false)
  const [cam_deny, setcam_deny] = useState(false)
  const [counting, setCounting] = useState(false)
  const [countNum, setCountNum] = useState(3)
  const [flashing, setFlashing] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [takenCount, setTakenCount] = useState(0)
  const [stripDone, setStripDone] = useState(false)
  const [clock, setClock] = useState('00:00:00')
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)
  const [thresholdVal, setThresholdVal] = useState(128)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fxCanvas = useRef<HTMLCanvasElement>(null)
  const snapCanvas = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const active_filtRef = useRef(active_filt)
  const grainRef = useRef(grain)
  const duotoneColorRef = useRef(duotoneColor)
  const thresholdValRef = useRef (thresholdVal)

  //the review thing page
  const [view,setView] = useState<'camera' | 'review' | 'archive' >('camera')
  const [archive, setArchive] = useState <{id: number, frames: string[], filters: string[], date: string, strip: string}[]>(() => {
    try {return JSON.parse(localStorage.getItem('eiko-archive') || '[]')} catch {return []}
  })

  const [reviewFrames, setReviewFrames] = useState<string[]>([])
  const [reviewFilters, setReviewFilters] = useState<string[]>([])
  const [showDate, setShowDate] = useState(true)
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<typeof archive[0] | null>(null)
  

  const stripCount = mode === '1' ? 1 : mode === '4' ? 4 : 6

  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date()
      setClock([n.getHours(), n.getMinutes(), n.getSeconds()].map(x => String(x).padStart(2, '0')).join(':'))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    active_filtRef.current = active_filt
  }, [active_filt])

  useEffect(() => {
    grainRef.current = grain
  }, [grain])
  
  useEffect(() => {
    duotoneColorRef.current = duotoneColor
  }, [duotoneColor])
  
  useEffect(() => {
    thresholdValRef.current = thresholdVal
  }, [thresholdVal])
  

  const tick = useCallback(() => {
    const vid = videoRef.current
    const canvas = fxCanvas.current
    if (vid && canvas && vid.readyState >= 2) {
      filter_to_cam(vid, canvas, active_filtRef.current, grainRef.current, duotoneColorRef.current, thresholdValRef.current)
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
        } else {
          setCountNum(n)
        }
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
  const harmond = "'Harmond', 'Cormorant Garamond', Georgia, serif"

  return (
    <div style={{
      background: '#080808',
      color: W,
      fontFamily: mono,
      height: '100vh',
      width: '100%',
      display: 'grid',
      gridTemplateRows: ' 1fr 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* grain/noise */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, opacity: 0.045,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* HEADER
      
        <header style={{ borderBottom: BDR_W, display: 'flex', alignItems: 'center', padding: '0 30px' }}>
        <div style={{ fontFamily: harmond, fontStyle: 'italic', fontWeight: 600, fontSize: 36, lineHeight: 1, letterSpacing: '-0.02em' }}>
          eiko
        </div>
      </header>
      
      */}



      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>

        {/* left cam*/}
        <div style={{ borderRight: BDR_W, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 20 }}>
          <div style={{ borderBottom: BDR, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '0.2em', color: DIM, textTransform: 'uppercase', fontFamily: pixFont, borderRadius: '12px 12px 0 0', background: '#0c0c0c' }}>
            <span>CAM</span>
            <span style={{ color: cameraOn ? W : '#333' }}>f/2.8 · 1/60 · ISO 400</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative', overflow: 'hidden', borderLeft: BDR, borderRight: BDR }}>
            
            <div style={{
              width: '100%',
              maxWidth: aspect === '16/9' ? 600 : aspect === '9/16' ? 280 : aspect === '1/1' ? 400 : aspect === '4/3' ? 480 : 350,
              aspectRatio: aspect,
              borderRadius: 20,
              overflow: 'hidden',
              position: 'relative',
              border: '2px solid #222',
              flexShrink: 0,
              boxShadow: cameraOn ? GLOW : 'none',
              transition: 'all 0.4s ease'
            }}>
              {!cameraOn && !cam_deny && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#2a2a2a', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', background: '#040404', fontFamily: pixFont }}>
                  <div style={{ fontFamily: display, fontSize: 50, color: '#111', lineHeight: 1 }}>[ ]</div>
                  <div>CAMERA INACTIVE</div>
                </div>
              )}

              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
              <canvas ref={fxCanvas} style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOn ? 'block' : 'none', position: 'absolute', inset: 0, transform: 'scaleX(-1)' }} />

              {counting && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 20 }}>
                  <div style={{ fontFamily: pixFont, fontStyle: 'italic', fontSize: 50, color: W, lineHeight: 1, textShadow: '0 0 40px rgba(255,255,255,0.3)' }}>{countNum}</div>
                </div>
              )}
              {flashing && <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 30 }} />}
            </div>
          </div>

          <div style={{ border: BDR_W, display: 'flex', height: 110, flexShrink: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden', background: '#0c0c0c' }}>
            {frames.map((frame, i) => (
              <div key={i} onClick={() => frame && setSelectedFrame(frame)} style={{ flex: 1, borderRight: i < frames.length - 1 ? BDR : 'none', background: '#040404', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: frame ? 'zoom-in' : 'default' }}>
                {frame
                  ? <img src={frame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontFamily: pixFont, fontSize: 18, color: '#1a1a1a' }}>✕</span>
                }
                <span style={{ position: 'absolute', bottom: 6, left: 8, fontFamily: pixFont, fontSize: 10, color: DIM, letterSpacing: '0.1em' }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right menu */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#080808', padding: '10px 0' }}>
          <div style={{ borderBottom: BDR, padding: '20px' }}>
            <div style={{ fontFamily: display, fontSize: 13, letterSpacing: '0.3em', color: DIM, marginBottom: 12 }}>SHOOT MODE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {([['1', 'SINGLE'], ['4', 'STRIP 4×'], ['6', 'BURST 6×']] as [Mode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => handleModeChange(m)} style={{
                  background: mode === m ? '#111' : 'none',
                  border: `2px solid ${mode === m ? W : '#222'}`,
                  color: mode === m ? W : '#555',
                  fontFamily: pixFont, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase',
                  padding: '12px 6px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.5,
                  borderRadius: '8px',
                  boxShadow: mode === m ? GLOW : 'none',
                  transition: '0.2s ease'
                }}>
                  <span style={{ fontFamily: display, fontSize: 24, display: 'block', lineHeight: 1, marginBottom: 2 }}>{m}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderBottom: BDR, padding: '20px' }}>
            <div style={{ fontFamily: display, fontSize: 13, letterSpacing: '0.3em', color: DIM, marginBottom: 10 }}>FILTERS</div>
            {sidebar_filters.map(group => (
              <div key={group.label} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: pixFont, fontSize: 9, letterSpacing: '0.2em', color: '#444', marginBottom: 8, textTransform: 'uppercase' }}>// {group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.filters.map(f => (
                    <button key={f.id} onClick={() => filter_toggle(f.id)} style={{
                      background: active_filt.has(f.id) ? '#111' : 'none',
                      border: `2px solid ${active_filt.has(f.id) ? W : '#222'}`,
                      color: active_filt.has(f.id) ? W : '#555',
                      fontFamily: pixFont, fontSize: 10, textTransform: 'uppercase',
                      padding: '6px 10px', cursor: 'pointer',
                      borderRadius: '6px',
                      boxShadow: active_filt.has(f.id) ? GLOW : 'none',
                    }}>{f.label}</button>
                  ))}
                </div>
              </div>
            ))}

            {active_filt.has('duotone') && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DUOTONE_PRESETS.map(p => (
                  <button key={p.name} onClick={() => setDuotoneColor(p.color)} style={{ padding: '6px 10px', fontSize: '10px', borderRadius: '4px', fontFamily: pixFont, background: `rgb(${p.color.join(',')})`, color: p.name === 'ACID' ? '#000' : '#fff', border: 'none', cursor: 'pointer' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {active_filt.has('threshold') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM }}>THRESHOLD</span>
                <input
                  type="range" min={0} max={255} value={thresholdVal}
                  onChange={e => setThresholdVal(+e.target.value)}
                  style={{ flex: 1, accentColor: W }}
                />
                <span style={{ fontFamily: pixFont, fontSize: 11, color: DIM, width: 25, textAlign: 'right' }}>{thresholdVal}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
              <span style={{ fontFamily: pixFont, fontSize: 10, color: DIM }}>GRAIN</span>
              <input type="range" min={0} max={100} value={grain} onChange={e => setGrain(+e.target.value)} style={{ flex: 1, accentColor: W }} />
              <span style={{ fontFamily: pixFont, fontSize: 11, color: DIM, width: 25, textAlign: 'right' }}>{grain}</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: '16px 20px', borderTop: BDR }}>
            <button onClick={handleShoot} disabled={counting || shooting} style={{
              width: '100%',
              background: 'none',
              color: (counting || shooting) ? DIM : W,
              border: `1px solid ${(counting || shooting) ? '#333' : W}`,
              fontFamily: pixFont,
              fontSize: 11,
              letterSpacing: '0.3em',
              padding: '14px 20px',
              borderRadius: '6px',
              cursor: (counting || shooting) ? 'not-allowed' : 'pointer',
              transition: '0.2s ease',
              textTransform: 'uppercase',
            }}>
              {counting ? `${countNum}` : shooting ? `${takenCount} / ${stripCount}` : stripDone ? '↺  RESHOOT' : '⬤  SHOOT'}
            </button>
          </div>
          

        </div>
      </div>

      <footer style={{ borderTop: BDR_W, display: 'flex', alignItems: 'center', height: 32, padding: '0 20px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 20, fontSize: 9, fontFamily: pixFont, color: DIM, letterSpacing: '0.15em' }}>
          <span style={{ fontFamily: harmond, fontStyle: 'italic', fontSize: 14, color: '#666' }}>eiko</span>
          <span>—</span>
          <span style={{color: W}}>FILTER: {[...active_filt].join('+').toUpperCase() || 'RAW'}</span>
          <span>—</span>
          <span>{clock}</span>
          <span>—</span>
          <span>ASPECT: {aspect}</span>
        </div>
      </footer>

      {/* light */}
      {selectedFrame && (
        <div onClick={() => setSelectedFrame(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'zoom-out' }}>
          <img src={selectedFrame} style={{ maxWidth: '90%', maxHeight: '75%', border: BDR_W, borderRadius: '24px', boxShadow: '0 0 60px rgba(255,255,255,0.1)' }} alt="Captured" />
          <div style={{ marginTop: 30, display: 'flex', gap: 20 }}>
            <a href={selectedFrame} download={`eiko-${Date.now()}.jpg`} onClick={(e) => e.stopPropagation()} style={{ fontFamily: display, fontSize: 28, color: '#000', background: W, padding: '12px 40px', textDecoration: 'none', letterSpacing: '0.1em', borderRadius: '12px' }}>DOWNLOAD</a>
            <button onClick={() => setSelectedFrame(null)} style={{ fontFamily: display, fontSize: 28, color: W, background: 'none', border: BDR_W, padding: '12px 40px', borderRadius: '12px' }}>CLOSE</button>
          </div>
        </div>
      )}

      <canvas ref={snapCanvas} style={{ display: 'none' }} />

      <style>{`
        button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        button:active:not(:disabled) { transform: translateY(0px); }
        ::-webkit-scrollbar { width: 5px; background: #080808; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 10px; }
        input[type=range] { cursor: pointer; }
      `}</style>
    </div>
  )
}