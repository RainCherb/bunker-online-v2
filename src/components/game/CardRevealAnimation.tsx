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
          {/* Glow effect */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1.2],
              opacity: [0, 0.6, 0.4]
            }}
            transition={{ duration: 0.8, times: [0, 0.6, 1] }}
            className="absolute w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-primary/30 blur-3xl"
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
            {/* Card container */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bunker-card text-center max-w-sm sm:max-w-md px-6 py-8 sm:px-10 sm:py-12"
              style={{
                boxShadow: '0 0 60px hsl(var(--primary) / 0.4), 0 0 100px hsl(var(--primary) / 0.2)'
              }}
            >
              {/* Player info */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground text-sm sm:text-base mb-2"
              >
                Игрок <span className="text-secondary font-display">{playerName}</span>
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6"
              >
                открывает карту
              </motion.p>

              {/* Characteristic type */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                className="inline-block px-4 py-2 rounded-lg bg-primary/20 border border-primary/50 mb-4 sm:mb-6"
              >
                <span className="font-display text-primary text-sm sm:text-lg uppercase tracking-wider">
                  {characteristicName}
                </span>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mb-4 sm:mb-6"
              />

              {/* Revealed value */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.9, 
                  type: "spring",
                  stiffness: 150,
                  damping: 15
                }}
              >
                <p className="font-display text-xl sm:text-3xl text-primary text-glow leading-tight">
                  {characteristicValue}
                </p>
              </motion.div>

              {/* Tap to close hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-muted-foreground mt-6 sm:mt-8"
              >
                Нажмите, чтобы закрыть
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Auto-close timer */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 4, ease: "linear" }}
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
