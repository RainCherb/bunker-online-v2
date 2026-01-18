import { memo, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { Skull, CheckCircle, AlertTriangle, Vote, Trophy } from 'lucide-react';

const VotingPanel = memo(() => {
  const { gameState, currentPlayer, castVote, processVotingResults, nextPhase } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Memoize computed values
  const { alivePlayers, hasVoted, allVoted, isDefensePhase, isVotingPhase, isResultsPhase } = useMemo(() => {
    if (!gameState || !currentPlayer) {
      return { alivePlayers: [], hasVoted: false, allVoted: false, isDefensePhase: false, isVotingPhase: false, isResultsPhase: false };
    }
    const alive = gameState.players.filter(p => !p.isEliminated);
    return {
      alivePlayers: alive,
      hasVoted: currentPlayer.hasVoted,
      allVoted: alive.every(p => p.hasVoted),
      isDefensePhase: gameState.phase === 'defense',
      isVotingPhase: gameState.phase === 'voting',
      isResultsPhase: gameState.phase === 'results',
    };
  }, [gameState, currentPlayer]);

  const handleVote = useCallback(() => {
    if (selectedTarget && !hasVoted && currentPlayer) {
      castVote(currentPlayer.id, selectedTarget);
    }
  }, [selectedTarget, hasVoted, currentPlayer, castVote]);

  // Memoize sorted players for results
  const sortedPlayers = useMemo(() => 
    [...alivePlayers].sort((a, b) => b.votesAgainst - a.votesAgainst),
    [alivePlayers]
  );

  const votingProgress = useMemo(() => {
    const voted = alivePlayers.filter(p => p.hasVoted).length;
    return {
      count: voted,
      total: alivePlayers.length,
      percentage: alivePlayers.length > 0 ? (voted / alivePlayers.length) * 100 : 0,
    };
  }, [alivePlayers]);

  if (!gameState || !currentPlayer) return null;

  // Defense phase - just show info
  if (isDefensePhase) {
    return (
      <div className="bunker-card mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
          <h3 className="font-display text-base sm:text-lg text-secondary">ЗАЩИТНАЯ РЕЧЬ</h3>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Каждый игрок может высказаться в свою защиту или обвинить других. 
          После этого начнётся голосование.
        </p>
        {currentPlayer.isHost && (
          <button onClick={nextPhase} className="bunker-button w-full mt-4">
            Начать голосование
          </button>
        )}
      </div>
    );
  }

  // Results phase - show voting results
  if (isResultsPhase) {
    const eliminatedPlayer = sortedPlayers[0];
    
    return (
      <div className="bunker-card mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
          <h3 className="font-display text-base sm:text-lg text-destructive">РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ</h3>
        </div>
        
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`p-3 sm:p-4 rounded-lg flex justify-between items-center ${
                index === 0 && player.votesAgainst > 0
                  ? 'bg-destructive/20 border-2 border-destructive'
                  : 'bg-muted/30 border border-border'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-display text-base sm:text-lg">{index + 1}.</span>
                <span className="font-medium text-sm sm:text-base">{player.name}</span>
                {index === 0 && player.votesAgainst > 0 && (
                  <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                )}
              </div>
              <span className={`font-display text-base sm:text-lg ${
                index === 0 && player.votesAgainst > 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {player.votesAgainst}
              </span>
            </div>
          ))}
        </div>

        {currentPlayer.isHost && eliminatedPlayer && eliminatedPlayer.votesAgainst > 0 && (
          <div className="text-center">
            <p className="text-destructive font-display mb-4 text-sm sm:text-base">
              {eliminatedPlayer.name} изгоняется из бункера!
            </p>
            <button onClick={processVotingResults} className="bunker-button-danger">
              Изгнать и продолжить
            </button>
          </div>
        )}
        
        {currentPlayer.isHost && (!eliminatedPlayer || eliminatedPlayer.votesAgainst === 0) && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">Никто не получил голосов</p>
            <button onClick={nextPhase} className="bunker-button">
              Следующий раунд
            </button>
          </div>
        )}
      </div>
    );
  }

  // Voting phase
  return (
    <div className="bunker-card mb-4 sm:mb-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <Skull className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
        <h3 className="font-display text-base sm:text-lg text-destructive">ГОЛОСОВАНИЕ</h3>
      </div>

      {currentPlayer.isEliminated ? (
        <p className="text-muted-foreground text-center py-4 text-sm sm:text-base">
          Вы изгнаны и не можете голосовать
        </p>
      ) : hasVoted ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-success mx-auto mb-3" />
          <p className="text-success font-display text-sm sm:text-base">ВЫ ПРОГОЛОСОВАЛИ</p>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2">
            Ожидаем голоса остальных игроков ({votingProgress.count}/{votingProgress.total})
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
            Выберите игрока для голосования.
          </p>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-4">
            {alivePlayers
              .filter(p => p.id !== currentPlayer.id)
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedTarget(player.id)}
                  className={`vote-button text-xs sm:text-sm py-2 sm:py-3 ${selectedTarget === player.id ? 'selected' : ''}`}
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
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
            <span>Проголосовало:</span>
            <span>{votingProgress.count} / {votingProgress.total}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${votingProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Host controls after all votes */}
      {currentPlayer.isHost && allVoted && isVotingPhase && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            <span className="font-display text-secondary text-sm sm:text-base">ВСЕ ПРОГОЛОСОВАЛИ</span>
          </div>
          <button onClick={nextPhase} className="bunker-button w-full">
            Показать результаты
          </button>
        </div>
      )}
    </div>
  );
});

VotingPanel.displayName = 'VotingPanel';

export default VotingPanel;