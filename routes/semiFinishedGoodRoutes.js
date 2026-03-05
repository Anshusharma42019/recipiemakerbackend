const express = require('express');
const router = express.Router();
const semiFinishedGoodController = require('../controllers/semiFinishedGoodController');
const auth = require('../middleware/auth');

router.get('/', auth, semiFinishedGoodController.getAll);
router.delete('/:id', auth, semiFinishedGoodController.delete);

module.exports = router;
