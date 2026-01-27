import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CHARACTERISTIC_NAMES, Characteristics } from '@/types/game';
import { Sparkles, Star } from 'lucide-react';

// To restore old animation, rename CardRevealAnimation.backup.tsx to CardRevealAnimation.tsx

// Haptic feedback helper - triggers vibration on supported devices
const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported or blocked
    }
  }
};

interface CardRevealAnimationProps {
  playerName: string;
  characteristicKey: keyof Characteristics;
  characteristicValue: string;
  isVisible: boolean;
  onComplete: () => void;
}

const CardRevealAnimation = ({
  playerName,
  characteristicKey,
  characteristicValue,
  isVisible,
  onComplete
}: CardRevealAnimationProps) => {
  const characteristicName = CHARACTERISTIC_NAMES[characteristicKey];
  const [isFlipped, setIsFlipped] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsFlipped(false);
      setShowContent(false);
      
      // Light vibration when card appears
      triggerHaptic(50);
      
      // Start flip after card appears
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
        // Medium vibration when card flips
        triggerHaptic([30, 50, 80]);
      }, 600);
      
      // Show content after flip completes
      const contentTimer = setTimeout(() => {
        setShowContent(true);
        // Light vibration when content reveals
        triggerHaptic(30);
      }, 1200);
      
      return () => {
        clearTimeout(flipTimer);
        clearTimeout(contentTimer);
      };
    }
  }, [isVisible]);

  // Generate random particles
  const particles = [...Array(20)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md"
          onClick={onComplete}
        >
          {/* Animated background gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 overflow-hidden"
          >
            <motion.div
              animate={{
                background: [
                  'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
                  'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.25) 0%, transparent 60%)',
                  'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0"
            />
          </motion.div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: '100vh' }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [100, -100],
                }}
                transition={{
                  delay: p.delay + 0.5,
                  duration: p.duration,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ left: `${p.x}%` }}
                className="absolute"
              >
                <Star
                  className="text-primary/60"
                  style={{ width: p.size, height: p.size }}
                  fill="currentColor"
                />
              </motion.div>
            ))}
          </div>

          {/* Main glow behind card */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isFlipped ? [1, 1.3, 1.1] : 0,
              opacity: isFlipped ? [0.3, 0.7, 0.5] : 0,
            }}
            transition={{ duration: 0.8 }}
            className="absolute w-[500px] h-[700px] rounded-[50px] bg-primary/40 blur-[100px]"
          />

          {/* Card container with 3D perspective */}
          <div className="relative" style={{ perspective: '1500px' }}>
            {/* Card entrance animation */}
            <motion.div
              initial={{ scale: 0.3, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 15,
                delay: 0.1,
              }}
            >
              {/* 3D Flip container */}
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                  duration: 0.8,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative"
              >
                {/* Card Back (visible before flip) */}
                <motion.div
                  className="w-[85vw] max-w-[400px] aspect-[2.5/3.5] rounded-2xl relative overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 40px hsl(var(--primary) / 0.3)',
                  }}
                >
                  {/* Card back design */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  <div className="absolute inset-2 rounded-xl border-2 border-primary/30" />
                  <div className="absolute inset-4 rounded-lg border border-primary/20" />
                  
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="w-48 h-48 sm:w-64 sm:h-64 opacity-20"
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(var(--secondary))" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M50 5 L61 35 L95 35 L68 57 L79 91 L50 70 L21 91 L32 57 L5 35 L39 35 Z"
                          fill="none"
                          stroke="url(#cardGrad)"
                          strokeWidth="1"
                        />
                        <circle cx="50" cy="50" r="30" fill="none" stroke="url(#cardGrad)" strokeWidth="0.5" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="url(#cardGrad)" strokeWidth="0.5" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Question mark */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="font-display text-7xl sm:text-8xl text-primary/40"
                    >
                      ?
                    </motion.span>
                  </div>

                  {/* Corner decorations */}
                  <div className="absolute top-4 left-4">
                    <Sparkles className="w-6 h-6 text-primary/40" />
                  </div>
                  <div className="absolute bottom-4 right-4 rotate-180">
                    <Sparkles className="w-6 h-6 text-primary/40" />
                  </div>
                </motion.div>

                {/* Card Front (visible after flip) */}
                <motion.div
                  className="w-[85vw] max-w-[400px] aspect-[2.5/3.5] rounded-2xl absolute top-0 left-0 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 60px hsl(var(--primary) / 0.4)',
                  }}
                >
                  {/* Card front background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-background to-slate-900" />
                  
                  {/* Animated border glow */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        'inset 0 0 20px hsl(var(--primary) / 0.3)',
                        'inset 0 0 40px hsl(var(--primary) / 0.5)',
                        'inset 0 0 20px hsl(var(--primary) / 0.3)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl"
                  />
                  
                  {/* Border frame */}
                  <div className="absolute inset-2 rounded-xl border-2 border-primary/50" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-5 sm:p-6">
                    {/* Top section - Player opened card */}
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : -20 }}
                      transition={{ delay: 0.1 }}
                      className="text-center pt-2"
                    >
                      <p className="text-muted-foreground text-xs sm:text-sm mb-1">
                        Игрок
                      </p>
                      <p className="font-display text-secondary text-base sm:text-lg">
                        {playerName}
                      </p>
                      <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        открывает карту
                      </p>
                    </motion.div>

                    {/* Middle section - Card type and value */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                      {/* Characteristic type badge */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.5 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-primary/20 border border-primary/50 mb-3 sm:mb-4"
                      >
                        <span className="font-display text-primary text-xs sm:text-sm uppercase tracking-widest">
                          {characteristicName}
                        </span>
                      </motion.div>

                      {/* Decorative line */}
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: showContent ? 1 : 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="w-2/3 h-px bg-gradient-to-r from-transparent via-primary to-transparent mb-3 sm:mb-4"
                      />

                      {/* Main value - the card content */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{
                          opacity: showContent ? 1 : 0,
                          scale: showContent ? 1 : 0.8,
                          y: showContent ? 0 : 20,
                        }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                        className="text-center px-3 py-3 sm:px-4 sm:py-4 rounded-xl bg-primary/10 border border-primary/30 w-full"
                      >
                        <motion.p
                          animate={showContent ? {
                            textShadow: [
                              '0 0 10px hsl(var(--primary) / 0.5)',
                              '0 0 20px hsl(var(--primary) / 0.8)',
                              '0 0 10px hsl(var(--primary) / 0.5)',
                            ],
                          } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="font-display text-lg sm:text-xl md:text-2xl text-primary leading-tight"
                        >
                          {characteristicValue}
                        </motion.p>
                      </motion.div>
                    </div>

                    {/* Bottom decorative element */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: showContent ? 0.5 : 0 }}
                      transition={{ delay: 0.5 }}
                      className="pb-2"
                    >
                      <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    </motion.div>

                    {/* Sparkle decorations */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: showContent ? 1 : 0 }}
                      transition={{ delay: 0.6 }}
                      className="absolute top-6 right-6"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary/60" />
                      </motion.div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: showContent ? 1 : 0 }}
                      transition={{ delay: 0.7 }}
                      className="absolute bottom-6 left-6"
                    >
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary/60" />
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Tap hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2 }}
            className="absolute bottom-20 text-sm text-muted-foreground"
          >
            Нажмите, чтобы закрыть
          </motion.p>

          {/* Timer bar */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-1.5 bg-white/10 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 10, ease: 'linear' }}
              onAnimationComplete={onComplete}
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full origin-left"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardRevealAnimation;
