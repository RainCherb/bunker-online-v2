import { motion } from 'framer-motion';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER, Characteristics } from '@/types/game';
import { X, Eye, EyeOff, Lock } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface CharacterPanelProps {
  player: Player;
  isOwn: boolean;
  onClose?: () => void;
}

const CharacterPanel = ({ player, isOwn, onClose }: CharacterPanelProps) => {
  const { revealCharacteristic, gameState } = useGame();

  const handleReveal = (key: keyof Characteristics) => {
    if (isOwn && !player.revealedCharacteristics.includes(key)) {
      revealCharacteristic(player.id, key);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl text-primary">
            {isOwn ? 'ВАШ ПЕРСОНАЖ' : player.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwn ? 'Раскрывайте характеристики по очереди' : 'Информация об игроке'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Characteristics */}
      <div className="space-y-3">
        {CHARACTERISTICS_ORDER.map((key, index) => {
          const isRevealed = player.revealedCharacteristics.includes(key);
          const value = player.characteristics[key];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                isRevealed
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-muted bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isRevealed ? (
                      <Eye className="w-4 h-4 text-primary" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-display text-sm text-muted-foreground">
                      {CHARACTERISTIC_NAMES[key]}
                    </span>
                  </div>
                  {isRevealed || isOwn ? (
                    <p className={`font-medium ${isRevealed ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {value}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">Скрыто</p>
                  )}
                </div>

                {isOwn && !isRevealed && (
                  <button
                    onClick={() => handleReveal(key)}
                    className="px-3 py-1 text-xs font-display uppercase tracking-wide rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  >
                    Раскрыть
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
        <h3 className="font-display text-sm text-muted-foreground mb-2">ЛЕГЕНДА</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span>Раскрыто для всех</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span>Скрыто от других игроков</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterPanel;
