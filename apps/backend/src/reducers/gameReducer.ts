import { GameState, GameAction } from '../types/game';
import { Monster, GameCard, HealthPotion, Weapon } from '../types/cards';

function getNormalizedSuit(suit: string): string {
  const normalizedSuit = suit.toUpperCase();
  if (normalizedSuit === 'S' || normalizedSuit === '♠') return 'S';
  if (normalizedSuit === 'H' || normalizedSuit === '♥') return 'H';
  if (normalizedSuit === 'D' || normalizedSuit === '♦') return 'D';
  if (normalizedSuit === 'C' || normalizedSuit === '♣') return 'C';
  return suit;
}

function isSameCard(card1: GameCard, card2: GameCard): boolean {
  const suit1 = getNormalizedSuit(card1.suit);
  const suit2 = getNormalizedSuit(card2.suit);
  return suit1 === suit2 && card1.rank === card2.rank;
}

function getRankValue(rank: string): number {
  const rankMap: { [key: string]: number } = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11,
    '10': 10, '9': 9, '8': 8, '7': 7,
    '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  return rankMap[rank] || 0;
}

export const initialState: GameState = {
  health: 20,
  maxHealth: 20,
  dungeon: [],
  room: [],
  discardPile: [],
  equippedWeapon: null,
  canAvoidRoom: true,
  gameOver: false,
  score: 0,
  originalRoomSize: 0,
  remainingAvoids: 1,
  lastActionWasAvoid: false,
  lastActionTimestamp: Date.now(),
  lastActionSequence: 0,
  stateChecksum: ''
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.gameOver) {
    return state;
  }

  switch (action.type) {
    case 'DRAW_ROOM':
      if (state.dungeon.length < 3) {
        const monstersInDungeon = state.dungeon.filter(card => card.type === 'MONSTER') as Monster[];
        const score = state.health > 0 
          ? state.health 
          : -monstersInDungeon.reduce((acc, monster) => acc + getRankValue(monster.rank), 0);
        return { 
          ...state, 
          gameOver: true, 
          score
        };
      }
      
      // If there's one card in the room, keep it and add three new cards
      if (state.room.length === 1) {
        const newCards = state.dungeon.slice(0, 3);
        const dungeon = state.dungeon.slice(3);
        return { 
          ...state, 
          room: [...state.room, ...newCards], 
          dungeon,
          canAvoidRoom: !state.lastActionWasAvoid,
          originalRoomSize: 4,
          remainingAvoids: 1,
          lastActionWasAvoid: false
        };
      }
      
      // Otherwise, draw a fresh room of 4 cards
      const room = state.dungeon.slice(0, 4);
      const dungeon = state.dungeon.slice(4);
      return { 
        ...state, 
        room, 
        dungeon, 
        canAvoidRoom: !state.lastActionWasAvoid,
        originalRoomSize: 4,
        remainingAvoids: 1,
        lastActionWasAvoid: false
      };

    case 'AVOID_ROOM':
      if (!state.canAvoidRoom || state.lastActionWasAvoid) return state;
      const updatedDungeon = [...state.dungeon, ...state.room];
      return { 
        ...state, 
        room: [], 
        dungeon: updatedDungeon,
        originalRoomSize: 0,
        remainingAvoids: 0,
        lastActionWasAvoid: true
      };

    case 'FIGHT_MONSTER': {
      if (!action.monster) {
        throw new Error('Monster is required for FIGHT_MONSTER action');
      }
      const monster = action.monster;
      const newHealth = state.health - monster.damage;
      const updatedRoom = state.room.filter(card => !isSameCard(card, monster));
      const isGameOver = newHealth <= 0;
      
      if (isGameOver) {
        const monstersInDungeon = state.dungeon.filter(card => card.type === 'MONSTER') as Monster[];
        const score = -monstersInDungeon.reduce((acc, m) => acc + getRankValue(m.rank), 0);
        return {
          ...state,
          health: newHealth,
          room: updatedRoom,
          discardPile: [...state.discardPile, monster],
          gameOver: true,
          score,
          canAvoidRoom: false,
          remainingAvoids: 0,
          lastActionWasAvoid: false
        };
      }

      return {
        ...state,
        health: newHealth,
        room: updatedRoom,
        discardPile: [...state.discardPile, monster],
        gameOver: false,
        canAvoidRoom: updatedRoom.length === state.originalRoomSize,
        remainingAvoids: 0,
        lastActionWasAvoid: false
      };
    }

    case 'USE_WEAPON': {
      if (!action.monster) {
        throw new Error('Monster is required for USE_WEAPON action');
      }
      if (!state.equippedWeapon) return state;
      
      const monster = action.monster;
      const damage = Math.max(0, monster.damage - state.equippedWeapon.damage);
      const updatedWeapon: Weapon = {
        ...state.equippedWeapon,
        monstersSlain: [...state.equippedWeapon.monstersSlain, monster],
        damage: monster.damage
      };
      const roomAfterWeapon = state.room.filter(card => !isSameCard(card, monster));
      const newHealthAfterWeapon = state.health - damage;
      const isGameOverAfterWeapon = newHealthAfterWeapon <= 0;

      if (isGameOverAfterWeapon) {
        const monstersInDungeon = state.dungeon.filter(card => card.type === 'MONSTER') as Monster[];
        const score = -monstersInDungeon.reduce((acc, m) => acc + getRankValue(m.rank), 0);
        return {
          ...state,
          health: newHealthAfterWeapon,
          equippedWeapon: updatedWeapon,
          room: roomAfterWeapon,
          gameOver: true,
          score,
          canAvoidRoom: false,
          remainingAvoids: 0,
          lastActionWasAvoid: false
        };
      }

      return {
        ...state,
        health: newHealthAfterWeapon,
        equippedWeapon: updatedWeapon,
        room: roomAfterWeapon,
        gameOver: false,
        canAvoidRoom: roomAfterWeapon.length === state.originalRoomSize,
        remainingAvoids: 0,
        lastActionWasAvoid: false
      };
    }

    case 'USE_HEALTH_POTION': {
      if (typeof action.healing !== 'number') {
        throw new Error('Healing amount is required for USE_HEALTH_POTION action');
      }
      const potion = state.room.find(card => 
        card.type === 'HEALTH_POTION' && (card as HealthPotion).healing === action.healing
      );
      if (!potion) return state;
      
      const newHealthWithPotion = Math.min(
        state.maxHealth,
        state.health + action.healing
      );
      const roomAfterPotion = state.room.filter(card => !isSameCard(card, potion));
      return {
        ...state,
        health: newHealthWithPotion,
        room: roomAfterPotion,
        discardPile: [...state.discardPile, potion],
        canAvoidRoom: roomAfterPotion.length === state.originalRoomSize,
        remainingAvoids: 0,
        lastActionWasAvoid: false,
        lastActionTimestamp: action.timestamp,
        lastActionSequence: action.sequence,
        stateChecksum: state.stateChecksum
      };
    }

    case 'EQUIP_WEAPON': {
      if (!action.weapon) {
        throw new Error('Weapon is required for EQUIP_WEAPON action');
      }
      const oldWeapon = state.equippedWeapon;
      const weapon = action.weapon;
      const roomAfterEquip = state.room.filter(card => !isSameCard(card, weapon));
      if (oldWeapon) {
        return {
          ...state,
          equippedWeapon: weapon,
          discardPile: [...state.discardPile, oldWeapon, ...oldWeapon.monstersSlain],
          room: roomAfterEquip,
          canAvoidRoom: roomAfterEquip.length === state.originalRoomSize,
          remainingAvoids: 0,
          lastActionWasAvoid: false
        };
      }
      return {
        ...state,
        equippedWeapon: weapon,
        room: roomAfterEquip,
        canAvoidRoom: roomAfterEquip.length === state.originalRoomSize,
        remainingAvoids: 0,
        lastActionWasAvoid: false
      };
    }

    default:
      return state;
  }
} 