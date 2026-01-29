import { memo, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { Skull, CheckCircle, AlertTriangle, Vote, Trophy, Clock, Users, Shield, Ban, Zap } from 'lucide-react';

const VotingPanel = memo(() => {
  const { gameState, currentPlayer, castVote, processVotingResults, nextPhase } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false); // Debounce state

  // Memoize computed values
  const { alivePlayers, hasVoted, allVoted, isDefensePhase, isVotingPhase, isResultsPhase, canVote, hasDoubleVote, hasImmunity, immunePlayerId, blockedVoterId } = useMemo(() => {
    if (!gameState || !currentPlayer) {
      return { alivePlayers: [], hasVoted: false, allVoted: false, isDefensePhase: false, isVotingPhase: false, isResultsPhase: false, canVote: true, hasDoubleVote: false, hasImmunity: false, immunePlayerId: null, blockedVoterId: null };
    }
    const alive = gameState.players.filter(p => !p.isEliminated);
    
    // Check if current player cannot vote (from card 16)
    const blockedPlayer = gameState.cannotVotePlayerId;
    const cannotVote = blockedPlayer === currentPlayer.id;
    
    // Check if current player has double vote (from cards 1 or 15)
    const hasDouble = gameState.doubleVotePlayerId === currentPlayer.id;
    
    // Check for immunity
    const immune = gameState.immunityPlayerId;
    
    // Calculate allVoted: all players except the blocked one must have voted
    // (blocked player counts as already voted for this purpose)
    const allHaveVoted = alive.every(p => 
      p.hasVoted || p.id === blockedPlayer
    );
    
    return {
      alivePlayers: alive,
      hasVoted: currentPlayer.hasVoted,
      allVoted: allHaveVoted,
      isDefensePhase: gameState.phase === 'defense',
      isVotingPhase: gameState.phase === 'voting',
      isResultsPhase: gameState.phase === 'results',
      canVote: !cannotVote,
      hasDoubleVote: hasDouble,
      hasImmunity: !!immune,
      immunePlayerId: immune,
      blockedVoterId: blockedPlayer,
    };
  }, [gameState, currentPlayer]);

  // Get players available for voting (all or tied only in revote)
  // Filter out disconnected/eliminated players from tied list
  const votablePlayersIds = useMemo(() => {
    if (!gameState) return new Set<string>();
    if (gameState.isRevote && gameState.tiedPlayers.length > 0) {
      // Only include tied players who are still alive
      const aliveTiedPlayers = gameState.tiedPlayers.filter(id => 
        alivePlayers.some(p => p.id === id)
      );
      return new Set(aliveTiedPlayers);
    }
    return new Set(alivePlayers.map(p => p.id));
  }, [gameState, alivePlayers]);

  const handleVote = useCallback(async () => {
    if (isVoting) return; // Prevent double-clicks
    if (!canVote) return; // Cannot vote due to card effect
    if (selectedTarget && !hasVoted && currentPlayer) {
      // Cannot vote for immune player
      if (selectedTarget === immunePlayerId) return;
      
      setIsVoting(true);
      try {
        await castVote(currentPlayer.id, selectedTarget);
      } finally {
        setTimeout(() => setIsVoting(false), 1000);
      }
    }
  }, [selectedTarget, hasVoted, currentPlayer, castVote, isVoting, canVote, immunePlayerId]);

  // Memoize sorted players for results
  const sortedPlayers = useMemo(() => 
    [...alivePlayers].sort((a, b) => b.votesAgainst - a.votesAgainst),
    [alivePlayers]
  );

  const votingProgress = useMemo(() => {
    // Count blocked voter as already voted
    const voted = alivePlayers.filter(p => p.hasVoted || p.id === blockedVoterId).length;
    // Total excludes the blocked voter since they can't vote
    const totalVoters = blockedVoterId 
      ? alivePlayers.filter(p => p.id !== blockedVoterId).length 
      : alivePlayers.length;
    return {
      count: voted,
      total: alivePlayers.length, // Still show total for display
      percentage: totalVoters > 0 ? (voted / alivePlayers.length) * 100 : 0,
    };
  }, [alivePlayers, blockedVoterId]);

  // Get who voted for whom (for open voting display)
  const votesMap = useMemo(() => {
    if (!gameState) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    
    Object.entries(gameState.votes).forEach(([voterId, targetId]) => {
      const existing = map.get(targetId) || [];
      existing.push(voterId);
      map.set(targetId, existing);
    });
    
    return map;
  }, [gameState?.votes]);

  // Get player name by ID
  const getPlayerName = useCallback((playerId: string) => {
    return gameState?.players.find(p => p.id === playerId)?.name || 'Неизвестный';
  }, [gameState?.players]);

  if (!gameState || !currentPlayer) return null;

  // Defense phase - just show info
  if (isDefensePhase) {
    return (
      <div className="bunker-card mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
          <h3 className="font-display text-base sm:text-lg text-secondary">
            {gameState.isRevote ? 'ДОПОЛНИТЕЛЬНОЕ ОБСУЖДЕНИЕ' : 'ЗАЩИТНАЯ РЕЧЬ'}
          </h3>
        </div>
        
        {gameState.isRevote && gameState.tiedPlayers.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-3 text-warning">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">НИЧЬЯ! 3 минуты на обсуждение</span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base mb-3">
              Игроки набрали одинаковое количество голосов. Голосование продолжится только среди:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {gameState.tiedPlayers.map(playerId => (
                <span 
                  key={playerId}
                  className="px-3 py-1 bg-destructive/20 text-destructive rounded-full text-sm font-medium"
                >
                  {getPlayerName(playerId)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm sm:text-base">
            Каждый игрок может высказаться в свою защиту или обвинить других. 
            После этого начнётся голосование.
          </p>
        )}
        
        {currentPlayer.isHost && (
          <button onClick={nextPhase} className="bunker-button w-full mt-4">
            {gameState.isRevote ? 'Начать переголосование' : 'Начать голосование'}
          </button>
        )}
      </div>
    );
  }

  // Results phase - show voting results with who voted for whom
  if (isResultsPhase) {
    const eliminatedPlayer = sortedPlayers[0];
    
    // Check if there's a tie
    const maxVotes = eliminatedPlayer?.votesAgainst || 0;
    const tiedPlayers = sortedPlayers.filter(p => p.votesAgainst === maxVotes);
    const isTie = tiedPlayers.length > 1 && maxVotes > 0;
    
    return (
      <div className="bunker-card mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
          <h3 className="font-display text-base sm:text-lg text-destructive">
            РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ
          </h3>
        </div>
        
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          {sortedPlayers.map((player, index) => {
            const voters = votesMap.get(player.id) || [];
            const isTopVoted = index === 0 && player.votesAgainst > 0;
            const isTiedPlayer = isTie && player.votesAgainst === maxVotes;
            
            return (
              <div
                key={player.id}
                className={`p-3 sm:p-4 rounded-lg ${
                  isTiedPlayer
                    ? 'bg-warning/20 border-2 border-warning'
                    : isTopVoted
                    ? 'bg-destructive/20 border-2 border-destructive'
                    : 'bg-muted/30 border border-border'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-display text-base sm:text-lg">{index + 1}.</span>
                    <span className="font-medium text-sm sm:text-base">{player.name}</span>
                    {isTopVoted && !isTie && (
                      <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                    )}
                    {isTiedPlayer && (
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                    )}
                  </div>
                  <span className={`font-display text-base sm:text-lg ${
                    isTiedPlayer ? 'text-warning' : isTopVoted ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {player.votesAgainst}
                  </span>
                </div>
                
                {/* Show who voted for this player - OPEN VOTING */}
                {voters.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Голосовали: </span>
                    <span className="text-xs text-foreground">
                      {voters.map(voterId => getPlayerName(voterId)).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tie notification */}
        {isTie && (
          <div className="p-3 mb-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-display">НИЧЬЯ!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {gameState.isRevote ? (
                // Second tie - both will be eliminated
                <>
                  Повторная ничья! Все игроки с одинаковым числом голосов будут изгнаны:{' '}
                  <span className="text-destructive font-medium">
                    {tiedPlayers.map(p => p.name).join(' и ')}
                  </span>
                </>
              ) : (
                // First tie - will have revote
                <>
                  Будет дано 3 минуты на дополнительное обсуждение, после чего переголосование среди:{' '}
                  <span className="text-foreground font-medium">
                    {tiedPlayers.map(p => p.name).join(' и ')}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {currentPlayer.isHost && eliminatedPlayer && eliminatedPlayer.votesAgainst > 0 && (
          <div className="text-center">
            {isTie ? (
              gameState.isRevote ? (
                // Second tie - eliminate all
                <>
                  <p className="text-destructive font-display mb-4 text-sm sm:text-base">
                    {tiedPlayers.map(p => p.name).join(' и ')} изгоняются из бункера!
                  </p>
                  <button onClick={processVotingResults} className="bunker-button-danger">
                    Изгнать всех и продолжить
                  </button>
                </>
              ) : (
                // First tie - start revote
                <button onClick={processVotingResults} className="bunker-button w-full">
                  Начать переголосование
                </button>
              )
            ) : (
              <>
                <p className="text-destructive font-display mb-4 text-sm sm:text-base">
                  {eliminatedPlayer.name} изгоняется из бункера!
                  {/* Show linked fate notification */}
                  {gameState.linkedByPlayerId === eliminatedPlayer.id && gameState.linkedPlayerId && (
                    <span className="block mt-2 text-warning">
                      Связанные судьбы: {getPlayerName(gameState.linkedPlayerId)} тоже покидает игру!
                    </span>
                  )}
                </p>
                <button onClick={processVotingResults} className="bunker-button-danger">
                  Изгнать и продолжить
                </button>
              </>
            )}
          </div>
        )}
        
        {currentPlayer.isHost && (!eliminatedPlayer || eliminatedPlayer.votesAgainst === 0) && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">Никто не получил голосов</p>
            <button onClick={processVotingResults} className="bunker-button">
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
        <h3 className="font-display text-base sm:text-lg text-destructive">
          {gameState.isRevote ? 'ПЕРЕГОЛОСОВАНИЕ' : 'ГОЛОСОВАНИЕ'}
        </h3>
      </div>

      {/* Revote info */}
      {gameState.isRevote && gameState.tiedPlayers.length > 0 && (
        <div className="p-3 mb-4 rounded-lg bg-warning/10 border border-warning/30">
          <p className="text-sm text-muted-foreground">
            Голосование только среди игроков с ничьей:{' '}
            <span className="text-foreground font-medium">
              {gameState.tiedPlayers.map(id => getPlayerName(id)).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Cannot vote indicator */}
      {!canVote && !currentPlayer.isEliminated && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/40">
          <div className="flex items-center gap-2 text-red-400">
            <Ban className="w-4 h-4" />
            <span className="text-sm font-medium">ВАШ ГОЛОС ЗАБЛОКИРОВАН</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Карта действия лишила вас голоса в этом раунде</p>
        </div>
      )}
      
      {/* Double vote indicator */}
      {hasDoubleVote && !hasVoted && canVote && (
        <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-700/40">
          <div className="flex items-center gap-2 text-amber-400">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">ДВОЙНОЙ ГОЛОС</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ваш голос будет считаться за два!</p>
        </div>
      )}
      
      {/* Immunity indicator */}
      {hasImmunity && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/40">
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">ЗАЩИТА АКТИВНА</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {gameState?.players.find(p => p.id === immunePlayerId)?.name} защищён от изгнания в этом раунде
          </p>
        </div>
      )}

      {currentPlayer.isEliminated ? (
        <p className="text-muted-foreground text-center py-4 text-sm sm:text-base">
          Вы изгнаны и не можете голосовать
        </p>
      ) : !canVote ? (
        <div className="text-center py-4">
          <Ban className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-display text-sm sm:text-base">ВЫ НЕ МОЖЕТЕ ГОЛОСОВАТЬ</p>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2">
            Ожидаем голоса остальных игроков ({votingProgress.count}/{votingProgress.total})
          </p>
        </div>
      ) : hasVoted ? (
        <div className="text-center py-4">
          <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-success mx-auto mb-3" />
          <p className="text-success font-display text-sm sm:text-base">ВЫ ПРОГОЛОСОВАЛИ</p>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2">
            Ожидаем голоса остальных игроков ({votingProgress.count}/{votingProgress.total})
          </p>
          
          {/* Show current votes - open voting */}
          {Object.keys(gameState.votes).length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 text-left">
              <p className="text-xs text-muted-foreground mb-2">Уже проголосовали:</p>
              <div className="space-y-1">
                {Object.entries(gameState.votes).map(([voterId, targetId]) => (
                  <p key={voterId} className="text-xs">
                    <span className="text-foreground">{getPlayerName(voterId)}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="text-destructive">{getPlayerName(targetId)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
            {gameState.isRevote 
              ? 'Выберите игрока из ничьей для голосования.'
              : 'Выберите игрока для голосования.'}
          </p>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-4">
            {alivePlayers
              .filter(p => p.id !== currentPlayer.id)
              .map((player) => {
                const canVoteFor = votablePlayersIds.has(player.id);
                const isImmune = player.id === immunePlayerId;
                const isDisabled = !canVoteFor || isImmune;
                return (
                  <button
                    key={player.id}
                    onClick={() => !isDisabled && setSelectedTarget(player.id)}
                    disabled={isDisabled}
                    className={`vote-button text-xs sm:text-sm py-2 sm:py-3 relative ${
                      selectedTarget === player.id ? 'selected' : ''
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {player.name}
                    {isImmune && (
                      <Shield className="absolute top-1 right-1 w-3 h-3 text-emerald-400" />
                    )}
                  </button>
                );
              })}
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedTarget || isVoting}
            className={`bunker-button-danger w-full ${!selectedTarget || isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isVoting ? 'ГОЛОСУЕМ...' : 'ПРОГОЛОСОВАТЬ'}
          </button>
          
          {/* Show current votes - open voting */}
          {Object.keys(gameState.votes).length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Уже проголосовали:</p>
              <div className="space-y-1">
                {Object.entries(gameState.votes).map(([voterId, targetId]) => (
                  <p key={voterId} className="text-xs">
                    <span className="text-foreground">{getPlayerName(voterId)}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="text-destructive">{getPlayerName(targetId)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
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

      {/* Auto-show results notification when all voted */}
      {allVoted && isVotingPhase && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            <span className="font-display text-secondary text-sm sm:text-base">ВСЕ ПРОГОЛОСОВАЛИ</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Результаты появятся через 2 секунды...</p>
        </div>
      )}
    </div>
  );
});

VotingPanel.displayName = 'VotingPanel';

export default VotingPanel;