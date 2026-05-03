const Task = require('../models/Task');
const Project = require('../models/Project');

// Helper: check if user has access to a project
const hasProjectAccess = async (projectId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const project = await Project.findById(projectId);
  if (!project) return false;
  const isOwner = project.owner.toString() === userId.toString();
  const isMember = project.members.some(m => m.user.toString() === userId.toString());
  return isOwner || isMember;
};

// @desc    Get tasks for a project
// @route   GET /api/tasks?project=:projectId
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const { project, status, priority, assignedTo } = req.query;

    if (!project) return res.status(400).json({ success: false, message: 'Project ID required.' });

    const access = await hasProjectAccess(project, req.user._id, req.user.role);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied.' });

    const filter = {
  project,
  $or: [
    { assignedTo: req.user._id },
    { createdBy: req.user._id }
  ]
};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard task stats for current user
// @route   GET /api/tasks/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
  $or: [
    { assignedTo: req.user._id },
    { createdBy: req.user._id }
  ]
};

    const tasks = await Task.find(query).populate('project', 'name color');

    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      inReview: tasks.filter(t => t.status === 'in-review').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && now > t.dueDate && t.status !== 'done').length,
      recentTasks: tasks.slice(0, 10)
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, project, assignedTo, dueDate, tags } = req.body;

    const access = await hasProjectAccess(project, req.user._id, req.user.role);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied.' });

    const task = await Task.create({
      title, description, status, priority, project, assignedTo, dueDate, tags,
      createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const access = await hasProjectAccess(task.project, req.user._id, req.user.role);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied.' });

    const { title, description, status, priority, assignedTo, dueDate, tags } = req.body;
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, status, priority, assignedTo, dueDate, tags },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar').populate('createdBy', 'name email');

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const project = await Project.findById(task.project);
    const isProjectOwner = project?.owner.toString() === req.user._id.toString();

    if (!isCreator && !isAdmin && !isProjectOwner) {
      return res.status(403).json({ success: false, message: 'Only task creator or admin can delete.' });
    }

    await task.deleteOne();
    res.status(200).json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    next(error);
  }
};
