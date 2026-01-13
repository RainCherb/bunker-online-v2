import { motion } from 'framer-motion';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER } from '@/types/game';
import { Eye, EyeOff, Crown, Skull } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface PlayerCardProps {
  player: Player;
  index: number;
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
}

const PlayerCard = ({ player, index, isCurrentPlayer, isCurrentTurn }: PlayerCardProps) => {
  const { gameState } = useGame();
  const isVoting = gameState?.phase === 'voting';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`player-card ${player.isEliminated ? 'eliminated' : ''} ${isCurrentTurn && !player.isEliminated ? 'current-turn' : ''}`}
    >
      {/* Status Icons */}
      <div className="absolute top-2 right-2 flex gap-1">
        {player.isHost && (
          <Crown className="w-4 h-4 text-secondary" />
        )}
        {player.isEliminated && (
          <Skull className="w-4 h-4 text-destructive" />
        )}
      </div>

      {/* Player Number & Name */}
      <div className="text-center mb-4">
        <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center font-display text-lg ${
          player.isEliminated 
            ? 'bg-destructive/20 text-destructive' 
            : isCurrentPlayer 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-primary/20 text-primary'
        }`}>
          {index + 1}
        </div>
        <h3 className="font-display text-sm truncate">{player.name}</h3>
        {isCurrentPlayer && (
          <span className="text-xs text-primary font-display">ВЫ</span>
        )}
      </div>

      {/* Characteristics */}
      <div className="space-y-1.5">
        {CHARACTERISTICS_ORDER.slice(0, 5).map((key) => {
          const isRevealed = player.revealedCharacteristics.includes(key);
          return (
            <div
              key={key}
              className={`characteristic-badge text-xs w-full justify-between ${
                isRevealed ? 'revealed' : 'hidden'
              }`}
            >
              <span className="truncate">{CHARACTERISTIC_NAMES[key]}</span>
              {isRevealed ? (
                <Eye className="w-3 h-3 flex-shrink-0" />
              ) : (
                <EyeOff className="w-3 h-3 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Votes indicator */}
      {isVoting && player.votesAgainst > 0 && !player.isEliminated && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/20 text-destructive text-xs font-display">
            <Skull className="w-3 h-3" />
            {player.votesAgainst}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default PlayerCard;
