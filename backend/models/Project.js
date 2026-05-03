const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'on-hold', 'completed', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  dueDate: {
    type: Date
  },
  color: {
    type: String,
    default: '#6366f1'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: task count
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: false
});

module.exports = mongoose.model('Project', projectSchema);
