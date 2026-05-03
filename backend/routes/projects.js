const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getProjects, getProject, createProject,
  updateProject, deleteProject, addMember, removeMember
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const projectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required')
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  validate
];
const { requireAdmin } = require('../middleware/authMiddleware');


router.use(protect); // All project routes require auth

router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', authorize('admin'), projectValidation, createProject);
router.put('/:id', authorize('admin'), updateProject);
router.delete('/:id', requireAdmin, deleteProject);

// Member management
router.post('/:id/members', [
  body('email').isEmail().withMessage('Valid email required'),
  validate
], authorize('admin'), addMember);
router.delete('/:id/members/:userId', authorize('admin'), removeMember);

module.exports = router;
