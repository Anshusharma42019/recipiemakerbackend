const express = require('express');
const router = express.Router();
const finishedGoodController = require('../controllers/finishedGoodController');
const auth = require('../middleware/auth');

router.get('/', auth, finishedGoodController.getAll);
router.delete('/:id', auth, finishedGoodController.delete);

module.exports = router;
