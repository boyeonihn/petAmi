import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxLength: 80 },
  description: { type: String, trim: true },
  createdAt: { type: Date, required: true, default: Date.now },
  hashtags: [{ type: String }],
  fileUrl: { type: String, required: true },
  thumbUrl: { type: String, required: true },
  meta: {
    comments: { type: Number, default: 0, required: true },
    views: { type: Number, default: 0, required: true },
    rating: { type: Number, default: 0, required: true },
  },
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  comments: [
    { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Comment' },
  ],
});

//middleware must go before the model is made

// videoSchema.pre('save', async function () {
//   console.log('we are about to save:', this);
//   this.hashtags = this.hashtag[0]
//     .split(',')
//     .map((word) => (word.startsWith('#') ? word : `#${word.trim()}`));
// });

videoSchema.static('formatHashtags', function (hashtags) {
  return hashtags
    .split(',')
    .map((word) => (word.startsWith('#') ? word : `#${word.trim()}`));
});

videoSchema.static('changePathFormula', (urlPath) => {
  return urlPath.replace(/\\/g, '/');
});
export const Video = mongoose.model('Video', videoSchema);
