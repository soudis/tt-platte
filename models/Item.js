const mongoose = require('mongoose');
const Media = require('./Media');
const Comment = require('./Comment');
const config = require('../config/config');

const criteriaSchema = new mongoose.Schema({
  name: String,
  type: String,
  value: mongoose.Schema.Types.Mixed
})

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId, 
    ref: 'User' 
  }, 
  criteria: [criteriaSchema]
});

ratingSchema.methods.avgRating = function() {
  var sum = 0, count = 0, avg = 0;

  if (this.criteria) {
    this.criteria.forEach((crit) => {
      if (crit.type == "number" && parseFloat(crit.value) > 0) {
        sum += parseFloat(crit.value);
        count ++;
      }
    })    
  }
  if (count > 0 ) {
    console.log("avg: " + avg + ", sum: " + sum + ", count: " + count);
    avg = sum/count;  
  } 
  return avg;  
}

var autoPopulateRating = function(next) {
  this.populate('user');
  next();
};

ratingSchema.
  pre('findOne', autoPopulateRating).
  pre('find', autoPopulateRating);

const itemSchema = new mongoose.Schema({

  type: {
    type: String,
    required: true
  },  
  description: String,
  place: String,
  country: String,
  latLong: [Number],
  title: {
    type: String,
    required: true
  },
  media: [{
    type: mongoose.Schema.ObjectId,
    ref: "Media"
  }],
  comments: [{
    type: mongoose.Schema.ObjectId,
    ref: "Comment"
  }],
  user: {
    type: mongoose.Schema.ObjectId, 
    ref: 'User' 
  },   
  ratings: [ratingSchema]

}, { timestamps: true });

itemSchema.methods.avgRating = function() {
  var sum = 0, count = 0;
  var criteria = {};

  if (this.ratings) {

    this.ratings.forEach((rating) => {
      var avgRating = rating.avgRating();
      if (avgRating > 0) {
        rating.criteria.forEach((crit) => {
          if (crit.type == "number" && parseFloat(crit.value) > 0) {
            if (!criteria[crit.name]) {            
              criteria[crit.name] = { sum: 0, count: 0 }
            }
            criteria[crit.name].sum += parseFloat(crit.value);
            criteria[crit.name].count ++;
          }          
        })
        sum += avgRating;
        count ++;
      }
    })
  }
  if (count > 0 ) {
    var result = { avg: Math.round(sum/count*100)/100, criteria: []}
    config.rating_criteria.table_tennis.forEach((entry) => {
      if ( criteria[entry.name] && criteria[entry.name].count > 0 ) {
        result.criteria.push({name: entry.name, value: criteria[entry.name].sum/criteria[entry.name].count });
      }
    })
    return result;  
  } else {
    return {avg:0, criteria: []};
  } 
}

var autoPopulateItem = function(next) {
  this.populate('media');
  this.populate('comments');
  this.populate('user');
  next();
};


function removeLinks(item) {
    // doc will be the removed Person document
    Media.remove({_id: { $in: item.media }})
    Comment.remove({_id: { $in: item.comments }})
}

itemSchema.
  pre('findOne', autoPopulateItem).
  pre('find', autoPopulateItem).
  post('remove', removeLinks);

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
