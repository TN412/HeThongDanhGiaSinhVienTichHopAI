const mongoose = require('mongoose');

/**
 * User Model
 * Represents both students and instructors in the system
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Don't include password hash in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'instructor'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
      default: 'student',
    },
    // Optional profile fields
    studentId: {
      type: String,
      sparse: true, // Allows null for instructors
    },
    department: {
      type: String,
      trim: true,
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'users',
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for removing sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

// Instance method to compare password (to be used with bcrypt)
userSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcryptjs');
  // passwordHash is not selected by default, so we need to fetch it explicitly
  const user = await this.constructor.findById(this._id).select('+passwordHash');
  if (!user || !user.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, user.passwordHash);
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const bcrypt = require('bcryptjs');
    // Hash password with cost factor of 10
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
