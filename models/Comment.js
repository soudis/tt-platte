const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({

  title: String,
  type: String,
  raw: String,
  baked: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Media"
  }],  
  likes: Number
}, { timestamps: true });

var autoPopulateComment = function(next) {
  this.populate('user');
  this.populate('media');
  next();
};

commentSchema.
  pre('findOne', autoPopulateComment).
  pre('find', autoPopulateComment);


const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
