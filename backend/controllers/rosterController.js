const Roster = require('../models/Roster');
const axios = require('axios');

const RARITIES = [
  '1★ Bronze', '2★ Bronze', '3★ Bronze', '4★ Bronze', '5★ Bronze', '6★ Bronze',
  '1★ Silver', '2★ Silver', '3★ Silver', '4★ Silver', '5★ Silver', '6★ Silver',
  '1★ Gold', '2★ Gold', '3★ Gold', '4★ Gold', '5★ Gold', '6★ Gold'
];

/**
 * GET /api/roster
 * Returns the logged-in user's roster
 */
const getUserRoster = async (req, res) => {
  try {
    const roster = await Roster.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, roster });
  } catch (error) {
    console.error('Roster Error [getUserRoster]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/roster
 * Adds a wrestler to the logged-in user's roster
 */
const addWrestlerToRoster = async (req, res) => {
  try {
    let { wrestlerId, rarity = '1★ Bronze', shards = 0, style = '' } = req.body;

    if (!wrestlerId) {
      return res.status(400).json({ success: false, message: 'Missing wrestlerId' });
    }
    wrestlerId = String(wrestlerId);

    if (!RARITIES.includes(rarity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rarity',
        validRarities: RARITIES
      });
    }

    // Check if wrestler already exists in roster
    let rosterEntry = await Roster.findOne({ userId: req.user._id, wrestlerId });

    if (rosterEntry) {
      // Update shards instead of rejecting
      rosterEntry.shards = shards;
      if (rarity) rosterEntry.rarity = rarity; // optional: update rarity too
      await rosterEntry.save();

      return res.json({
        success: true,
        message: 'Wrestler already in roster, shards updated',
        rosterEntry
      });
    }

    // Otherwise, add new wrestler
    let wrestlerData = {};
    let wrestlerName = 'Unknown Wrestler';

    try {
      const response = await axios.get(process.env.WWE_API_URL);
      const wrestlersResponse = Array.isArray(response.data?.data) ? response.data.data : [];

      const wrestler = wrestlersResponse.find(w => {
        const normalizedId = w.id || w.ID || w.wrestlerId || w._id;
        return normalizedId && String(normalizedId) === wrestlerId;
      });

      if (wrestler) {
        wrestlerData = wrestler;
        wrestlerName =
          wrestler.name ||
          wrestler.title ||
          `${wrestler.firstName || ''} ${wrestler.lastName || ''}`.trim() ||
          wrestlerName;
      }
    } catch (apiError) {
      console.warn('WWE API not available, using minimal data:', apiError.message);
    }

    rosterEntry = await Roster.create({
      userId: req.user._id,
      wrestlerId,
      wrestlerName,
      rarity,
      shards,
      style,
      level: 1,
      wrestlerData
    });

    res.status(201).json({ success: true, rosterEntry });
  } catch (error) {
    console.error('Roster Error [addWrestlerToRoster]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


/**
 * PUT /api/roster/:id
 * Updates a roster entry
 */
const updateRosterEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { rarity, shards, level } = req.body;

    if (rarity && !RARITIES.includes(rarity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rarity',
        validRarities: RARITIES
      });
    }

    const rosterEntry = await Roster.findOne({ _id: id, userId: req.user._id });
    if (!rosterEntry) {
      return res.status(404).json({ success: false, message: 'Roster entry not found' });
    }

    if (rarity) rosterEntry.rarity = rarity;
    if (shards !== undefined) rosterEntry.shards = shards;
    if (level !== undefined) rosterEntry.level = level;

    await rosterEntry.save();
    res.json({ success: true, rosterEntry });
  } catch (error) {
    console.error('Roster Error [updateRosterEntry]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * DELETE /api/roster/:id
 * Removes a roster entry
 */
const removeFromRoster = async (req, res) => {
  try {
    const { id } = req.params;
    const rosterEntry = await Roster.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!rosterEntry) {
      return res.status(404).json({ success: false, message: 'Roster entry not found' });
    }

    res.json({ success: true, message: 'Wrestler removed from roster' });
  } catch (error) {
    console.error('Roster Error [removeFromRoster]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getUserRoster,
  addWrestlerToRoster,
  updateRosterEntry,
  removeFromRoster
};
