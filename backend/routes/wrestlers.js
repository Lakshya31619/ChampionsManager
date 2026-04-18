const express = require('express');
const { getAllWrestlers, getWrestlerById, getSuperstarGuide } = require('../controllers/wrestlerController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getAllWrestlers);
router.get('/guide/:id', auth, getSuperstarGuide);  // proxies superstar-guide API (avoids CORS)
router.get('/:id', auth, getWrestlerById);

module.exports = router;