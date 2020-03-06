const mongoose = require('mongoose');
const rimraf = require('rimraf');
const mediaSchema = new mongoose.Schema({

  mimeType: String,
  path: String,
  size: {
    height: Number,
    width: Number
  },
  altSizes: [{
    width: Number,
    path: String
  }],
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

mediaSchema.methods.findNearestImageSize = function(width) {
  if (this.altSizes && this.altSizes.length > 0) {
    var currentWidth;
    var currentPath = this.path;
    if (this.size && this.size.width) {
      currentWidth = this.size.width;
    } else {
      currentWidth = 1000000;
    }
    this.altSizes.forEach(altSize => {
      if (Math.abs(currentWidth - width) > Math.abs(altSize.width - width)) {
        currentPath = altSize.path;
      }
    })
    return currentPath;
  } else {
    return this.path;
  }
}

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
