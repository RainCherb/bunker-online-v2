import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ActionCard } from '@/types/game';
import { ACTION_CARDS } from '@/data/gameData';
import { Zap, Lock, Check, Skull, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

interface ActionCardsPanelProps {
  actionCardIds: string[];
  usedCardIds: string[];
  canActivate: boolean;
  isVotingPhase: boolean;
  onActivateCard: (cardId: string) => void;
}

const ActionCardsPanel = ({
  actionCardIds,
  usedCardIds,
  canActivate,
  isVotingPhase,
  onActivateCard,
}: ActionCardsPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  // Get full card data
  const cards: (ActionCard | undefined)[] = actionCardIds.map(id => 
    ACTION_CARDS.find(c => c.id === id)
  );

  const toggleCardReveal = (cardId: string) => {
    setRevealedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleActivate = (card: ActionCard) => {
    if (!canActivate) return;
    if (usedCardIds.includes(card.id)) return;
    if (isVotingPhase) return;
    if (card.isCancelCard) return; // Cancel cards can only be used reactively
    
    onActivateCard(card.id);
  };

  const getCardStatus = (card: ActionCard): 'available' | 'used' | 'locked' | 'cancel' => {
    if (usedCardIds.includes(card.id)) return 'used';
    if (card.isCancelCard) return 'cancel';
    if (isVotingPhase || !canActivate) return 'locked';
    return 'available';
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Toggle button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-t-xl bg-gray-900/90 border border-b-0 border-red-900/40 text-gray-300 backdrop-blur-sm"
          whileTap={{ scale: 0.98 }}
        >
          <Zap className="w-4 h-4 text-red-500" />
          <span className="font-display text-sm uppercase tracking-wider">
            Карты действий ({cards.filter(c => c && !usedCardIds.includes(c.id)).length}/{cards.length})
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </motion.button>

        {/* Cards panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-gray-900/95 border border-t-0 border-red-900/40 rounded-b-xl backdrop-blur-sm"
            >
              <div className="p-3 space-y-2">
                {/* Voting phase warning */}
                {isVotingPhase && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-400 text-xs"
                  >
                    <Lock className="w-3 h-3" />
                    Карты действий заблокированы во время голосования
                  </motion.div>
                )}

                {/* Cards list */}
                {cards.map((card, index) => {
                  if (!card) return null;
                  
                  const status = getCardStatus(card);
                  const isRevealed = revealedCards.has(card.id);
                  
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        relative rounded-lg border overflow-hidden
                        ${status === 'used' 
                          ? 'bg-gray-800/50 border-gray-700/50' 
                          : status === 'cancel'
                          ? 'bg-purple-950/30 border-purple-800/50'
                          : status === 'locked'
                          ? 'bg-gray-800/70 border-gray-600/50'
                          : 'bg-gradient-to-r from-red-950/40 to-gray-900/40 border-red-800/50'
                        }
                      `}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-2 p-3">
                        {/* Status icon */}
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center
                          ${status === 'used'
                            ? 'bg-gray-700/50'
                            : status === 'cancel'
                            ? 'bg-purple-900/50'
                            : status === 'locked'
                            ? 'bg-gray-700/50'
                            : 'bg-red-900/50'
                          }
                        `}>
                          {status === 'used' ? (
                            <Check className="w-4 h-4 text-gray-500" />
                          ) : status === 'cancel' ? (
                            <Skull className="w-4 h-4 text-purple-400" />
                          ) : status === 'locked' ? (
                            <Lock className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Zap className="w-4 h-4 text-red-400" />
                          )}
                        </div>

                        {/* Card info */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`
                            font-display text-sm truncate
                            ${status === 'used' 
                              ? 'text-gray-500 line-through' 
                              : status === 'cancel'
                              ? 'text-purple-400'
                              : 'text-gray-200'
                            }
                          `}>
                            {card.name}
                          </h4>
                          {status === 'cancel' && (
                            <p className="text-xs text-purple-400/70">
                              Активируется автоматически
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {/* Reveal/Hide button */}
                          <button
                            onClick={() => toggleCardReveal(card.id)}
                            className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            {isRevealed ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          {/* Activate button */}
                          {status === 'available' && (
                            <motion.button
                              onClick={() => handleActivate(card)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-2 rounded-lg bg-red-900/70 border border-red-700/50 text-red-200 text-xs font-display uppercase tracking-wider hover:bg-red-800/70 transition-colors"
                            >
                              Активировать
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {/* Card description (revealed) */}
                      <AnimatePresence>
                        {isRevealed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`
                              px-3 pb-3 pt-0 text-sm
                              ${status === 'used' ? 'text-gray-500' : 'text-gray-400'}
                            `}>
                              <div className="pt-2 border-t border-gray-700/50">
                                {card.description}
                              </div>
                              
                              {/* Target type indicator */}
                              {card.requiresTarget && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-amber-500/70">
                                  <span>⚡</span>
                                  <span>
                                    Требует выбор цели: {' '}
                                    {card.targetType === 'other' && 'другой игрок'}
                                    {card.targetType === 'any' && 'любой игрок'}
                                    {card.targetType === 'eliminated' && 'выбывший игрок'}
                                    {card.targetType === 'has_closed_biology' && 'игрок с закрытой биологией'}
                                  </span>
                                </div>
                              )}

                              {/* Special indicators */}
                              {card.onlyAfterResults && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-blue-400/70">
                                  <span>📊</span>
                                  <span>Можно использовать только после результатов голосования</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Used overlay */}
                      {status === 'used' && (
                        <div className="absolute inset-0 bg-gray-900/40 pointer-events-none" />
                      )}
                    </motion.div>
                  );
                })}

                {/* Empty state */}
                {cards.filter(Boolean).length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    У вас нет карт действий
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ActionCardsPanel;
