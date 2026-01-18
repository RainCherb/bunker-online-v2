import { memo, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { AlertTriangle, Clock, Shield, Info } from 'lucide-react';

const GameInfo = memo(() => {
  const { gameState } = useGame();

  // Memoize computed values
  const stats = useMemo(() => {
    if (!gameState) return null;
    return {
      alivePlayers: gameState.players.filter(p => !p.isEliminated).length,
      eliminatedPlayers: gameState.players.filter(p => p.isEliminated).length,
    };
  }, [gameState]);

  if (!gameState || !stats) return null;

  const { catastrophe, bunker } = gameState;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Catastrophe Card */}
      <div className="p-3 sm:p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
          <h3 className="font-display text-xs sm:text-sm text-destructive">КАТАСТРОФА</h3>
        </div>
        <h4 className="font-display text-base sm:text-lg text-destructive mb-2">
          {catastrophe.name}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {catastrophe.description}
        </p>
        <div className="flex items-center gap-2 mt-2 sm:mt-3 text-xs sm:text-sm">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          <span>Время выживания: {catastrophe.survivalTime}</span>
        </div>
      </div>

      {/* Bunker Card */}
      <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="font-display text-xs sm:text-sm text-primary">БУНКЕР</h3>
        </div>
        <h4 className="font-display text-base sm:text-lg text-primary mb-2 sm:mb-3">
          {bunker.name}
        </h4>

        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span>{bunker.description}</span>
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          <h5 className="font-display text-xs text-muted-foreground mb-2">В БУНКЕРЕ ИМЕЕТСЯ:</h5>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {bunker.supplies.map((item, i) => (
              <span
                key={i}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded bg-muted border border-border"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Game Stats */}
      <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
        <h3 className="font-display text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">СТАТИСТИКА</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <div className="font-display text-xl sm:text-2xl text-primary">{gameState.bunkerSlots}</div>
            <div className="text-xs text-muted-foreground">Мест в бункере</div>
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl text-secondary">{gameState.currentRound}/7</div>
            <div className="text-xs text-muted-foreground">Раунд</div>
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl text-foreground">
              {stats.alivePlayers}
            </div>
            <div className="text-xs text-muted-foreground">Выживших</div>
          </div>
          <div>
            <div className="font-display text-xl sm:text-2xl text-destructive">
              {stats.eliminatedPlayers}
            </div>
            <div className="text-xs text-muted-foreground">Изгнанных</div>
          </div>
        </div>
      </div>
    </div>
  );
});

GameInfo.displayName = 'GameInfo';

export default GameInfo;