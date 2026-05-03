const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUserRole, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');


router.use(protect);
router.use(authorize('admin')); // All user management = admin only

router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

module.exports = router;
