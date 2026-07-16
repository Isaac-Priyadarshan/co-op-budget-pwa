import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import type { AppUser } from '../../lib/types'

// ── 50 Motivational Money Quotes ─────────────────────────────────────────────
const QUOTES = [
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
  { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
  { text: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { text: "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order.", author: "T.T. Munger" },
  { text: "Beware of little expenses. A small leak will sink a great ship.", author: "Benjamin Franklin" },
  { text: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
  { text: "Rich people have small TVs and big libraries. Poor people have small libraries and big TVs.", author: "Zig Ziglar" },
  { text: "The real measure of your wealth is how much you'd be worth if you lost all your money.", author: "Unknown" },
  { text: "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.", author: "Will Rogers" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Never spend your money before you have it.", author: "Thomas Jefferson" },
  { text: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
  { text: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock" },
  { text: "The secret to wealth is simple: find a way to do more for others than anyone else does.", author: "Tony Robbins" },
  { text: "Opportunities come infrequently. When it rains gold, put out the bucket, not the thimble.", author: "Warren Buffett" },
  { text: "If you would be wealthy, think of saving as well as getting.", author: "Benjamin Franklin" },
  { text: "Money grows on the tree of patience.", author: "Japanese Proverb" },
  { text: "The goal isn't more money. The goal is living life on your terms.", author: "Chris Brogan" },
  { text: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.", author: "Dave Ramsey" },
  { text: "You must gain control over your money or the lack of it will forever control you.", author: "Dave Ramsey" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { text: "A wise person should have money in their head, but not in their heart.", author: "Jonathan Swift" },
  { text: "Money is only a tool. It will take you wherever you wish, but it will not replace you as the driver.", author: "Ayn Rand" },
  { text: "Earning a lot of money is not the key to prosperity. How you handle it is.", author: "Dave Ramsey" },
  { text: "Do not put all your eggs in one basket.", author: "Miguel de Cervantes" },
  { text: "The more you learn, the more you earn.", author: "Warren Buffett" },
  { text: "It's not the man who has too little, but the man who craves more, that is poor.", author: "Seneca" },
  { text: "Saving must become a priority, not just a thought. Pay yourself first.", author: "Dave Ramsey" },
  { text: "Time is more valuable than money. You can get more money, but you cannot get more time.", author: "Jim Rohn" },
  { text: "Empty pockets never held anyone back. Only empty heads and empty hearts can do that.", author: "Norman Vincent Peale" },
  { text: "The art is not in making money, but in keeping it.", author: "Proverb" },
  { text: "Invest in yourself. Your career is the engine of your wealth.", author: "Paul Clitheroe" },
  { text: "I will tell you the secret to getting rich. Be greedy when others are fearful.", author: "Warren Buffett" },
  { text: "Money is a guarantee that we may have what we want in the future.", author: "Aristotle" },
  { text: "A penny saved is a penny earned.", author: "Benjamin Franklin" },
  { text: "The four most expensive words in the English language are: 'This time it's different.'", author: "Sir John Templeton" },
  { text: "Before you speak, listen. Before you spend, earn.", author: "William Arthur Ward" },
  { text: "Frugality includes all the other virtues.", author: "Cicero" },
  { text: "Not everything that can be counted counts, and not everything that counts can be counted.", author: "Albert Einstein" },
  { text: "Every time you borrow money, you're robbing your future self.", author: "Nathan W. Morris" },
  { text: "He who buys what he does not need steals from himself.", author: "Swedish Proverb" },
  { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
  { text: "Wealth is largely the result of habit.", author: "John Jacob Astor" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "How many millionaires do you know who have become wealthy by investing in savings accounts?", author: "Robert G. Allen" },
  { text: "A budget is more than just a series of numbers on a page; it is an embodiment of our values.", author: "Barack Obama" },
  { text: "The best thing money can buy is financial freedom.", author: "Rob Berger" },
  { text: "Build your own dreams, or someone else will hire you to build theirs.", author: "Farrah Gray" },
]

// ── Sparkle Background ───────────────────────────────────────────────────────
interface Particle { id: number; x: number; y: number; size: number; opacity: number; duration: number; delay: number; color: string }

function generateParticles(count: number): Particle[] {
  const colors = ['#a5b4fc','#818cf8','#c4b5fd','#fcd34d','#6ee7b7','#ffffff','#e879f9','#93c5fd']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.7 + 0.15,
    duration: Math.random() * 6 + 4,
    delay: Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
}

function SparkleBackground() {
  const particles = useRef(generateParticles(70)).current
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div style={{ position: 'absolute', top: '40%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 40, 0],
            x: [0, (Math.random() - 0.5) * 30, 0],
            opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.2, p.opacity],
            scale: [0.8, 1.4, 0.9, 1],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          style={{
            position: 'absolute',
            left: `${10 + i * 7.5}%`,
            top: `${15 + (i % 4) * 20}%`,
            fontSize: Math.random() * 8 + 8,
            color: ['#fcd34d','#a5b4fc','#6ee7b7','#f9a8d4'][i % 4],
            lineHeight: 1,
            filter: 'blur(0.3px)',
          }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 180, 360] }}
          transition={{ duration: 3 + Math.random() * 3, delay: Math.random() * 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  )
}

// ── 3D Tilt Avatar Card ──────────────────────────────────────────────────────
interface AvatarCardProps {
  user: AppUser
  emoji: string
  onSelect: (user: AppUser) => void
  selected: boolean
}

function AvatarCard({ user, emoji, onSelect, selected }: AvatarCardProps) {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 18)
    rotateX.set(-((e.clientY - cy) / (rect.height / 2)) * 18)
  }, [rotateX, rotateY])

  const handlePointerLeave = useCallback(() => {
    rotateX.set(0)
    rotateY.set(0)
  }, [rotateX, rotateY])

  return (
    <motion.div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTap={() => onSelect(user)}
      style={{ perspective: 600, cursor: 'pointer', flex: 1, maxWidth: 160 }}
      whileTap={{ scale: 0.94 }}
    >
      <motion.div
        style={{
          rotateX, rotateY,
          transformStyle: 'preserve-3d',
          borderRadius: 28,
          padding: '24px 16px 20px',
          background: selected
            ? 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.25))'
            : 'rgba(255,255,255,0.05)',
          border: selected ? '1.5px solid rgba(165,180,252,0.7)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: selected
            ? '0 0 32px rgba(99,102,241,0.45), 0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute', inset: -3, borderRadius: 31,
              border: '2px solid rgba(165,180,252,0.5)',
              boxShadow: '0 0 20px rgba(99,102,241,0.5)',
              pointerEvents: 'none',
            }}
          />
        )}

        <motion.div
          animate={selected ? { scale: [1, 1.15, 1.08], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            fontSize: 64, lineHeight: 1,
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
            transform: 'translateZ(30px)',
            display: 'block', textAlign: 'center',
          }}
        >
          {emoji}
        </motion.div>

        <p style={{
          fontSize: 16, fontWeight: 700,
          color: selected ? '#c4b5fd' : 'rgba(255,255,255,0.75)',
          letterSpacing: '0.02em', textAlign: 'center',
        }}>
          {user}
        </p>
      </motion.div>
    </motion.div>
  )
}

// ── Gold Quote Display ───────────────────────────────────────────────────────
function QuoteDisplay({ quote }: { quote: typeof QUOTES[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ textAlign: 'center', padding: '0 28px', maxWidth: 420, margin: '0 auto' }}
    >
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          fontSize: 56, lineHeight: 0.6,
          color: '#f59e0b', fontFamily: 'Georgia, serif',
          marginBottom: 10, display: 'block',
          textShadow: '0 0 20px rgba(245,158,11,0.5)',
        }}
      >
        &quot;
      </motion.span>

      <p style={{
        fontSize: 'clamp(17px, 4.5vw, 22px)',
        fontFamily: "'Playfair Display', 'Georgia', serif",
        fontStyle: 'italic',
        fontWeight: 500,
        lineHeight: 1.7,
        background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 40%, #fbbf24 70%, #fde68a 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '0.01em',
        filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.35))',
      }}>
        {quote.text}
      </p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        style={{
          fontSize: 13,
          color: 'rgba(251,191,36,0.5)',
          marginTop: 16,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        — {quote.author}
      </motion.p>
    </motion.div>
  )
}

// ── Main Welcome Screen ──────────────────────────────────────────────────────
export function UserSelectScreen() {
  const { setActiveUser } = useUser()
  const [selected, setSelected] = useState<AppUser | null>(null)
  const [entering, setEntering] = useState(false)
  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]).current

  // Patch <html> and <body> to pure black so the OS nav bar / status bar
  // never reveals a mismatched surface behind this screen.
  useEffect(() => {
    const prev = document.body.style.background
    document.documentElement.style.background = '#000'
    document.body.style.background = '#000'
    return () => {
      document.documentElement.style.background = ''
      document.body.style.background = prev
    }
  }, [])

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,400;1,500&display=swap'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  const handleSelect = useCallback((user: AppUser) => {
    if (entering) return
    if (selected === user) {
      setEntering(true)
      setTimeout(() => setActiveUser(user), 600)
    } else {
      setSelected(user)
    }
  }, [selected, entering, setActiveUser])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: entering ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed',
          inset: 0,
          // Gradient now ends at pure #000 — matches the OS nav bar exactly on
          // every Android gesture-nav and iPhone home-indicator colour.
          background: 'linear-gradient(180deg, #02030a 0%, #04050e 40%, #060412 75%, #000000 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          // ── FIX: use var(--sat) / var(--sab) instead of env() directly. ──────
          // env(safe-area-inset-*) in inline React styles is resolved by iOS
          // one frame late, causing content to sit under the status bar on the
          // very first render. var(--sat) and var(--sab) are pre-painted by the
          // synchronous <script> in index.html before React hydrates, so they
          // carry the correct pixel value from frame 0 — no layout jump.
          paddingTop: 'calc(var(--sat) + 48px)',
          paddingBottom: 'calc(var(--sab) + 36px)',
          overflow: 'hidden',
        }}
      >
        <SparkleBackground />

        {/* Top: Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
        >
          <p style={{
            fontSize: 11,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(165,180,252,0.5)',
            marginBottom: 8,
            fontWeight: 500,
          }}>Welcome to</p>

          <h1 style={{
            fontSize: 'clamp(28px, 7vw, 38px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 35%, #fbbf24 60%, #e8e8ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 24px rgba(251,191,36,0.4))',
          }}>
            Budget Planner
          </h1>

          <p style={{
            fontSize: 12,
            color: 'rgba(251,191,36,0.35)',
            marginTop: 8,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            Focus &nbsp;·&nbsp; Discipline &nbsp;·&nbsp; Consistency
          </p>
        </motion.div>

        {/* Center: Quote */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <QuoteDisplay quote={quote} />
        </div>

        {/* Bottom: User cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1, width: '100%', padding: '0 24px' }}
        >
          <div style={{ marginBottom: 16, height: 18 }} />
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <AvatarCard user="Isaac" emoji="🤴🏽" onSelect={handleSelect} selected={selected === 'Isaac'} />
            <AvatarCard user="Jenifa" emoji="👸🏽" onSelect={handleSelect} selected={selected === 'Jenifa'} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
