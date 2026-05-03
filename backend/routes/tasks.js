const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getTasks, getDashboard, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/authMiddleware');


router.use(protect);

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('project').notEmpty().withMessage('Project ID is required'),
  validate
];

router.get('/dashboard', getDashboard);
router.get('/', getTasks);
router.post('/', taskValidation, createTask);
router.put('/:id', updateTask);
router.delete('/:id', requireAdmin, deleteTask);

module.exports = router;
