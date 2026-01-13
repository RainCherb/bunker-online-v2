import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { Skull, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const VotingPanel = () => {
  const { gameState, currentPlayer, castVote, eliminatePlayer, nextPhase } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  if (!gameState || !currentPlayer) return null;

  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  const hasVoted = currentPlayer.hasVoted;
  const allVoted = alivePlayers.every(p => p.hasVoted);

  const handleVote = () => {
    if (selectedTarget && !hasVoted) {
      castVote(currentPlayer.id, selectedTarget);
    }
  };

  const handleConfirmElimination = () => {
    // Find player with most votes
    const maxVotes = Math.max(...alivePlayers.map(p => p.votesAgainst));
    const toEliminate = alivePlayers.find(p => p.votesAgainst === maxVotes);
    if (toEliminate && maxVotes > 0) {
      eliminatePlayer(toEliminate.id);
      nextPhase();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bunker-card mb-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Skull className="w-6 h-6 text-destructive" />
        <h3 className="font-display text-lg text-destructive">ГОЛОСОВАНИЕ</h3>
      </div>

      {hasVoted ? (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-success font-display">ВЫ ПРОГОЛОСОВАЛИ</p>
          <p className="text-muted-foreground text-sm mt-2">
            Ожидаем голоса остальных игроков...
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-4">
            Выберите игрока для голосования. Тот, кто наберёт больше всего голосов, покинет лагерь.
          </p>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {alivePlayers
              .filter(p => p.id !== currentPlayer.id)
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedTarget(player.id)}
                  className={`vote-button ${selectedTarget === player.id ? 'selected' : ''}`}
                >
                  {player.name}
                </button>
              ))}
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedTarget}
            className={`bunker-button-danger w-full ${!selectedTarget ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ПРОГОЛОСОВАТЬ
          </button>
        </>
      )}

      {/* Host controls after all votes */}
      {currentPlayer.isHost && allVoted && (
        <div className="mt-6 p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-secondary" />
            <span className="font-display text-secondary">РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ</span>
          </div>
          
          <div className="space-y-2 mb-4">
            {alivePlayers
              .filter(p => p.votesAgainst > 0)
              .sort((a, b) => b.votesAgainst - a.votesAgainst)
              .map(player => (
                <div key={player.id} className="flex justify-between items-center">
                  <span>{player.name}</span>
                  <span className="font-display text-destructive">{player.votesAgainst} голос(ов)</span>
                </div>
              ))}
          </div>

          <button
            onClick={handleConfirmElimination}
            className="bunker-button-danger w-full"
          >
            ИЗГНАТЬ ИГРОКА
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default VotingPanel;
