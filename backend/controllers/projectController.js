const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin'
      ? {}  // Admins see all projects
      : {
          $or: [
            { owner: req.user._id },
            { 'members.user': req.user._id }
          ]
        };

    const projects = await Project.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    // Add task stats to each project
    const projectsWithStats = await Promise.all(projects.map(async (p) => {
      const tasks = await Task.find({ project: p._id });
      const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        done: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => t.dueDate && new Date() > t.dueDate && t.status !== 'done').length
      };
      return { ...p.toObject(), taskStats: stats };
    }));

    res.status(200).json({ success: true, count: projects.length, data: projectsWithStats });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Check access
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isMember && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private (Admin)
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, status, priority, dueDate, color } = req.body;

    const project = await Project.create({
      name, description, status, priority, dueDate, color,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    await project.populate('owner', 'name email avatar');
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin / Project Admin)
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only project owner or admin can update.' });
    }

    const { name, description, status, priority, dueDate, color } = req.body;
    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, status, priority, dueDate, color },
      { new: true, runValidators: true }
    ).populate('owner', 'name email avatar').populate('members.user', 'name email avatar');

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin / Owner)
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only owner or admin can delete.' });
    }

    await Task.deleteMany({ project: req.params.id });
    await project.deleteOne();

    res.status(200).json({ success: true, message: 'Project and all tasks deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private (Owner / Admin)
exports.addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only owner or admin can add members.' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found.' });

    const alreadyMember = project.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member.' });

    project.members.push({ user: userToAdd._id, role: role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private (Owner / Admin)
exports.removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only owner or admin can remove members.' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();

    res.status(200).json({ success: true, message: 'Member removed.' });
  } catch (error) {
    next(error);
  }
};
