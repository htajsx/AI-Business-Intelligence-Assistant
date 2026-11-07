import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import SuggestionChips from '../input/SuggestionChips'

function GsapFlower({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gsapFlowerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CF9F45" />
          <stop offset="45%" stopColor="#8E2F2B" />
          <stop offset="100%" stopColor="#8A3530" />
        </linearGradient>
      </defs>
      <g transform="translate(50, 50)">
        {[0, 90, 180, 270].map((angle, i) => (
          <path
            key={i}
            transform={`rotate(${angle})`}
            d="M0,0 C-18,-8 -28,-32 -12,-42 C4,-52 22,-36 14,-18 Z"
            fill="url(#gsapFlowerGrad)"
            opacity="0.95"
          />
        ))}
        <circle cx="0" cy="0" r="5.5" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

function GsapSpring({ className = 'w-7 h-10' }) {
  return (
    <svg viewBox="0 0 54 90" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gsapSpringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B9857D" />
          <stop offset="45%" stopColor="#A5A79B" />
          <stop offset="100%" stopColor="#590907" />
        </linearGradient>
        <filter id="springGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8A3530" floodOpacity="0.3" />
        </filter>
      </defs>
      <path
        d="M10 10 C 42 6, 48 24, 26 30 C 8 36, 48 44, 26 50 C 8 56, 48 64, 26 70 C 10 76, 40 80, 24 84"
        stroke="url(#gsapSpringGrad)"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#springGlow)"
        fill="none"
      />
    </svg>
  )
}

export default function WelcomeScreen({ onPick }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        '.welcome-pill-badge',
        { y: -20, scale: 0.85, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }
      )

      tl.fromTo(
        '.hero-char',
        { y: 30, opacity: 0, rotationX: -55, scale: 0.85, transformOrigin: '50% 100%' },
        { y: 0, opacity: 1, rotationX: 0, scale: 1, stagger: 0.007, duration: 0.4, ease: 'back.out(2)' },
        '-=0.25'
      )

      tl.fromTo(
        '.playful-i-elem',
        { y: -24, rotationX: 360, scale: 0 },
        { y: 0, rotationX: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.6)' },
        '-=0.35'
      )

      tl.fromTo(
        '.hero-grad-word',
        { y: 28, opacity: 0, scale: 0.9, rotationX: -45 },
        { y: 0, opacity: 1, scale: 1, rotationX: 0, stagger: 0.07, duration: 0.45, ease: 'back.out(2)' },
        '-=0.3'
      )

      tl.fromTo(
        '.floating-decor',
        { scale: 0, opacity: 0, rotation: -25 },
        { scale: 1, opacity: 1, rotation: 0, stagger: 0.06, duration: 0.55, ease: 'elastic.out(1.1, 0.6)' },
        '-=0.35'
      )

      tl.fromTo(
        '.welcome-subtitle',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
        '-=0.25'
      )

      tl.fromTo(
        '.welcome-divider-line',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.35, ease: 'power2.inOut' },
        '-=0.2'
      )

      tl.fromTo(
        '.welcome-suggestions-wrapper',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
        '-=0.2'
      )

      const playfulILoop = gsap.timeline({ repeat: -1, repeatDelay: 3.5, paused: true })
      playfulILoop
        .to('.playful-i-elem', {
          rotationX: 360,
          transformOrigin: '50% 50%',
          duration: 0.65,
          ease: 'power2.inOut',
        })
        .to(
          '.playful-i-elem',
          {
            scale: 1.15,
            color: '#A5A79B',
            duration: 0.2,
            yoyo: true,
            repeat: 1,
          },
          '<0.15'
        )
        .to(
          '.playful-i-elem',
          {
            rotation: -10,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            ease: 'sine.inOut',
          },
          '+=0.1'
        )
        .to('.playful-i-elem', {
          rotation: 0,
          clearProps: 'color',
          duration: 0.12,
        })

      tl.call(() => {
        playfulILoop.play()
      })

      gsap.to('.flower-pinwheel', {
        rotation: 360,
        duration: 12,
        repeat: -1,
        ease: 'none',
      })

      gsap.to('.spring-coil-elem', {
        scaleY: 1.25,
        scaleX: 0.9,
        y: -4,
        transformOrigin: '50% 100%',
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.floating-badge-1', {
        y: -9,
        x: 4,
        rotation: 3,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.floating-badge-2', {
        y: 8,
        x: -4,
        rotation: -3,
        duration: 3.1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.3,
      })

      gsap.to('.floating-badge-3', {
        y: -7,
        x: -3,
        rotation: 4,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.6,
      })

      gsap.to('.ambient-glow-mesh', {
        scale: 1.15,
        opacity: 0.85,
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      const handleMouseMove = (e) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width - 0.5
        const relY = (e.clientY - rect.top) / rect.height - 0.5

        gsap.to('.floating-badge-1', {
          x: relX * 16,
          y: relY * 14,
          duration: 0.6,
          ease: 'power1.out',
          overwrite: 'auto',
        })
        gsap.to('.floating-badge-2', {
          x: relX * -20,
          y: relY * -16,
          duration: 0.6,
          ease: 'power1.out',
          overwrite: 'auto',
        })
        gsap.to('.floating-badge-3', {
          x: relX * 14,
          y: relY * -12,
          duration: 0.6,
          ease: 'power1.out',
          overwrite: 'auto',
        })
      }

      const node = containerRef.current
      if (node) {
        node.addEventListener('mousemove', handleMouseMove)
      }

      return () => {
        if (node) {
          node.removeEventListener('mousemove', handleMouseMove)
        }
      }
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const handleCharHover = (e) => {
    gsap.to(e.currentTarget, {
      y: -6,
      scale: 1.15,
      color: '#590907',
      duration: 0.16,
      ease: 'back.out(2)',
      yoyo: true,
      repeat: 1,
    })
  }

  const handlePlayfulIClick = () => {
    gsap.to('.playful-i-elem', {
      rotationX: '+=720',
      duration: 0.65,
      ease: 'back.out(2)',
    })
  }

  const renderStaticWord = (word) => {
    return (
      <span className="inline-block whitespace-nowrap">
        {word.split('').map((char, cIdx) => (
          <span key={cIdx} className="hero-char inline-block select-none">
            {char}
          </span>
        ))}
      </span>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-full flex-col items-center justify-center py-6 text-center select-none overflow-hidden"
    >
      <div className="ambient-glow-mesh pointer-events-none absolute -top-10 left-1/2 -z-10 h-72 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-indigo-500/10 blur-3xl dark:from-indigo-500/20 dark:via-violet-500/20 dark:to-indigo-500/15" />

      <div className="welcome-pill-badge mb-4 inline-flex items-center gap-2.5 rounded-full border border-indigo-200 bg-indigo-50/90 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-xs dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
        </span>
        <span className="tracking-wide uppercase text-[11.5px] font-extrabold">
          Enterprise Olist Analytics Data Warehouse
        </span>
      </div>

      <div className="relative w-full max-w-4xl px-2 sm:px-6">
        <div
          className="floating-decor floating-badge-1 absolute -top-8 left-0 sm:left-4 flex items-center gap-2 cursor-pointer z-10"
          title="Interactive GSAP Flower"
          onClick={() => {
            gsap.to('.flower-pinwheel', {
              rotation: '+=360',
              scale: 1.25,
              duration: 0.5,
              yoyo: true,
              repeat: 1,
              ease: 'back.out(2)',
            })
          }}
        >
          <div className="flower-pinwheel drop-shadow-md">
            <GsapFlower className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>
          <span className="h-2 w-2 rounded-full bg-indigo-500/80 shadow-xs ring-2 ring-white dark:ring-slate-900" />
        </div>

        <div className="floating-decor floating-badge-2 absolute -top-7 right-0 sm:right-4 hidden sm:inline-flex items-center rounded-full border border-violet-200/80 bg-white/95 px-3 py-1 text-[11.5px] font-bold text-violet-700 shadow-sm backdrop-blur-md dark:border-violet-500/30 dark:bg-slate-900/95 dark:text-violet-300">
          <span>AI Query Engine</span>
        </div>

        <div className="floating-decor floating-badge-3 absolute top-12 -right-2 sm:right-1 hidden md:inline-flex items-center rounded-full border border-indigo-200/80 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-sm backdrop-blur-md dark:border-indigo-500/30 dark:bg-slate-900/95 dark:text-indigo-300">
          <span>100K+ Live Rows</span>
        </div>

        <h1
          className="relative text-2xl sm:text-3xl md:text-[32px] lg:text-[35px] font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.25]"
          style={{ perspective: '1000px' }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 sm:gap-x-2 gap-y-1">
            {renderStaticWord('Conversational')}
            {renderStaticWord('Business')}

            <span className="inline-flex items-center whitespace-nowrap">
              {['I', 'n', 't', 'e', 'l', 'l'].map((char, idx) => (
                <span key={idx} className="hero-char inline-block select-none">
                  {char}
                </span>
              ))}

              <span
                onClick={handlePlayfulIClick}
                className="playful-i-elem relative inline-block cursor-pointer text-slate-950 dark:text-white font-extrabold select-none"
                title="Click me for a 360° flip!"
                style={{
                  transformOrigin: '50% 50%',
                  display: 'inline-block',
                }}
              >
                i
              </span>

              {['g', 'e', 'n', 'c', 'e'].map((char, idx) => (
                <span key={idx} className="hero-char inline-block select-none">
                  {char}
                </span>
              ))}

              <span
                onMouseEnter={handleCharHover}
                className="hero-char inline-block cursor-pointer text-indigo-500 dark:text-indigo-400 select-none font-bold ml-2"
              >
                &amp;
              </span>
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-1">
            {['Data', 'Analytics', 'Hub'].map((word, wIdx) => (
              <span
                key={wIdx}
                onMouseEnter={handleCharHover}
                className="hero-grad-word inline-block cursor-pointer bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent dark:from-[#818cf8] dark:via-[#c4b5fd] dark:to-[#f472b6] font-extrabold select-none tracking-tight"
              >
                {word}
              </span>
            ))}

            <span className="floating-decor spring-coil-elem inline-block align-middle ml-2 opacity-95 hidden sm:inline-block">
              <GsapSpring className="w-6 h-9 sm:w-7 sm:h-10 text-indigo-500" />
            </span>
          </div>
        </h1>
      </div>

      <p className="welcome-subtitle mb-8 mt-4 max-w-xl text-[15px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100 px-4">
        Ask business questions in natural language. The system compiles SQL queries, visualizes trends, and
        summarizes verified KPI metrics in real time.
      </p>

      <div className="mb-4 flex items-center gap-3 w-full max-w-2xl px-4">
        <div className="welcome-divider-line h-px flex-1 bg-slate-200 dark:bg-[#2F2A24] origin-left" />
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Suggested Analytics Topics
        </span>
        <div className="welcome-divider-line h-px flex-1 bg-slate-200 dark:bg-[#2F2A24] origin-right" />
      </div>

      <div className="welcome-suggestions-wrapper w-full flex justify-center px-2">
        <SuggestionChips onPick={onPick} />
      </div>
    </div>
  )
}