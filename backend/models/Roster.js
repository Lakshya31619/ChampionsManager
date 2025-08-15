const mongoose = require('mongoose');

const rosterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wrestlerId: {
    type: String,
    required: true
  },
  wrestlerName: {
    type: String,
    required: true
  },
  rarity: {
    type: String,
    enum: [
      '1★ Bronze','2★ Bronze', '3★ Bronze','4★ Bronze','5★ Bronze','6★ Bronze',
      '1★ Silver','2★ Silver','3★ Silver','4★ Silver','5★ Silver','6★ Silver',
      '1★ Gold','2★ Gold','3★ Gold','4★ Gold','5★ Gold','6★ Gold'
    ],
    default: '1★ Bronze'
  },
  shards: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 350
  },
  style: {
    type : String
  },
  wrestlerData: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

rosterSchema.index({ userId: 1, wrestlerId: 1 }, { unique: true });

module.exports = mongoose.model('Roster', rosterSchema);