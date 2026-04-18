const mongoose = require('mongoose');

const STYLE_OPTIONS = ['Chaotic', 'Aggressive', 'Defensive', 'Focused'];

const rosterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wrestlerId: {
      type: String,
      required: true,
    },
    isRecruited: {
      type: Boolean,
      default: true,
    },
    wrestlerName: {
      type: String,
      required: true,
    },
    rarity: {
      type: String,
      enum: [
        '1★ Bronze', '2★ Bronze', '3★ Bronze', '4★ Bronze', '5★ Bronze', '6★ Bronze',
        '1★ Silver', '2★ Silver', '3★ Silver', '4★ Silver', '5★ Silver', '6★ Silver',
        '1★ Gold', '2★ Gold', '3★ Gold', '4★ Gold', '5★ Gold', '6★ Gold'
      ],
      default: '1★ Bronze',
    },
    shards: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 390,
    },
    style: {
      type: String,
      enum: STYLE_OPTIONS,
      default: 'Focused',
    },
    hypeLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 4,
    },
    hypePoints: {
      type: Number,
      default: 0,
      min: 0,
      max: 210,
    },
    starKey: {
      type: String,
      default: '',
    },
    equippedMoves: {
      type: [String],
      default: [],
    },
    moveLevels: {
      type: Map,
      of: Number,
      default: {},
    },
    wrestlerData: {
      type: Object,
      default: {},
    },
    strap: {
      equipped: { type: Boolean, default: false },
      rarity: { type: String, enum: ['Rare', 'Epic', 'Legendary', 'Ultimate'], default: 'Rare' },
      boostType: { type: String, enum: ['Gem Damage', 'Move Damage', 'Gem Defense', 'Move Defense', 'Stun Immunity', 'Bleed Immunity', 'Affiliation Bonus', 'Extra Turn'], default: 'Gem Damage' },
      gemBuff: { type: Number, default: 0, min: 0, max: 200 },
      isPercentage: { type: Boolean, default: true },
      medals: [
        {
          slot: { type: Number, required: true },
          tier: { type: Number, default: 1, min: 1, max: 6 },
          level: { type: Number, default: 1, min: 1, max: 15 },
          setType: { type: String, enum: ['Fury', 'Takedown', 'Armor'] },
          setTier: { type: String, enum: ['I', 'II', 'III'] },
          defaultAbility: {
            type: { type: String },
            value: { type: Number, default: 0 },
            isPercentage: { type: Boolean, default: false }
          },
          // Sub-stats for medals
          subStats: [
            {
              type: { type: String },
              value: { type: Number, default: 0 },
              isPercentage: { type: Boolean, default: false }
            }
          ],
          // Support for Skill Plates and Ultimate Plates
          category: { type: String, enum: ['Skill Plate', 'Ultimate Plate'] },
          name: { type: String },
          description: { type: String },
          imageUrl: { type: String }
        }
      ]
    },
  },
  {
    timestamps: true,
  }
);

rosterSchema.index({ userId: 1, wrestlerId: 1 }, { unique: true });

module.exports = mongoose.model('Roster', rosterSchema);