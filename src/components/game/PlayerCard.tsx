import { motion } from 'framer-motion';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER } from '@/types/game';
import { Eye, EyeOff, Crown, Skull, User } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface PlayerCardProps {
  player: Player;
  index: number;
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
}

const PlayerCard = ({ player, index, isCurrentPlayer, isCurrentTurn }: PlayerCardProps) => {
  const { gameState } = useGame();
  const isVoting = gameState?.phase === 'voting' || gameState?.phase === 'results';
  const isTurnPhase = gameState?.phase === 'turn';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`player-card relative ${player.isEliminated ? 'eliminated opacity-60' : ''} ${
        isCurrentTurn && !player.isEliminated ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
    >
      {/* Current turn indicator */}
      {isCurrentTurn && !player.isEliminated && isTurnPhase && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10"
        >
          <span className="text-xs text-primary-foreground font-bold">!</span>
        </motion.div>
      )}

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
              : isCurrentTurn
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-primary/20 text-primary'
        }`}>
          {player.isEliminated ? <Skull className="w-5 h-5" /> : index + 1}
        </div>
        <h3 className="font-display text-sm truncate">{player.name}</h3>
        {isCurrentPlayer && !player.isEliminated && (
          <span className="text-xs text-primary font-display">ВЫ</span>
        )}
        {isCurrentTurn && !player.isEliminated && isTurnPhase && !isCurrentPlayer && (
          <span className="text-xs text-secondary font-display">ХОДИТ</span>
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
                <Eye className="w-3 h-3 flex-shrink-0 text-primary" />
              ) : (
                <EyeOff className="w-3 h-3 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Votes indicator */}
      {isVoting && player.votesAgainst > 0 && !player.isEliminated && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-3 text-center"
        >
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/20 text-destructive text-xs font-display">
            <Skull className="w-3 h-3" />
            {player.votesAgainst}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PlayerCard;
