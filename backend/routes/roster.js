const express = require('express');
const {
  getUserRoster,
  getSavedUnrecruited,
  syncCatalog,
  addWrestlerToRoster,
  updateRosterEntry,
  removeFromRoster,
  syncAllRosterStyles
} = require('../controllers/rosterController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getUserRoster);
router.get('/unrecruited', auth, getSavedUnrecruited);
router.post('/', auth, addWrestlerToRoster);
router.post('/sync-styles', auth, syncAllRosterStyles);
router.post('/sync-catalog', auth, syncCatalog);
router.put('/:id', auth, updateRosterEntry);
router.delete('/:id', auth, removeFromRoster);

module.exports = router;