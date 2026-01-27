import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { X, Eye, EyeOff, Crown, Skull, UserPlus, Copy, Check, Zap } from 'lucide-react';
import { Player, CHARACTERISTIC_NAMES, CHARACTERISTICS_ORDER } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import { getActionCardById } from '@/data/gameData';

interface PlayerDetailModalProps {
  player: Player | null;
  onClose: () => void;
}

const PlayerDetailModal = ({ player, onClose }: PlayerDetailModalProps) => {
  const { currentPlayer, gameState } = useGame();
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateRecoveryLink = useCallback(() => {
    if (!gameState || !player) return;
    const token = btoa(`${gameState.id}|${player.id}`);
    const link = `${window.location.origin}/recover/${token}`;
    setRecoveryLink(link);
  }, [gameState, player]);

  const handleCopyLink = async () => {
    if (!recoveryLink) return;
    try {
      await navigator.clipboard.writeText(recoveryLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  if (!player) return null;
  
  const isHost = currentPlayer?.isHost;
  const isViewingOther = player.id !== currentPlayer?.id;

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
              const rawValue = player.characteristics[key];
              const isActionCard = key === 'actionCard1' || key === 'actionCard2';
              
              // For action cards, resolve the ID to name + description
              let displayValue = rawValue;
              if (isActionCard && rawValue) {
                const card = getActionCardById(rawValue);
                if (card) {
                  displayValue = `${card.name}\n${card.description}`;
                }
              }
              
              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    isActionCard
                      ? isRevealed
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-red-500/5 border-red-500/20'
                      : isRevealed 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isActionCard && <Zap className="w-3 h-3 text-red-500" />}
                        <span className={`text-xs font-display uppercase ${
                          isActionCard ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {CHARACTERISTIC_NAMES[key]}
                        </span>
                        {isRevealed ? (
                          <Eye className={`w-3 h-3 ${isActionCard ? 'text-red-500' : 'text-primary'}`} />
                        ) : (
                          <EyeOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      {isRevealed ? (
                        <p className="text-sm text-foreground whitespace-pre-line">{displayValue}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Не раскрыто</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recovery section for host */}
          {isHost && isViewingOther && (
            <div className="px-4 pb-2">
              {!recoveryLink ? (
                <button
                  onClick={handleGenerateRecoveryLink}
                  className="w-full px-4 py-3 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2 font-display text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Восстановить игрока
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Отправьте ссылку игроку для восстановления:
                  </p>
                  <div className="p-2 rounded bg-muted/50 text-xs break-all font-mono">
                    {recoveryLink}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full px-4 py-2 rounded-lg font-display text-sm flex items-center justify-center gap-2 transition-colors ${
                      copied
                        ? 'bg-green-500/20 border border-green-500 text-green-500'
                        : 'bg-secondary/20 border border-secondary text-secondary hover:bg-secondary/30'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
              )}
            </div>
          )}

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
