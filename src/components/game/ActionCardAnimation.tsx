import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PendingAction, Player } from '@/types/game';
import { X, Skull, Shield, Target, Clock, Ban } from 'lucide-react';

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported or blocked
    }
  }
};

interface ActionCardAnimationProps {
  pendingAction: PendingAction | null;
  canCancel: boolean;
  onCancel: () => void;
  onSelectTarget: (targetId: string) => void;
  onTimeExpired: () => void;
  validTargets: Player[];
  isMyAction: boolean;
}

const ActionCardAnimation = ({
  pendingAction,
  canCancel,
  onCancel,
  onSelectTarget,
  onTimeExpired,
  validTargets,
  isMyAction,
}: ActionCardAnimationProps) => {
  const [timeRemaining, setTimeRemaining] = useState(4);
  const [phase, setPhase] = useState<'cancel_window' | 'target_selection' | 'applying'>('cancel_window');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Track which pendingAction we've already animated
  const animatedActionIdRef = useRef<string | null>(null);
  const timeExpiredCalledRef = useRef(false);

  // Reset state when pendingAction changes
  useEffect(() => {
    if (!pendingAction) {
      setTimeRemaining(4);
      setPhase('cancel_window');
      setIsFlipped(false);
      setShowContent(false);
      animatedActionIdRef.current = null;
      timeExpiredCalledRef.current = false;
      return;
    }
    
    // If this is a new action, reset animation state
    const actionKey = `${pendingAction.playerId}-${pendingAction.cardId}`;
    if (animatedActionIdRef.current !== actionKey) {
      animatedActionIdRef.current = actionKey;
      timeExpiredCalledRef.current = false;
      setPhase('cancel_window');
      setIsFlipped(false);
      setShowContent(false);
    }
  }, [pendingAction]);

  // Calculate time remaining
  useEffect(() => {
    if (!pendingAction) return;

    const expiresAt = new Date(pendingAction.expiresAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, (expiresAt - now) / 1000);
      setTimeRemaining(remaining);
      
      if (remaining <= 0 && phase === 'cancel_window' && !timeExpiredCalledRef.current) {
        timeExpiredCalledRef.current = true;
        // Cancel window expired
        if (pendingAction.isCancelled) {
          // Was cancelled - close animation
          onTimeExpired();
        } else if (pendingAction.requiresTarget) {
          // Need target selection - show selection UI for owner, waiting state for others
          setPhase('target_selection');
          // Only apply if it's NOT my action (owner will call apply manually)
          // Don't call onTimeExpired here - we need to wait for target selection
        } else {
          // No target needed - apply immediately
          setPhase('applying');
          onTimeExpired();
        }
      }
    };

    // Initial update
    updateTimer();
    
    // Update every 50ms for smooth countdown
    const interval = setInterval(updateTimer, 50);
    
    return () => clearInterval(interval);
  }, [pendingAction, phase, isMyAction, onTimeExpired]);

  // Card flip animation on show - only run once per action
  useEffect(() => {
    if (!pendingAction || phase !== 'cancel_window') return;
    
    // Check if this action was already animated
    const actionKey = `${pendingAction.playerId}-${pendingAction.cardId}`;
    if (animatedActionIdRef.current === actionKey && isFlipped) return;
    
    // Light vibration when card appears
    triggerHaptic(80);
    
    // Start flip after card appears
    const flipTimer = setTimeout(() => {
      setIsFlipped(true);
      // Heavy vibration when card flips (action card!)
      triggerHaptic([50, 100, 50]);
    }, 400);
    
    // Show content after flip completes
    const contentTimer = setTimeout(() => {
      setShowContent(true);
      triggerHaptic(40);
    }, 900);
    
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(contentTimer);
    };
  }, [pendingAction?.playerId, pendingAction?.cardId, phase, isFlipped]); // Include all used values

  // Handle cancel button click
  const handleCancel = useCallback(() => {
    if (canCancel && !pendingAction?.isCancelled) {
      triggerHaptic([100, 50, 100]);
      onCancel();
    }
  }, [canCancel, pendingAction, onCancel]);

  // Handle target selection
  const handleSelectTarget = useCallback((targetId: string) => {
    triggerHaptic(60);
    onSelectTarget(targetId);
  }, [onSelectTarget]);

  // Generate dark particles - memoized to prevent regeneration
  const particles = useMemo(() => [...Array(15)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 3 + Math.random() * 2,
    size: 3 + Math.random() * 6,
  })), []);

  // Debug logging
  if (import.meta.env.DEV && pendingAction) {
    console.log('[ActionCardAnimation] pendingAction:', {
      cardName: pendingAction.cardName,
      cardDescription: pendingAction.cardDescription,
      playerName: pendingAction.playerName,
      effect: pendingAction.effect,
    });
  }

  if (!pendingAction) return null;

  // Fallback for missing data
  const cardName = pendingAction.cardName || 'Карта действия';
  const cardDescription = pendingAction.cardDescription || 'Эффект карты применяется...';

  return (
    <AnimatePresence>
      {pendingAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg"
        >
          {/* Dark animated background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 overflow-hidden"
          >
            <motion.div
              animate={{
                background: [
                  'radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.2) 0%, transparent 50%)',
                  'radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.35) 0%, transparent 60%)',
                  'radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.2) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0"
            />
          </motion.div>

          {/* Floating dark particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: '100vh' }}
                animate={{
                  opacity: [0, 0.6, 0.6, 0],
                  y: [100, -100],
                }}
                transition={{
                  delay: p.delay,
                  duration: p.duration,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ left: `${p.x}%` }}
                className="absolute"
              >
                <Skull
                  className="text-red-900/60"
                  style={{ width: p.size, height: p.size }}
                />
              </motion.div>
            ))}
          </div>

          {/* Main dark glow behind card */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isFlipped ? [1, 1.2, 1.1] : 0,
              opacity: isFlipped ? [0.2, 0.5, 0.3] : 0,
            }}
            transition={{ duration: 0.6 }}
            className="absolute w-[450px] h-[650px] rounded-[50px] bg-red-900/50 blur-[80px]"
          />

          {/* Card container with 3D perspective */}
          <div className="relative" style={{ perspective: '1500px' }}>
            <motion.div
              initial={{ scale: 0.3, y: 80, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 15,
                delay: 0.05,
              }}
            >
              {/* 3D Flip container */}
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative"
              >
                {/* Card Back - Dark theme */}
                <motion.div
                  className="w-[85vw] max-w-[380px] aspect-[2.5/3.5] rounded-2xl relative overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(139, 0, 0, 0.4)',
                  }}
                >
                  {/* Card back design - Dark */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-red-950/50 to-gray-950" />
                  <div className="absolute inset-2 rounded-xl border-2 border-red-900/40" />
                  <div className="absolute inset-4 rounded-lg border border-red-800/30" />
                  
                  {/* Decorative dark pattern */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                      className="w-48 h-48 sm:w-56 sm:h-56 opacity-30"
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                          <linearGradient id="darkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7f1d1d" />
                            <stop offset="100%" stopColor="#450a0a" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M50 5 L61 35 L95 35 L68 57 L79 91 L50 70 L21 91 L32 57 L5 35 L39 35 Z"
                          fill="none"
                          stroke="url(#darkGrad)"
                          strokeWidth="1.5"
                        />
                        <circle cx="50" cy="50" r="25" fill="none" stroke="url(#darkGrad)" strokeWidth="0.5" />
                        <circle cx="50" cy="50" r="35" fill="none" stroke="url(#darkGrad)" strokeWidth="0.5" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Skull icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Skull className="w-16 h-16 sm:w-20 sm:h-20 text-red-900/50" />
                    </motion.div>
                  </div>

                  {/* Corner skulls */}
                  <div className="absolute top-4 left-4">
                    <Skull className="w-5 h-5 text-red-900/40" />
                  </div>
                  <div className="absolute bottom-4 right-4 rotate-180">
                    <Skull className="w-5 h-5 text-red-900/40" />
                  </div>
                </motion.div>

                {/* Card Front - Dark theme with content */}
                <motion.div
                  className="w-[85vw] max-w-[380px] aspect-[2.5/3.5] rounded-2xl absolute top-0 left-0 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 80px rgba(139, 0, 0, 0.5)',
                  }}
                >
                  {/* Card front background - Dark gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/95 to-red-950/30" />
                  
                  {/* Subtle dark pattern */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, #7f1d1d 1px, transparent 0)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  
                  {/* Animated dark border glow */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        'inset 0 0 30px rgba(127, 29, 29, 0.3)',
                        'inset 0 0 50px rgba(127, 29, 29, 0.5)',
                        'inset 0 0 30px rgba(127, 29, 29, 0.3)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl"
                  />
                  
                  {/* Ornate border frame */}
                  <div className="absolute inset-3 rounded-xl border border-red-900/50" />
                  <div className="absolute inset-4 rounded-lg border border-red-800/30" />
                  
                  {/* Corner ornaments */}
                  <div className="absolute top-5 left-5 w-7 h-7 border-l-2 border-t-2 border-red-900/60 rounded-tl-lg" />
                  <div className="absolute top-5 right-5 w-7 h-7 border-r-2 border-t-2 border-red-900/60 rounded-tr-lg" />
                  <div className="absolute bottom-5 left-5 w-7 h-7 border-l-2 border-b-2 border-red-900/60 rounded-bl-lg" />
                  <div className="absolute bottom-5 right-5 w-7 h-7 border-r-2 border-b-2 border-red-900/60 rounded-br-lg" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 sm:p-7">
                    
                    {/* Top: Player name */}
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : -20 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                      className="text-center mb-3"
                    >
                      <p className="text-gray-400 text-sm sm:text-base tracking-wide">
                        <span className="text-red-500 font-semibold">{pendingAction.playerName}</span>
                      </p>
                      <p className="text-gray-500 text-sm">
                        активирует карту действия
                      </p>
                    </motion.div>

                    {/* Divider */}
                    <motion.div
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: showContent ? 1 : 0, opacity: showContent ? 1 : 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="w-full max-w-[180px] h-px bg-gradient-to-r from-transparent via-red-900/70 to-transparent mb-4"
                    />

                    {/* Card name label */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.5 }}
                      transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
                      className="mb-3"
                    >
                      <div className="px-5 py-2 rounded-full bg-gradient-to-r from-red-900/30 via-red-800/40 to-red-900/30 border border-red-900/60">
                        <span className="font-display text-red-500 text-sm sm:text-base uppercase tracking-[0.15em]">
                          {cardName}
                        </span>
                      </div>
                    </motion.div>

                    {/* Card description */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{
                        opacity: showContent ? 1 : 0,
                        scale: showContent ? 1 : 0.8,
                        y: showContent ? 0 : 20,
                      }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 12 }}
                      className="w-full px-3 py-4 sm:px-5 sm:py-5 rounded-xl bg-gradient-to-b from-red-900/20 to-red-950/10 border border-red-900/40 relative overflow-hidden"
                    >
                      {/* Inner dark glow */}
                      <motion.div
                        animate={{
                          opacity: [0.2, 0.4, 0.2],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-to-t from-red-900/15 to-transparent"
                      />
                      
                      {/* Description text */}
                      <motion.p
                        animate={showContent ? {
                          textShadow: [
                            '0 0 15px rgba(127, 29, 29, 0.3)',
                            '0 0 30px rgba(127, 29, 29, 0.5)',
                            '0 0 15px rgba(127, 29, 29, 0.3)',
                          ],
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="relative z-10 text-gray-300 text-sm sm:text-base text-center leading-relaxed"
                      >
                        {cardDescription}
                      </motion.p>
                    </motion.div>

                    {/* Timer display */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: showContent ? 1 : 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4 text-red-600" />
                      <span className="font-display text-red-500 text-lg">
                        {Math.ceil(timeRemaining)}s
                      </span>
                    </motion.div>
                  </div>

                  {/* Corner skull decorations */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showContent ? 1 : 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute top-6 right-6"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <Skull className="w-4 h-4 text-red-900/50" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showContent ? 1 : 0 }}
                    transition={{ delay: 0.6 }}
                    className="absolute bottom-6 left-6"
                  >
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <Skull className="w-4 h-4 text-red-900/50" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Cancel button - only shown if player can cancel */}
          {canCancel && phase === 'cancel_window' && !pendingAction.isCancelled && (
            <motion.button
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ delay: 0.8 }}
              onClick={handleCancel}
              className="absolute bottom-24 px-8 py-4 rounded-xl bg-red-900/80 border-2 border-red-600 text-white font-display text-lg flex items-center gap-3 hover:bg-red-800 active:scale-95 transition-all shadow-2xl"
            >
              <Ban className="w-6 h-6" />
              ОТМЕНИТЬ ДЕЙСТВИЕ
            </motion.button>
          )}

          {/* Cancelled indicator */}
          {pendingAction.isCancelled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-24 px-8 py-4 rounded-xl bg-gray-800/90 border-2 border-gray-600 text-gray-300 font-display text-lg flex items-center gap-3"
            >
              <X className="w-6 h-6 text-red-500" />
              ДЕЙСТВИЕ ОТМЕНЕНО
            </motion.div>
          )}

          {/* Target selection panel - for action owner */}
          {phase === 'target_selection' && isMyAction && validTargets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-4 right-4 max-w-md mx-auto bg-gray-900/95 border-2 border-red-900/60 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-red-500" />
                <span className="font-display text-red-400 text-sm uppercase tracking-wider">
                  Выберите цель
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {validTargets.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => handleSelectTarget(target.id)}
                    className="px-3 py-2 rounded-lg bg-gray-800/80 border border-red-900/40 text-gray-200 text-sm hover:bg-red-900/30 hover:border-red-700 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-400">
                      {target.name[0]}
                    </div>
                    <span className="truncate">{target.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* No valid targets message - for action owner */}
          {phase === 'target_selection' && isMyAction && validTargets.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-24 px-8 py-4 rounded-xl bg-gray-800/90 border-2 border-red-900/40 text-gray-300 font-display text-base flex items-center gap-3"
            >
              <Ban className="w-5 h-5 text-red-500" />
              <span>Нет доступных целей для этой карты</span>
            </motion.div>
          )}
          
          {/* Waiting for target selection - for other players */}
          {phase === 'target_selection' && !isMyAction && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-24 px-8 py-4 rounded-xl bg-gray-800/90 border-2 border-red-900/40 text-gray-300 font-display text-base flex items-center gap-3"
            >
              <Target className="w-5 h-5 text-red-500 animate-pulse" />
              <span>{pendingAction.playerName} выбирает цель...</span>
            </motion.div>
          )}

          {/* Timer progress bar */}
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-2 bg-gray-800/50 rounded-full overflow-hidden border border-red-900/30"
          >
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: timeRemaining / 4 }}
              transition={{ duration: 0.1 }}
              className="h-full bg-gradient-to-r from-red-800 to-red-600 rounded-full origin-left"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionCardAnimation;
