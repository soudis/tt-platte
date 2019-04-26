const mongoose = require('mongoose');
const rimraf = require('rimraf');
const mediaSchema = new mongoose.Schema({

  mimeType: String,
  path: String,
  description: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment"
  }],
  likes: Number
}, { timestamps: true });

var autoPopulateMedia = function(next) {
  this.populate('user');
  this.populate('comment');
  next();
};

function deleteOnDisk(media) {
  console.log("i was here");
  rimraf(media.path.substring(0, media.path.lastIndexOf("/")), (error) => {
    if (error) {
      throw error;
    } 
  });
}

mediaSchema.
  pre('findOne', autoPopulateMedia).
  pre('find', autoPopulateMedia).
  post('remove', deleteOnDisk);

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
