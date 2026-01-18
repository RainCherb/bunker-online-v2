import { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER, Characteristics } from '@/types/game';
import { X, Eye, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface CharacterPanelProps {
  player: Player;
  isOwn: boolean;
  onClose?: () => void;
}

const CharacterPanel = memo(({ player, isOwn, onClose }: CharacterPanelProps) => {
  const { 
    revealCharacteristic, 
    gameState, 
    currentPlayer, 
    getCurrentTurnPlayer,
    canRevealCharacteristic,
    getAvailableCharacteristics,
    hasRevealedThisTurn
  } = useGame();
  
  const isTurnPhase = gameState?.phase === 'turn';
  const currentTurnPlayer = getCurrentTurnPlayer();
  const isMyTurn = isTurnPhase && currentTurnPlayer?.id === currentPlayer?.id;
  const hasRevealed = isOwn ? hasRevealedThisTurn() : false;
  const currentRound = gameState?.currentRound || 1;

  // Memoize available characteristics
  const availableChars = useMemo(() => 
    isOwn ? getAvailableCharacteristics(player.id) : [],
    [isOwn, getAvailableCharacteristics, player.id]
  );

  const handleReveal = useCallback(async (key: keyof Characteristics) => {
    if (canRevealCharacteristic(player.id, key)) {
      await revealCharacteristic(player.id, key);
    }
  }, [canRevealCharacteristic, player.id, revealCharacteristic]);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
        <div>
          <h2 className="font-display text-lg sm:text-xl text-primary">
            {isOwn ? 'ВАШ ПЕРСОНАЖ' : player.name}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isOwn ? (
              isMyTurn 
                ? (hasRevealed 
                    ? 'Вы раскрыли карту. Ждём следующего игрока' 
                    : (currentRound === 1 
                        ? 'Раскройте профессию!' 
                        : 'Раскройте любую карту!'))
                : 'Ожидайте своей очереди'
            ) : 'Информация об игроке'}
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

      {/* Turn indicator */}
      {isOwn && isTurnPhase && (
        <div
          className={`mb-4 p-2 sm:p-3 rounded-lg flex items-center gap-2 flex-shrink-0 ${
            isMyTurn 
              ? hasRevealed
                ? 'bg-green-500/20 border border-green-500 text-green-500'
                : 'bg-primary/20 border border-primary text-primary' 
              : 'bg-muted/50 border border-border text-muted-foreground'
          }`}
        >
          {hasRevealed ? (
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="font-display text-xs sm:text-sm">
            {isMyTurn 
              ? (hasRevealed 
                  ? 'КАРТА РАСКРЫТА ✓' 
                  : (currentRound === 1 
                      ? 'ВАШ ХОД — РАСКРОЙТЕ ПРОФЕССИЮ' 
                      : 'ВАШ ХОД — РАСКРОЙТЕ КАРТУ'))
              : `Ходит: ${currentTurnPlayer?.name || 'Ожидание...'}`}
          </span>
        </div>
      )}

      {/* Round info */}
      {isOwn && isTurnPhase && (
        <div className="mb-4 p-2 rounded-lg bg-muted/30 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          {currentRound === 1 
            ? '📋 Раунд 1: Можно раскрыть только Профессию' 
            : `📋 Раунд ${currentRound}: Можно раскрыть любую одну карту`}
        </div>
      )}

      {/* Characteristics - optimized with less animation */}
      <div className="space-y-2 sm:space-y-3 overflow-y-auto flex-1 will-change-scroll">
        {CHARACTERISTICS_ORDER.map((key) => {
          const isRevealed = player.revealedCharacteristics.includes(key);
          const value = player.characteristics[key];
          const canReveal = isOwn && canRevealCharacteristic(player.id, key);
          const isAvailable = availableChars.includes(key);

          return (
            <div
              key={key}
              className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                isRevealed
                  ? 'border-primary/50 bg-primary/10'
                  : isAvailable && isMyTurn && !hasRevealed
                    ? 'border-secondary/50 bg-secondary/10'
                    : 'border-muted bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    {isRevealed ? (
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-display text-xs sm:text-sm text-muted-foreground truncate">
                      {CHARACTERISTIC_NAMES[key]}
                    </span>
                  </div>
                  {isRevealed || isOwn ? (
                    <p className={`text-sm sm:text-base font-medium truncate ${isRevealed ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {value}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">Скрыто</p>
                  )}
                </div>

                {isOwn && !isRevealed && (
                  <button
                    onClick={() => handleReveal(key)}
                    disabled={!canReveal}
                    className={`px-2 sm:px-3 py-1 text-xs font-display uppercase tracking-wide rounded transition-colors flex-shrink-0 ${
                      canReveal 
                        ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer animate-pulse' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {canReveal 
                      ? 'Раскрыть' 
                      : (hasRevealed 
                          ? 'Уже раскрыли' 
                          : (!isMyTurn 
                              ? 'Не ваш ход' 
                              : (currentRound === 1 && key !== 'profession' 
                                  ? 'Только профессия' 
                                  : 'Недоступно')))}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border flex-shrink-0">
        <h3 className="font-display text-xs sm:text-sm text-muted-foreground mb-2">ЛЕГЕНДА</h3>
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span>Раскрыто для всех</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
            <span>Скрыто от других</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CharacterPanel.displayName = 'CharacterPanel';

export default CharacterPanel;