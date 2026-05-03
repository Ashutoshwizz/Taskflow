const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Restrict to specific roles (global: admin/member)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action.`
      });
    }
    next();
  };
};

// Check project-level role (admin = owner or project admin member)
exports.projectRole = (...roles) => {
  return async (req, res, next) => {
    const Project = require('../models/Project');
    const project = await Project.findById(req.params.projectId || req.body.project);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Owner always has full access
    if (project.owner.toString() === req.user._id.toString()) {
      req.project = project;
      return next();
    }

    // Check member role in project
    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member || !roles.includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action in this project.'
      });
    }

    req.project = project;
    next();
  };
};
