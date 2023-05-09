import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  avatarUrl: String,
  password: String,
  name: { type: String, required: true },
  socialOnly: { type: Boolean, default: false },
  location: String,
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
});

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 5);
  }
});
export const User = mongoose.model('User', userSchema);
