import { memo, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER, Characteristics } from '@/types/game';
import { X, Eye, Lock, AlertCircle, CheckCircle, Info, UserPlus, Copy, Check, Ban, Zap } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { getActionCardById } from '@/data/gameData';

// Modal for showing full card details
interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType: keyof Characteristics | null;
  cardValue: string;
}

const CardDetailModal = ({ isOpen, onClose, cardType, cardValue }: CardDetailModalProps) => {
  if (!isOpen || !cardType) return null;
  
  const isActionCard = cardType === 'actionCard1' || cardType === 'actionCard2';
  const colorClass = isActionCard ? 'red' : 'primary';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-card border-2 rounded-xl p-6 max-w-md w-full shadow-2xl ${
              isActionCard ? 'border-red-500/50' : 'border-primary/50'
            }`}
            style={{ boxShadow: isActionCard ? '0 0 40px rgba(239, 68, 68, 0.3)' : '0 0 40px hsl(var(--primary) / 0.3)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isActionCard ? (
                  <Zap className="w-5 h-5 text-red-500" />
                ) : (
                  <Info className="w-5 h-5 text-primary" />
                )}
                <h3 className={`font-display text-lg uppercase tracking-wider ${
                  isActionCard ? 'text-red-500' : 'text-primary'
                }`}>
                  {CHARACTERISTIC_NAMES[cardType]}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Divider */}
            <div className={`h-px bg-gradient-to-r from-transparent to-transparent mb-4 ${
              isActionCard ? 'via-red-500/50' : 'via-primary/50'
            }`} />

            {/* Card Value */}
            <div className={`p-4 rounded-lg border ${
              isActionCard ? 'bg-red-500/10 border-red-500/30' : 'bg-primary/10 border-primary/30'
            }`}>
              <p className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                {cardValue}
              </p>
            </div>

            {/* Close hint */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              Нажмите где угодно, чтобы закрыть
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Recovery link modal
interface RecoveryLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryLink: string;
}

const RecoveryLinkModal = ({ isOpen, onClose, recoveryLink }: RecoveryLinkModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = recoveryLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border-2 border-secondary/50 rounded-xl p-6 max-w-md w-full shadow-2xl"
            style={{ boxShadow: '0 0 40px hsl(var(--secondary) / 0.3)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-secondary" />
                <h3 className="font-display text-lg text-secondary uppercase tracking-wider">
                  Восстановление игрока
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent mb-4" />

            {/* Instructions */}
            <p className="text-sm text-muted-foreground mb-4">
              Отправьте эту ссылку игроку, который потерял доступ к игре. После перехода по ссылке он автоматически вернётся на своего персонажа.
            </p>

            {/* Link display */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border mb-4">
              <p className="text-xs text-foreground break-all font-mono">
                {recoveryLink}
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`w-full px-4 py-3 rounded-lg font-display flex items-center justify-center gap-2 transition-colors ${
                copied 
                  ? 'bg-green-500/20 border border-green-500 text-green-500'
                  : 'bg-secondary/20 border border-secondary text-secondary hover:bg-secondary/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Копировать ссылку
                </>
              )}
            </button>

            {/* Warning */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              ⚠️ Ссылка работает один раз. После использования сгенерируйте новую при необходимости.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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

  // State for card detail modal (only store type, get value from player to avoid stale data)
  const [selectedCard, setSelectedCard] = useState<{ type: keyof Characteristics } | null>(null);
  
  // Debounce state to prevent double-clicks
  const [isRevealing, setIsRevealing] = useState(false);
  
  // Recovery link modal state
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  
  const isTurnPhase = gameState?.phase === 'turn';
  const currentTurnPlayer = getCurrentTurnPlayer();
  const isMyTurn = isTurnPhase && currentTurnPlayer?.id === currentPlayer?.id;
  const hasRevealed = isOwn ? hasRevealedThisTurn() : false;
  const currentRound = gameState?.currentRound || 1;
  
  // Check for round restrictions from action cards
  const roundRestriction = gameState?.roundRestriction;

  // Memoize available characteristics
  const availableChars = useMemo(() => 
    isOwn ? getAvailableCharacteristics(player.id) : [],
    [isOwn, getAvailableCharacteristics, player.id]
  );

  const handleReveal = useCallback(async (key: keyof Characteristics) => {
    if (isRevealing) return; // Prevent double-clicks
    if (canRevealCharacteristic(player.id, key)) {
      setIsRevealing(true);
      try {
        await revealCharacteristic(player.id, key);
      } finally {
        // Reset after a delay to prevent rapid re-clicks
        setTimeout(() => setIsRevealing(false), 1000);
      }
    }
  }, [canRevealCharacteristic, player.id, revealCharacteristic, isRevealing]);

  const handleCardClick = useCallback((key: keyof Characteristics) => {
    if (isOwn) {
      setSelectedCard({ type: key });
    }
  }, [isOwn]);

  // Generate recovery link for host to share with disconnected player
  const handleGenerateRecoveryLink = useCallback(() => {
    if (!gameState) return;
    const token = btoa(`${gameState.id}|${player.id}`);
    const link = `${window.location.origin}/recover/${token}`;
    setRecoveryLink(link);
  }, [gameState, player.id]);

  // Get current card value from player (avoids stale data)
  // For action cards, resolve ID to full card description
  const getCardValue = useCallback((key: keyof Characteristics) => {
    const value = player.characteristics[key] || '';
    
    // If it's an action card, resolve the ID to name + description
    if (key === 'actionCard1' || key === 'actionCard2') {
      const card = getActionCardById(value);
      if (card) {
        return `${card.name}\n\n${card.description}`;
      }
    }
    
    return value;
  }, [player.characteristics]);
  
  // Get display value for the card list (short version)
  const getDisplayValue = useCallback((key: keyof Characteristics) => {
    const value = player.characteristics[key] || '';
    
    // If it's an action card, show just the name
    if (key === 'actionCard1' || key === 'actionCard2') {
      const card = getActionCardById(value);
      if (card) {
        return card.name;
      }
    }
    
    return value;
  }, [player.characteristics]);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col safe-area-inset">
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
        <div className="flex items-center gap-2">
          {/* Recovery button - only for host viewing other players */}
          {!isOwn && currentPlayer?.isHost && (
            <button
              onClick={handleGenerateRecoveryLink}
              title="Восстановить игрока"
              className="p-2 min-w-[44px] min-h-[44px] rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-colors flex items-center justify-center"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
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
      
      {/* Round restriction warning */}
      {roundRestriction && isOwn && isTurnPhase && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/40 flex-shrink-0">
          <div className="flex items-center gap-2 text-red-400">
            <Ban className="w-4 h-4" />
            <span className="text-sm font-medium">ОГРАНИЧЕНИЕ</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            В этом раунде запрещено раскрывать: {' '}
            <span className="text-red-400 font-medium">
              {roundRestriction === 'biology' && 'Биологию'}
              {roundRestriction === 'hobby' && 'Хобби'}
              {roundRestriction === 'baggage' && 'Багаж'}
            </span>
          </p>
        </div>
      )}

      {/* Characteristics - optimized with less animation */}
      <div className="space-y-2 sm:space-y-3 overflow-y-auto flex-1 will-change-scroll scroll-touch">
        {CHARACTERISTICS_ORDER.map((key) => {
          const isRevealed = player.revealedCharacteristics.includes(key);
          const displayValue = getDisplayValue(key);
          const isRestricted = roundRestriction === key;
          const canReveal = isOwn && canRevealCharacteristic(player.id, key) && !isRestricted;
          const isAvailable = availableChars.includes(key) && !isRestricted;
          const isActionCard = key === 'actionCard1' || key === 'actionCard2';

          return (
            <div
              key={key}
              className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                isActionCard
                  ? isRevealed
                    ? 'border-red-500/50 bg-red-500/10'
                    : isAvailable && isMyTurn && !hasRevealed
                      ? 'border-red-400/50 bg-red-900/20'
                      : 'border-red-900/30 bg-red-950/20'
                  : isRevealed
                    ? 'border-primary/50 bg-primary/10'
                    : isAvailable && isMyTurn && !hasRevealed
                      ? 'border-secondary/50 bg-secondary/10'
                      : 'border-muted bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    {isActionCard ? (
                      <Zap className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                        isRevealed ? 'text-red-500' : 'text-red-400/60'
                      }`} />
                    ) : isRevealed ? (
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`font-display text-xs sm:text-sm truncate ${
                      isActionCard ? 'text-red-400' : 'text-muted-foreground'
                    }`}>
                      {CHARACTERISTIC_NAMES[key]}
                    </span>
                  </div>
                  {isRevealed || isOwn ? (
                    <button
                      onClick={() => handleCardClick(key)}
                      className={`text-sm sm:text-base font-medium text-left w-full truncate hover:text-primary transition-colors ${
                        isActionCard 
                          ? isRevealed ? 'text-red-300' : 'text-red-400/70'
                          : isRevealed ? 'text-foreground' : 'text-muted-foreground'
                      } ${isOwn ? 'cursor-pointer underline-offset-2 hover:underline' : ''}`}
                      title={isOwn ? 'Нажмите для подробностей' : undefined}
                    >
                      {displayValue}
                    </button>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">Скрыто</p>
                  )}
                </div>

                {isOwn && !isRevealed && (
                  <button
                    onClick={() => handleReveal(key)}
                    disabled={!canReveal || isRevealing}
                    className={`px-3 py-2 min-h-[36px] text-xs font-display uppercase tracking-wide rounded transition-colors flex-shrink-0 ${
                      canReveal && !isRevealing
                        ? isActionCard
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer animate-pulse'
                          : 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer animate-pulse' 
                        : isRestricted
                          ? 'bg-red-900/20 text-red-400 cursor-not-allowed'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {isRestricted
                      ? 'Запрещено'
                      : canReveal 
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
        
        {/* Extra Baggage from card 12 */}
        {player.extraBaggage && (
          <div className="p-3 sm:p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
              <span className="font-display text-xs sm:text-sm text-amber-400">
                Дополнительный багаж
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-amber-300">
              {player.extraBaggage}
            </p>
          </div>
        )}
        
        {/* Extra Profession from card 13 */}
        {player.extraProfession && (
          <div className="p-3 sm:p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
              <span className="font-display text-xs sm:text-sm text-amber-400">
                Дополнительная профессия
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-amber-300">
              {player.extraProfession}
            </p>
          </div>
        )}
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
          {isOwn && (
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
              <span>Нажмите на карту для подробностей</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        cardType={selectedCard?.type || null}
        cardValue={selectedCard ? getCardValue(selectedCard.type) : ''}
      />

      {/* Recovery Link Modal */}
      <RecoveryLinkModal
        isOpen={!!recoveryLink}
        onClose={() => setRecoveryLink(null)}
        recoveryLink={recoveryLink || ''}
      />
    </div>
  );
});

CharacterPanel.displayName = 'CharacterPanel';

export default CharacterPanel;