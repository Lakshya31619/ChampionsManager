const express = require('express');
const {
  getUserRoster,
  addWrestlerToRoster,
  updateRosterEntry,
  removeFromRoster,
} = require('../controllers/rosterController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getUserRoster);
router.post('/', auth, addWrestlerToRoster);
router.put('/:id', auth, updateRosterEntry);
router.delete('/:id', auth, removeFromRoster);

module.exports = router;