const Roster = require('../models/Roster');
const axios = require('axios');

const RARITIES = [
  '1★ Bronze','2★ Bronze', '3★ Bronze','4★ Bronze','5★ Bronze','6★ Bronze',
  '1★ Silver','2★ Silver','3★ Silver','4★ Silver','5★ Silver','6★ Silver',
  '1★ Gold','2★ Gold','3★ Gold','4★ Gold','5★ Gold','6★ Gold'
];

const getUserRoster = async (req, res) => {
  try {
    const roster = await Roster.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      roster
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addWrestlerToRoster = async (req, res) => {
  try {
    const { wrestlerId, rarity = '1★ Bronze', shards = 0 } = req.body;

    if (rarity && !RARITIES.includes(rarity)) {
      return res.status(400).json({ 
        message: 'Invalid rarity', 
        validRarities: RARITIES 
      });
    }

    let wrestlerData = {};
    let wrestlerName = 'Unknown Wrestler';

    try {
      const response = await axios.get(process.env.WWE_API_URL);
      const wrestlersResponse = response.data?.data || [];
      
      const wrestler = wrestlersResponse.find(w => 
        w.ID?.toString() === wrestlerId.toString() || 
        w.id?.toString() === wrestlerId.toString()
      );
      
      if (wrestler) {
        wrestlerData = wrestler;
        wrestlerName = wrestler.name || wrestler.title || 
          `${wrestler.firstName || ''} ${wrestler.lastName || ''}`.trim() || 
          'Unknown Wrestler';
      }
    } catch (apiError) {
      console.warn('WWE API not available, proceeding with basic data:', apiError.message);
    }

    const existingRoster = await Roster.findOne({
      userId: req.user._id,
      wrestlerId
    });

    if (existingRoster) {
      return res.status(400).json({ message: 'Wrestler already in roster' });
    }

    const rosterEntry = await Roster.create({
      userId: req.user._id,
      wrestlerId,
      wrestlerName,
      rarity,
      shards,
      level: 1,
      wrestlerData
    });

    res.status(201).json({
      success: true,
      rosterEntry
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateRosterEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { rarity, shards, level } = req.body;

    if (rarity && !RARITIES.includes(rarity)) {
      return res.status(400).json({ 
        message: 'Invalid rarity', 
        validRarities: RARITIES 
      });
    }

    const rosterEntry = await Roster.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!rosterEntry) {
      return res.status(404).json({ message: 'Roster entry not found' });
    }

    if (rarity) rosterEntry.rarity = rarity;
    if (shards !== undefined) rosterEntry.shards = shards;
    if (level) rosterEntry.level = level;

    await rosterEntry.save();

    res.json({
      success: true,
      rosterEntry
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const removeFromRoster = async (req, res) => {
  try {
    const { id } = req.params;

    const rosterEntry = await Roster.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!rosterEntry) {
      return res.status(404).json({ message: 'Roster entry not found' });
    }

    res.json({
      success: true,
      message: 'Wrestler removed from roster'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getUserRoster,
  addWrestlerToRoster,
  updateRosterEntry,
  removeFromRoster
};