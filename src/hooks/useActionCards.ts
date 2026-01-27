import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActionCard, PendingAction, Player, GameState } from '@/types/game';
import { getActionCardById, ACTION_CARDS } from '@/data/gameData';

interface UseActionCardsProps {
  gameState: GameState | null;
  currentPlayer: Player | null;
}

export function useActionCards({ gameState, currentPlayer }: UseActionCardsProps) {
  // Get player's action cards (resolved from IDs)
  const getPlayerActionCards = useCallback((): { card1: ActionCard | null; card2: ActionCard | null } => {
    if (!currentPlayer) return { card1: null, card2: null };
    
    const card1 = getActionCardById(currentPlayer.characteristics.actionCard1);
    const card2 = getActionCardById(currentPlayer.characteristics.actionCard2);
    
    return { card1: card1 || null, card2: card2 || null };
  }, [currentPlayer]);

  // Check if a card slot has been used
  const isCardUsed = useCallback((cardSlot: 'actionCard1' | 'actionCard2'): boolean => {
    if (!currentPlayer) return true;
    return currentPlayer.usedActionCards?.includes(cardSlot) ?? false;
  }, [currentPlayer]);

  // Check if card can be activated (not during voting, no pending action)
  const canActivateCard = useCallback((cardSlot: 'actionCard1' | 'actionCard2'): boolean => {
    if (!gameState || !currentPlayer) return false;
    
    // Can't use during voting phase
    if (gameState.phase === 'voting') return false;
    
    // Can't use if another action is pending
    if (gameState.pendingAction) return false;
    
    // Can't use if already used
    if (isCardUsed(cardSlot)) return false;
    
    // Can't use if eliminated
    if (currentPlayer.isEliminated) return false;
    
    // Get the card and check special conditions
    const cardId = cardSlot === 'actionCard1' 
      ? currentPlayer.characteristics.actionCard1 
      : currentPlayer.characteristics.actionCard2;
    const card = getActionCardById(cardId);
    
    if (!card) return false;
    
    // Card 25 (force_revote) can only be used after results phase
    if (card.onlyAfterResults && gameState.phase !== 'results') {
      return false;
    }
    
    // Cancel cards (21, 22) can only be used when there's a pending action
    // They are handled separately via canCancelPendingAction
    if (card.isCancelCard) {
      return false;
    }
    
    return true;
  }, [gameState, currentPlayer, isCardUsed]);

  // Check if player can cancel the current pending action
  const canCancelPendingAction = useCallback((): { canCancel: boolean; cardSlot: 'actionCard1' | 'actionCard2' | null } => {
    if (!gameState?.pendingAction || !currentPlayer) {
      return { canCancel: false, cardSlot: null };
    }
    
    // Can't cancel your own card
    if (gameState.pendingAction.playerId === currentPlayer.id) {
      return { canCancel: false, cardSlot: null };
    }
    
    // Check if player has an unused cancel card
    const card1Id = currentPlayer.characteristics.actionCard1;
    const card2Id = currentPlayer.characteristics.actionCard2;
    const card1 = getActionCardById(card1Id);
    const card2 = getActionCardById(card2Id);
    
    if (card1?.isCancelCard && !isCardUsed('actionCard1')) {
      return { canCancel: true, cardSlot: 'actionCard1' };
    }
    
    if (card2?.isCancelCard && !isCardUsed('actionCard2')) {
      return { canCancel: true, cardSlot: 'actionCard2' };
    }
    
    return { canCancel: false, cardSlot: null };
  }, [gameState, currentPlayer, isCardUsed]);

  // Activate an action card
  const activateCard = useCallback(async (cardSlot: 'actionCard1' | 'actionCard2'): Promise<boolean> => {
    if (!gameState || !currentPlayer) return false;
    
    const cardId = cardSlot === 'actionCard1' 
      ? currentPlayer.characteristics.actionCard1 
      : currentPlayer.characteristics.actionCard2;
    const card = getActionCardById(cardId);
    
    if (!card) {
      if (import.meta.env.DEV) console.error('[ActionCards] Card not found:', cardId);
      return false;
    }
    
    if (import.meta.env.DEV) console.log('[ActionCards] Activating card:', card.name);
    
    const { data, error } = await supabase.rpc('activate_action_card', {
      p_game_id: gameState.id,
      p_player_id: currentPlayer.id,
      p_card_slot: cardSlot,
      p_card_id: card.id,
      p_card_name: card.name,
      p_card_description: card.description,
      p_effect: card.effect,
      p_requires_target: card.requiresTarget,
      p_target_type: card.targetType,
    });
    
    if (error) {
      if (import.meta.env.DEV) console.error('[ActionCards] Error activating card:', error);
      return false;
    }
    
    const result = data as { success: boolean; error?: string; expiresAt?: string };
    if (!result.success) {
      if (import.meta.env.DEV) console.error('[ActionCards] Activation failed:', result.error);
      return false;
    }
    
    if (import.meta.env.DEV) console.log('[ActionCards] Card activated, expires at:', result.expiresAt);
    return true;
  }, [gameState, currentPlayer]);

  // Cancel a pending action using a cancel card
  const cancelPendingAction = useCallback(async (): Promise<boolean> => {
    if (!gameState || !currentPlayer) return false;
    
    const { canCancel, cardSlot } = canCancelPendingAction();
    if (!canCancel || !cardSlot) {
      if (import.meta.env.DEV) console.error('[ActionCards] Cannot cancel - no valid cancel card');
      return false;
    }
    
    if (import.meta.env.DEV) console.log('[ActionCards] Cancelling pending action with card:', cardSlot);
    
    const { data, error } = await supabase.rpc('cancel_action_card', {
      p_game_id: gameState.id,
      p_canceller_id: currentPlayer.id,
      p_cancel_card_slot: cardSlot,
    });
    
    if (error) {
      if (import.meta.env.DEV) console.error('[ActionCards] Error cancelling action:', error);
      return false;
    }
    
    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      if (import.meta.env.DEV) console.error('[ActionCards] Cancel failed:', result.error);
      return false;
    }
    
    if (import.meta.env.DEV) console.log('[ActionCards] Action cancelled successfully');
    return true;
  }, [gameState, currentPlayer, canCancelPendingAction]);

  // Apply the pending action (after cancel window expires)
  const applyPendingAction = useCallback(async (targetId?: string): Promise<boolean> => {
    if (!gameState) return false;
    
    if (import.meta.env.DEV) console.log('[ActionCards] Applying pending action, target:', targetId);
    
    const { data, error } = await supabase.rpc('apply_action_card', {
      p_game_id: gameState.id,
      p_target_id: targetId || null,
    });
    
    if (error) {
      if (import.meta.env.DEV) console.error('[ActionCards] Error applying action:', error);
      return false;
    }
    
    const result = data as { success: boolean; error?: string; effect?: string; cancelled?: boolean };
    if (!result.success) {
      if (import.meta.env.DEV) console.error('[ActionCards] Apply failed:', result.error);
      return false;
    }
    
    if (result.cancelled) {
      if (import.meta.env.DEV) console.log('[ActionCards] Action was cancelled');
    } else {
      if (import.meta.env.DEV) console.log('[ActionCards] Action applied:', result.effect);
    }
    
    return true;
  }, [gameState]);

  // Get valid targets for a card that requires target selection
  const getValidTargets = useCallback((targetType: string): Player[] => {
    if (!gameState || !currentPlayer) return [];
    
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    
    switch (targetType) {
      case 'none':
        return [];
      
      case 'other':
        // Any player except self
        return alivePlayers.filter(p => p.id !== currentPlayer.id);
      
      case 'any':
        // Any player including self
        return alivePlayers;
      
      case 'eliminated':
        // Only eliminated players (except self)
        return gameState.players.filter(p => p.isEliminated && p.id !== currentPlayer.id);
      
      case 'has_closed_biology':
        // Players with unrevealed biology (except self)
        return alivePlayers.filter(p => 
          p.id !== currentPlayer.id && 
          !p.revealedCharacteristics.includes('biology')
        );
      
      default:
        return [];
    }
  }, [gameState, currentPlayer]);

  // Check if current player is the one who activated the pending action
  const isMyPendingAction = useCallback((): boolean => {
    if (!gameState?.pendingAction || !currentPlayer) return false;
    return gameState.pendingAction.playerId === currentPlayer.id;
  }, [gameState, currentPlayer]);

  // Get time remaining in cancel window (in seconds)
  const getCancelTimeRemaining = useCallback((): number => {
    if (!gameState?.pendingAction) return 0;
    
    const expiresAt = new Date(gameState.pendingAction.expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    
    return remaining;
  }, [gameState]);

  return {
    getPlayerActionCards,
    isCardUsed,
    canActivateCard,
    canCancelPendingAction,
    activateCard,
    cancelPendingAction,
    applyPendingAction,
    getValidTargets,
    isMyPendingAction,
    getCancelTimeRemaining,
  };
}
