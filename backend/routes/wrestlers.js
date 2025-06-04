const express = require('express');
const { getAllWrestlers, getWrestlerById } = require('../controllers/wrestlerController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getAllWrestlers);
router.get('/:id', auth, getWrestlerById);

module.exports = router;