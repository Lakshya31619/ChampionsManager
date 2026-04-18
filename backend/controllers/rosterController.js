const Roster = require('../models/Roster');
const { getStyleForWrestler } = require('../utils/superstarStyleSync');

const RARITIES = [
  '1★ Bronze', '2★ Bronze', '3★ Bronze', '4★ Bronze', '5★ Bronze', '6★ Bronze',
  '1★ Silver', '2★ Silver', '3★ Silver', '4★ Silver', '5★ Silver', '6★ Silver',
  '1★ Gold', '2★ Gold', '3★ Gold', '4★ Gold', '5★ Gold', '6★ Gold'
];

const STYLE_OPTIONS = ['Chaotic', 'Aggressive', 'Defensive', 'Focused'];

/**
 * GET /api/roster
 */
const getUserRoster = async (req, res) => {
  try {
    const roster = await Roster.find({ userId: req.user._id, isRecruited: { $ne: false } }).sort({ createdAt: -1 });
    res.json({ success: true, roster });
  } catch (error) {
    console.error('Roster Error [getUserRoster]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/roster/unrecruited
 * Fetches all saved stats for unrecruited wrestlers (Wishlist items)
 */
const getSavedUnrecruited = async (req, res) => {
  try {
    const unrecruited = await Roster.find({ userId: req.user._id, isRecruited: false });
    res.json({ success: true, unrecruited });
  } catch (error) {
    console.error('Roster Error [getSavedUnrecruited]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/roster
 */
const addWrestlerToRoster = async (req, res) => {
  try {
    let {
      wrestlerId,
      wrestlerName: bodyName,
      rarity = '1★ Bronze',
      shards = 0,
      style = 'Focused',
      hypeLevel = 1,
      hypePoints = 0,
      isRecruited = true,
      wrestlerData = {},
    } = req.body;

    if (!wrestlerId) {
      return res.status(400).json({ success: false, message: 'Missing wrestlerId' });
    }

    wrestlerId = String(wrestlerId);

    if (!RARITIES.includes(rarity)) {
      rarity = '1★ Bronze';
    }

    if (!STYLE_OPTIONS.includes(style)) {
      style = 'Focused';
    }

    // Auto-sync style from API
    const officialStyle = await getStyleForWrestler(wrestlerId);
    if (officialStyle) {
      style = officialStyle;
    }

    const wrestlerName =
      bodyName ||
      wrestlerData?.name ||
      wrestlerData?.title ||
      `${wrestlerData?.firstName || ''} ${wrestlerData?.lastName || ''}`.trim() ||
      'Unknown Wrestler';

    let rosterEntry = await Roster.findOne({
      userId: req.user._id,
      wrestlerId,
    });

    if (rosterEntry) {
      rosterEntry.shards = shards;
      rosterEntry.rarity = rarity;
      rosterEntry.style = style;
      rosterEntry.hypeLevel = hypeLevel;
      rosterEntry.hypePoints = hypePoints;
      rosterEntry.isRecruited = isRecruited;

      await rosterEntry.save();

      return res.json({
        success: true,
        message: 'Wrestler already in roster, updated',
        rosterEntry,
      });
    }

    rosterEntry = await Roster.create({
      userId: req.user._id,
      wrestlerId,
      wrestlerName,
      rarity,
      shards,
      style,
      hypeLevel,
      hypePoints,
      isRecruited,
      level: 1,
      wrestlerData,
    });

    res.status(201).json({ success: true, rosterEntry });
  } catch (error) {
    console.error('Roster Error [addWrestlerToRoster]:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * PUT /api/roster/:id
 */
const updateRosterEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rarity,
      shards,
      level,
      starKey,
      style,
      hypeLevel,
      hypePoints,
      isRecruited,
      equippedMoves,
      moveLevels,
      strap,
    } = req.body;

    if (rarity && !RARITIES.includes(rarity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rarity',
        validRarities: RARITIES,
      });
    }

    if (style && !STYLE_OPTIONS.includes(style)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid style',
        validStyles: STYLE_OPTIONS,
      });
    }

    const rosterEntry = await Roster.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!rosterEntry) {
      return res.status(404).json({
        success: false,
        message: 'Roster entry not found',
      });
    }

    if (rarity !== undefined) rosterEntry.rarity = rarity;
    if (starKey !== undefined) rosterEntry.starKey = starKey;
    if (shards !== undefined) rosterEntry.shards = Math.max(0, Number(shards));
    if (level !== undefined) rosterEntry.level = Math.max(1, Number(level));
    if (isRecruited !== undefined) rosterEntry.isRecruited = isRecruited;

    if (style !== undefined) {
      rosterEntry.style = style;
    } else {
      // Periodic check or fix if style is missing or we want to ensure sync
      const officialStyle = await getStyleForWrestler(rosterEntry.wrestlerId);
      if (officialStyle) {
        rosterEntry.style = officialStyle;
      }
    }

    if (hypeLevel !== undefined) {
      rosterEntry.hypeLevel = Math.min(4, Math.max(1, Number(hypeLevel)));
    }

    if (hypePoints !== undefined) {
      rosterEntry.hypePoints = Math.min(210, Math.max(0, Number(hypePoints)));
    }

    if (equippedMoves !== undefined) {
      if (!Array.isArray(equippedMoves) || equippedMoves.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'equippedMoves must be an array of up to 3 move IDs',
        });
      }

      rosterEntry.equippedMoves = equippedMoves;
    }

    if (moveLevels !== undefined && typeof moveLevels === 'object') {
      rosterEntry.moveLevels = new Map(
        Object.entries(moveLevels).map(([k, v]) => [k, Number(v)])
      );
    }
    
    if (strap !== undefined && typeof strap === 'object') {
      rosterEntry.strap = strap;
    }

    await rosterEntry.save();

    res.json({
      success: true,
      rosterEntry,
    });
  } catch (error) {
    console.error('Roster Error [updateRosterEntry]:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/roster/:id
 */
const removeFromRoster = async (req, res) => {
  try {
    const { id } = req.params;

    const rosterEntry = await Roster.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!rosterEntry) {
      return res.status(404).json({
        success: false,
        message: 'Roster entry not found',
      });
    }

    res.json({
      success: true,
      message: 'Wrestler removed from roster',
    });
  } catch (error) {
    console.error('Roster Error [removeFromRoster]:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * POST /api/roster/sync-styles
 * Bulk sync all styles for existing roster entries
 */
const syncAllRosterStyles = async (req, res) => {
  try {
    const userId = req.user._id;
    const roster = await Roster.find({ userId });
    let updatedCount = 0;

    for (const entry of roster) {
      const officialStyle = await getStyleForWrestler(entry.wrestlerId);
      if (officialStyle && officialStyle !== entry.style) {
        entry.style = officialStyle;
        await entry.save();
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully synced styles for ${updatedCount} wrestlers.`,
      totalCount: roster.length
    });
  } catch (error) {
    console.error('Roster Error [syncAllRosterStyles]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/roster/sync-catalog
 * Fetches ALL wrestlers from the WWE API and upserts lightweight records into DB.
 * Only stores identity fields (name, image, class, era, style, id).
 * Does NOT override any user-edited fields (shards, rarity, hype, etc) on existing rows.
 */
const syncCatalog = async (req, res) => {
  const axios = require('axios');
  try {
    const response = await axios.get(process.env.WWE_API_URL);
    if (!response.data || !Array.isArray(response.data.data)) {
      return res.status(502).json({ success: false, message: 'Invalid response from WWE API' });
    }

    const wrestlers = response.data.data;
    let added = 0, skipped = 0;

    for (const w of wrestlers) {
      const wrestlerId = String(
        w.superstarId ?? w.wrestlerId ?? w.ID ?? w.groupId ?? w.id ?? ''
      );
      if (!wrestlerId) { skipped++; continue; }

      const name =
        w.name ||
        w.title ||
        `${w.firstName || ''} ${w.lastName || ''}`.trim() ||
        'Unknown';

      // Identity + display data only — NO gem/move/stat arrays (those are live)
      const slimData = {
        name,
        title: w.title || null,
        // All image variants used across the UI
        image:    w.image    || w.imagePNG || w.imageUrl || w.img || null,
        imagePNG: w.imagePNG || w.image    || w.imageUrl || null,
        imageUrl: w.imageUrl || w.image    || w.imagePNG || null,
        // Class/era for filtering and class-advantage logic
        class: w.class || w.Class || w.color || null,
        era:   w.era   || null,
        style: w.playStyle || w.style || 'Focused',
        // ALL ID variants — critical for guide API and Damage Calculator key lookup
        ID:         w.ID         || w.superstarId || w.groupId || w.id || null,
        superstarId:w.superstarId|| w.ID          || w.groupId || w.id || null,
        groupId:    w.groupId    || w.ID          || w.superstarId    || null,
      };

      const existing = await Roster.findOne({ userId: req.user._id, wrestlerId });

      if (existing) {
        // Merge identity/display fields only — never touch user edits (shards, rarity, hype)
        // Preserve any old full wrestlerData subfields like moves/stats that may have been stored
        existing.wrestlerData = {
          ...(existing.wrestlerData?.toObject ? existing.wrestlerData.toObject() : existing.wrestlerData),
          ...slimData,
        };
        if (!existing.wrestlerName || existing.wrestlerName === 'Unknown Wrestler') {
          existing.wrestlerName = name;
        }
        existing.markModified('wrestlerData');
        await existing.save();
        skipped++;
      } else {
        await Roster.create({
          userId: req.user._id,
          wrestlerId,
          wrestlerName: name,
          isRecruited: false,
          rarity: '1★ Bronze',
          shards: 0,
          level: 1,
          hypeLevel: 1,
          hypePoints: 0,
          style: slimData.style,
          wrestlerData: slimData,
        });
        added++;
      }
    }

    res.json({ success: true, message: `Sync complete: ${added} added, ${skipped} already existed.`, added, skipped });
  } catch (err) {
    console.error('Roster Error [syncCatalog]:', err);
    res.status(500).json({ success: false, message: 'Server error during sync', error: err.message });
  }
};

module.exports = {
  getUserRoster,
  getSavedUnrecruited,
  syncCatalog,
  addWrestlerToRoster,
  updateRosterEntry,
  removeFromRoster,
  syncAllRosterStyles,
};