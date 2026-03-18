const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/verify', auth, (req, res) => res.json({ valid: true }));
router.put('/change-password', auth, userController.changePassword);
router.get('/users', auth, userController.getAllUsers);
router.post('/users', auth, userController.createUser);
router.put('/users/:id', auth, userController.updateUser);
router.patch('/users/:id/toggle-status', auth, userController.toggleUserStatus);
router.delete('/users/:id', auth, userController.deleteUser);

module.exports = router;
