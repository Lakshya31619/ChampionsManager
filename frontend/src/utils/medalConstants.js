/**
 * Advanced Medal System Constants
 */

export const MEDAL_TYPES = ['Fury', 'Takedown', 'Armor'];
export const SET_TIERS = ['I', 'II', 'III'];
export const MEDAL_TIERS = [1, 2, 3, 4, 5, 6];
export const MEDAL_LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);

export const SLOT_DEFAULT_ABILITIES = {
  1: { type: 'Move Defense', label: 'All Move Defense' },
  2: { type: 'Gem Defense', label: 'All Gem Defense' },
  3: { type: 'Move Damage', label: 'All Move Damage / Color Move Damage' },
  4: { type: 'Gem Damage', label: 'All Gem Damage / Color Gem Damage' },
};

export const SET_BONUSES = {
  Fury: {
    I: { 2: 0, 4: 0 },
    II: { 2: 40, 4: 80 },
    III: { 4: 100 },
  },
  Takedown: {
    I: { 2: 0, 4: 0 },
    II: { 2: 40, 4: 80 },
    III: { 4: 100 },
  },
  Armor: {
    I: { 2: 20 },
    II: { 2: 20 },
    III: { 4: 60 },
  },
};

export const SUBSTAT_TYPES = [
  'All Gem Damage', 'Red Gem Damage', 'Blue Gem Damage', 'Green Gem Damage', 'Yellow Gem Damage', 'Black Gem Damage', 'Purple Gem Damage',
  'All Move Damage', 'Red Move Damage', 'Blue Move Damage', 'Green Move Damage', 'Yellow Move Damage', 'Black Move Damage', 'Purple Move Damage',
  'All Gem Defense', 'All Move Defense', 'Health Increase'
];
