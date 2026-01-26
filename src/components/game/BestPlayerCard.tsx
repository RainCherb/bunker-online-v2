import { motion, AnimatePresence } from 'framer-motion';
import { Star, Crown } from 'lucide-react';
import { Player } from '@/types/game';

interface BestPlayerCardProps {
  player: Player | null;
  isVisible: boolean;
  onClose: () => void;
}

const BestPlayerCard = ({ player, isVisible, onClose }: BestPlayerCardProps) => {
  if (!player) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/90" />
          
          {/* Card */}
          <motion.div
            initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 20,
              delay: 0.2 
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm"
          >
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-yellow-600/20 to-orange-500/30 rounded-2xl blur-xl animate-pulse" />
            
            {/* Card content */}
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl border-2 border-amber-500/50 p-6 pt-10 shadow-2xl">
              {/* Crown icon - centered at top */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-4"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
                  <Crown className="w-12 h-12 text-zinc-900" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center mb-6"
              >
                <h2 className="font-display text-2xl text-amber-400 tracking-wider">
                  ЛУЧШИЙ ИГРОК
                </h2>
              </motion.div>

              {/* Star decorations */}
              <div className="absolute top-4 left-4">
                <Star className="w-4 h-4 text-amber-500/50" fill="currentColor" />
              </div>
              <div className="absolute top-4 right-4">
                <Star className="w-4 h-4 text-amber-500/50" fill="currentColor" />
              </div>

              {/* Player info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="space-y-4"
              >
                {/* Player name */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <span className="font-display text-2xl text-amber-300">
                      {player.name}
                    </span>
                  </div>
                </div>

                {/* Player details */}
                <div className="space-y-3 mt-6">
                  {/* Biology */}
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Биология</p>
                    <p className="text-sm text-zinc-200">{player.characteristics.biology}</p>
                  </div>

                  {/* Profession */}
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Профессия</p>
                    <p className="text-sm text-zinc-200">{player.characteristics.profession}</p>
                  </div>

                  {/* Fact */}
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Факт</p>
                    <p className="text-sm text-zinc-200">{player.characteristics.fact}</p>
                  </div>
                </div>
              </motion.div>

              {/* Close hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-center text-xs text-zinc-500 mt-6"
              >
                Нажмите для продолжения
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BestPlayerCard;
