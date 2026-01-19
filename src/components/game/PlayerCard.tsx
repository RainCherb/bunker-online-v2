import { memo } from 'react';
import { motion } from 'framer-motion';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER } from '@/types/game';
import { Eye, EyeOff, Crown, Skull, CheckCircle } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  index: number;
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
  hasRevealedThisTurn?: boolean;
  isVoting?: boolean;
  isTurnPhase?: boolean;
}

const PlayerCard = memo(({ 
  player, 
  index, 
  isCurrentPlayer, 
  isCurrentTurn, 
  hasRevealedThisTurn,
  isVoting = false,
  isTurnPhase = false
}: PlayerCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`player-card relative h-full flex flex-col ${player.isEliminated ? 'eliminated opacity-60' : ''} ${
        isCurrentTurn && !player.isEliminated ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
    >
      {/* Current turn indicator */}
      {isCurrentTurn && !player.isEliminated && isTurnPhase && (
        <div
          className={`absolute -top-2 -left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center z-10 ${
            hasRevealedThisTurn ? 'bg-green-500' : 'bg-primary animate-pulse'
          }`}
        >
          {hasRevealedThisTurn ? (
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          ) : (
            <span className="text-xs text-primary-foreground font-bold">!</span>
          )}
        </div>
      )}

      {/* Status Icons */}
      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1">
        {player.isHost && (
          <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
        )}
        {player.isEliminated && (
          <Skull className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
        )}
      </div>

      {/* Player Number & Name */}
      <div className="text-center mb-2 sm:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full flex items-center justify-center font-display text-sm sm:text-lg ${
          player.isEliminated 
            ? 'bg-destructive/20 text-destructive' 
            : isCurrentPlayer 
              ? 'bg-primary text-primary-foreground' 
              : isCurrentTurn
                ? hasRevealedThisTurn
                  ? 'bg-green-500 text-white'
                  : 'bg-secondary text-secondary-foreground'
                : 'bg-primary/20 text-primary'
        }`}>
          {player.isEliminated ? <Skull className="w-4 h-4 sm:w-5 sm:h-5" /> : index + 1}
        </div>
        <h3 className="font-display text-xs sm:text-sm truncate max-w-full overflow-hidden text-ellipsis">{player.name}</h3>
        {isCurrentPlayer && !player.isEliminated && (
          <span className="text-xs text-primary font-display">ВЫ</span>
        )}
        {isCurrentTurn && !player.isEliminated && isTurnPhase && !isCurrentPlayer && (
          <span className={`text-xs font-display ${hasRevealedThisTurn ? 'text-green-500' : 'text-secondary'}`}>
            {hasRevealedThisTurn ? '✓' : 'ХОДИТ'}
          </span>
        )}
      </div>

      {/* Characteristics - show revealed values */}
      <div className="space-y-1 flex-1">
        {CHARACTERISTICS_ORDER.slice(0, 6).map((key) => {
          const isRevealed = player.revealedCharacteristics.includes(key);
          const value = player.characteristics[key];
          
          return (
            <div
              key={key}
              className={`text-xs px-1 py-0.5 sm:py-1 rounded flex items-center justify-between gap-1 ${
                isRevealed 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              <span className="truncate flex-1 text-left">
                {isRevealed ? value : CHARACTERISTIC_NAMES[key]}
              </span>
              {isRevealed ? (
                <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-primary" />
              ) : (
                <EyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Clickable hint */}
      {player.revealedCharacteristics.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-70">
          Нажмите для подробностей
        </p>
      )}

      {/* Votes indicator */}
      {isVoting && player.votesAgainst > 0 && !player.isEliminated && (
        <div className="mt-2 sm:mt-3 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded bg-destructive/20 text-destructive text-xs font-display">
            <Skull className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {player.votesAgainst}
          </span>
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when these change
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.isEliminated === nextProps.player.isEliminated &&
    prevProps.player.votesAgainst === nextProps.player.votesAgainst &&
    prevProps.player.revealedCharacteristics.length === nextProps.player.revealedCharacteristics.length &&
    prevProps.isCurrentPlayer === nextProps.isCurrentPlayer &&
    prevProps.isCurrentTurn === nextProps.isCurrentTurn &&
    prevProps.hasRevealedThisTurn === nextProps.hasRevealedThisTurn &&
    prevProps.isVoting === nextProps.isVoting &&
    prevProps.isTurnPhase === nextProps.isTurnPhase
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;