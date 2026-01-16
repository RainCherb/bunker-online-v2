import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Crown, Skull } from 'lucide-react';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER } from '@/types/game';

interface PlayerDetailModalProps {
  player: Player | null;
  onClose: () => void;
}

const PlayerDetailModal = ({ player, onClose }: PlayerDetailModalProps) => {
  if (!player) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display ${
                player.isEliminated 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-primary/20 text-primary'
              }`}>
                {player.isEliminated ? <Skull className="w-5 h-5" /> : player.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-display text-lg flex items-center gap-2">
                  {player.name}
                  {player.isHost && <Crown className="w-4 h-4 text-secondary" />}
                </h3>
                {player.isEliminated && (
                  <span className="text-xs text-destructive">Исключён из игры</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Characteristics */}
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <h4 className="font-display text-sm text-muted-foreground mb-3">
              Характеристики персонажа
            </h4>
            
            {CHARACTERISTICS_ORDER.map((key) => {
              const isRevealed = player.revealedCharacteristics.includes(key);
              const value = player.characteristics[key];
              
              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    isRevealed 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-display text-muted-foreground uppercase">
                          {CHARACTERISTIC_NAMES[key]}
                        </span>
                        {isRevealed ? (
                          <Eye className="w-3 h-3 text-primary" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      {isRevealed ? (
                        <p className="text-sm text-foreground">{value}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Не раскрыто</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button
              onClick={onClose}
              className="w-full bunker-button-secondary"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlayerDetailModal;
