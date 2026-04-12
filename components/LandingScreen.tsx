// components/LandingScreen.tsx
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';

const WORD = ['e','i','k','o']

type LetterState = {
  isPixel: boolean
  isFlipped: boolean
  isShaking: boolean
}

const DEFAULT: LetterState = {
  isPixel: false,
  isFlipped: false,
  isShaking: false,
}

function rand(a: number, b:number) {return a + Math.random() * (b-a)}
function randInt(a: number, b: number) {return Math.floor(rand(a, b+1))}

export default function LandingScreen({ onEnter }: { onEnter: () => void }) {
  const [states, setStates] = useState<LetterState[]>(WORD.map(() => ({...DEFAULT})))

  // Mouse Tracking
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(
    typeof window !== 'undefined' ? window.innerWidth / 2:0
  )
  const mouseY = useMotionValue(
    typeof window !== 'undefined' ? window.innerHeight / 2:0
  );
  const springConfig = { damping: 30, stiffness: 120, mass:0.8 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  const glowLeft = useMotionTemplate`${smoothX}px`
  const glowTop  = useMotionTemplate`${smoothY}px`

  const glitchLetter = useCallback ((idx: number, duration: number) => {
    const roll = Math.random()
    const isFlipped = roll < 0.9
    const isShaking = roll < 0.9 && !isFlipped

    setStates(prev => prev.map((s,i) =>
      i === idx
        ? {isPixel: true, isFlipped, isShaking}
        : s
    ))

    setTimeout (() => {
      setStates(prev => prev.map ((s,i) =>
      i===idx ? {...DEFAULT} : s
      ))
    }, duration)
  }, [])


  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    
    /*
    const schedule = () => {
      const delay = rand(600, 3000)
      timeout = setTimeout(() => {
        const idx = randInt(0, WORD.length - 1)
        const isDoubleBurst = Math.random() < 0.35

        glitchLetter(idx, 250)

        if (isDoubleBurst) {
          setTimeout(() => glitchLetter(idx, 130), 180)
        }

        schedule()
      }, delay)
    }
    */

    //const t = setTimeout(schedule, 1000)

    //oh shit i fortot to code today shittttt im gna lose my streak i dont want to lose my streak
    // bro its 11:50 mama im chasing a ghost do i look
    //does hackatime count comments in heartbeats?
    //idk
    //NOOOOOOOOOO I LOST MY STREAK OF 5 DAYS


    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') onEnter() }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)

    return () => {
      //clearTimeout(t)
      //clearTimeout(timeout)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [glitchLetter, onEnter, mouseX, mouseY])

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-screen items-center justify-center bg-black cursor-none overflow-hidden"
      onClick={onEnter}
    >
      {/* Gradient follower */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: glowLeft,
          top: glowTop,
          translateX: '-50%',
          translateY: '-50%',
          width: 320,
          height: 320,
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        }}
      />

      {/* The word */}
      <h1 className="flex items-baseline select-none">
      {WORD.map((char, i) => {
        const s = states[i]
        return (
          <motion.span
            key={i}
            layout
            layoutId={`letter-${i}`}
            transition={{
              layout: { type: 'spring', stiffness: 300, damping: 30 }
            }}
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            onMouseEnter={() =>
              setStates(prev => prev.map((s, j) =>
                j === i ? { isPixel: true, isFlipped: false, isShaking: false } : s
              ))
            }
            onMouseLeave={() =>
              setStates(prev => prev.map((s, j) =>
                j === i ? { ...DEFAULT } : s
              ))
            }
            className={[
              'inline-block leading-none text-white',
              s.isPixel ? 'font-pixelify' : 'font-harmond',
            ].join(' ')}
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',   // smaller
              textShadow: s.isPixel
                ? '0 0 8px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.4)'
                : 'none',
              transition: 'text-shadow 0.15s ease',
            }}
          >
            {char}
          </motion.span>
        )
      })}
      </h1>

      {/* enter */}
      <motion.p
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-[11px] tracking-[0.2em] uppercase font-sans"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        press enter or click
      </motion.p>

      <style>{`
        @keyframes glitch-shake {
          0%   { transform: translateX(0); }
          25%  { transform: translateX(-3px) skewX(-6deg); }
          50%  { transform: translateX(3px)  skewX(5deg); }
          75%  { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}