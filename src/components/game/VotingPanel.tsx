import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { Skull, CheckCircle, AlertTriangle, Vote, Trophy } from 'lucide-react';
import { useState } from 'react';

const VotingPanel = () => {
  const { gameState, currentPlayer, castVote, processVotingResults, nextPhase } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  if (!gameState || !currentPlayer) return null;

  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  const hasVoted = currentPlayer.hasVoted;
  const allVoted = alivePlayers.every(p => p.hasVoted);
  const isDefensePhase = gameState.phase === 'defense';
  const isVotingPhase = gameState.phase === 'voting';
  const isResultsPhase = gameState.phase === 'results';

  const handleVote = () => {
    if (selectedTarget && !hasVoted) {
      castVote(currentPlayer.id, selectedTarget);
    }
  };

  // Get eliminated player for farewell phase context
  const getEliminatedPlayer = () => {
    const maxVotes = Math.max(...alivePlayers.map(p => p.votesAgainst));
    return alivePlayers.find(p => p.votesAgainst === maxVotes);
  };

  // Defense phase - just show info
  if (isDefensePhase) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bunker-card mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Vote className="w-6 h-6 text-secondary" />
          <h3 className="font-display text-lg text-secondary">ЗАЩИТНАЯ РЕЧЬ</h3>
        </div>
        <p className="text-muted-foreground">
          Каждый игрок может высказаться в свою защиту или обвинить других. 
          После этого начнётся голосование.
        </p>
        {currentPlayer.isHost && (
          <button onClick={nextPhase} className="bunker-button w-full mt-4">
            Начать голосование
          </button>
        )}
      </motion.div>
    );
  }

  // Results phase - show voting results
  if (isResultsPhase) {
    const sortedPlayers = [...alivePlayers].sort((a, b) => b.votesAgainst - a.votesAgainst);
    const eliminatedPlayer = sortedPlayers[0];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bunker-card mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-destructive" />
          <h3 className="font-display text-lg text-destructive">РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ</h3>
        </div>
        
        <div className="space-y-3 mb-6">
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg flex justify-between items-center ${
                index === 0 && player.votesAgainst > 0
                  ? 'bg-destructive/20 border-2 border-destructive'
                  : 'bg-muted/30 border border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-lg">{index + 1}.</span>
                <span className="font-medium">{player.name}</span>
                {index === 0 && player.votesAgainst > 0 && (
                  <Skull className="w-5 h-5 text-destructive" />
                )}
              </div>
              <span className={`font-display text-lg ${
                index === 0 && player.votesAgainst > 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {player.votesAgainst} голос(ов)
              </span>
            </motion.div>
          ))}
        </div>

        {currentPlayer.isHost && eliminatedPlayer && eliminatedPlayer.votesAgainst > 0 && (
          <div className="text-center">
            <p className="text-destructive font-display mb-4">
              {eliminatedPlayer.name} изгоняется из бункера!
            </p>
            <button onClick={processVotingResults} className="bunker-button-danger">
              Изгнать и продолжить
            </button>
          </div>
        )}
        
        {currentPlayer.isHost && (!eliminatedPlayer || eliminatedPlayer.votesAgainst === 0) && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Никто не получил голосов</p>
            <button onClick={nextPhase} className="bunker-button">
              Следующий раунд
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Voting phase
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

      {currentPlayer.isEliminated ? (
        <p className="text-muted-foreground text-center py-4">
          Вы изгнаны и не можете голосовать
        </p>
      ) : hasVoted ? (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-success font-display">ВЫ ПРОГОЛОСОВАЛИ</p>
          <p className="text-muted-foreground text-sm mt-2">
            Ожидаем голоса остальных игроков ({alivePlayers.filter(p => p.hasVoted).length}/{alivePlayers.length})
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-4">
            Выберите игрока для голосования. Тот, кто наберёт больше всего голосов, покинет бункер.
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

      {/* Show voting progress */}
      {isVotingPhase && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Проголосовало:</span>
            <span>{alivePlayers.filter(p => p.hasVoted).length} / {alivePlayers.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(alivePlayers.filter(p => p.hasVoted).length / alivePlayers.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Host controls after all votes */}
      {currentPlayer.isHost && allVoted && isVotingPhase && (
        <div className="mt-6 p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-secondary" />
            <span className="font-display text-secondary">ВСЕ ПРОГОЛОСОВАЛИ</span>
          </div>
          <button onClick={nextPhase} className="bunker-button w-full">
            Показать результаты
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default VotingPanel;
