import { motion, AnimatePresence } from 'framer-motion';
import { CHARACTERISTIC_NAMES, Characteristics } from '@/types/game';
import { Sparkles } from 'lucide-react';

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={onComplete}
        >
          {/* Glow effect - larger for full screen */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1.2],
              opacity: [0, 0.6, 0.4]
            }}
            transition={{ duration: 0.8, times: [0, 0.6, 1] }}
            className="absolute w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] rounded-full bg-primary/30 blur-3xl"
          />

          {/* Sparkles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute inset-0 overflow-hidden pointer-events-none"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: '50%',
                  y: '50%'
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: `${30 + Math.random() * 40}%`,
                  y: `${30 + Math.random() * 40}%`
                }}
                transition={{ 
                  delay: 0.3 + i * 0.05,
                  duration: 1.5,
                  ease: "easeOut"
                }}
                className="absolute"
              >
                <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </motion.div>
            ))}
          </motion.div>

          {/* Main card */}
          <motion.div
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.1
            }}
            className="relative z-10 mx-4"
          >
            {/* Card container - MUCH LARGER, almost full screen */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bunker-card text-center w-[90vw] max-w-2xl px-6 py-10 sm:px-12 sm:py-16"
              style={{
                boxShadow: '0 0 80px hsl(var(--primary) / 0.5), 0 0 150px hsl(var(--primary) / 0.3)'
              }}
            >
              {/* Player info */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground text-base sm:text-xl mb-2"
              >
                Игрок <span className="text-secondary font-display">{playerName}</span>
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground text-base sm:text-xl mb-6 sm:mb-8"
              >
                открывает карту
              </motion.p>

              {/* Characteristic type */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                className="inline-block px-6 py-3 rounded-lg bg-primary/20 border-2 border-primary/50 mb-6 sm:mb-8"
              >
                <span className="font-display text-primary text-lg sm:text-2xl uppercase tracking-wider">
                  {characteristicName}
                </span>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mb-6 sm:mb-8"
              />

              {/* Revealed value - MUCH LARGER */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.9, 
                  type: "spring",
                  stiffness: 150,
                  damping: 15
                }}
                className="px-4 py-6 sm:px-8 sm:py-8 rounded-xl bg-primary/10 border border-primary/30"
              >
                <p className="font-display text-2xl sm:text-4xl md:text-5xl text-primary text-glow leading-tight">
                  {characteristicValue}
                </p>
              </motion.div>

              {/* Tap to close hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="text-sm text-muted-foreground mt-8 sm:mt-10"
              >
                Нажмите, чтобы закрыть
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Auto-close timer */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 10, ease: "linear" }}
            onAnimationComplete={onComplete}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary/30 rounded-full origin-left"
          >
            <div className="w-full h-full bg-primary rounded-full" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardRevealAnimation;
