const Item = require('../models/Item');
const Comment = require('../models/Comment');
const Media = require('../models/Media');
const User = require('../models/User');
const Promise = require('bluebird');
const helper = require('../utils/helper');
const config = require('../config/config.json');

function render(res, view, parameters) {
	return new Promise((resolve, reject) => {
		res.render(view, parameters, (err, html) => {
			if (err) {
				reject(err);
			} else {
				resolve(html);
			}
		});	
	})	
}

function renderItem(res, item)  {
	return render(res, 'map/item', {item: item}).
		then((html) => {
			rating = item.avgRating();
			return {latLong: item.latLong, html: html, id: item.id, rating: rating}
		});
}

function sendError(res, error) {
	console.log("ERROR: " + error.stack);
	res.status(500).send(error);
}

/**
 * GET /
 * Home page.
 */
exports.showMap = (req, res) => {
  res.render('map/map', {
    title: 'Karte'
  });
};

exports.setPlace = (req, res) => {
  if (req.params.place) {
  	req.session.place = config.places.find(place => {return place.id === req.params.place}) || config.places[0];
  } 
  res.json({place: req.session.place})
};

exports.goPlace = (req, res) => {
  if (req.params.place) {
  	console.log("place set " + config.places.find(place => {return place.id === req.params.place}) || config.places[0]);
  	req.session.place = config.places.find(place => {return place.id === req.params.place}) || config.places[0];
  } 
  res.redirect('/');
};



exports.fetchItems = (req, res) => {
	Item.find().exec()
		.then(items => Promise.all(items.map(item => renderItem(res, item))))
		.then(items => res.send(items))
		.catch(error => sendError(res, error));
};

exports.getCreateItem = (req, res) => {
	render(res, 'map/create_item', {lat: req.params.lat, long: req.params.long})
		.then(html => res.send({html: html}))
		.catch(error => sendError(res, error));
};

exports.getEditItem = (req, res) => {
	Item.findOne({_id: req.params.id}).exec()
		.then(item => render(res, 'map/edit_item', {item: item}))
		.then(html => res.send({html: html}))
		.catch(error => sendError(res, error));
};

exports.createItem = (req, res) => {
	const item = new Item({
        type: "table_tennis",
        country: "AT",
        place: "Linz",
        media: req.body.uploadedFiles,
        latLong: [req.body.lat, req.body.long],
        title: req.body.title,
        description: req.body.description
    });


    item.save()
    	.then(item => Item.findOne({_id: item._id}).exec())
    	.then(item => renderItem(res, item))
    	.then(item => res.send(item))
		.catch(error => sendError(res, error));
}

exports.editItem = (req, res) => {
	Item.findOne({_id: req.body.id}).exec()
		.then((item) => {
			item.title = req.body.title;
			item.description = req.body.description;
			item.latLong = [req.body.lat, req.body.long];
			if (req.body.uploadedFiles && req.body.uploadedFiles.length > 0) {
				item.media = item.media.concat(req.body.uploadedFiles);
			}
			return item.save();
		})
		.then(item => item.populate("media"))
    	.then(item => renderItem(res, item))
    	.then(item => res.send(item))
		.catch(error => sendError(res, error));
}

exports.deleteItem = (req, res) => {
	Item.findOne({_id: req.params.id}).exec()
    	.then((item) => item.remove())	
    	.then(() => res.send({}))
		.catch(error => sendError(res, error));
}

exports.renderMenu = (req, res) => {
	render(res, "map/menu", {})
		.then(menu => res.send({html: menu}))
		.catch(error => sendError(res, error));
}

exports.rateItemCriteria = (req, res) => {
	var itemId = req.params.item_id;
	var criteriaName = req.params.criteria_name;
	var ratingValue = req.params.rating_value;
	if(itemId && criteriaName && ratingValue) {
		Item.findOne({_id: itemId}).exec()
			.then((item) => {
				var rating = helper.getRating(req.user, item);
				if (rating) {
					var criteria = rating.criteria.find((crit) => { return crit.name == criteriaName });
					if (criteria)  {
						criteria.value = ratingValue;
						console.log("new Item with updated criteria: " + JSON.stringify(item));
					} else {
						rating.criteria.push( {
							name: criteriaName,
							type: "number",
							value: ratingValue							
						})
						console.log("new Item with new criteria: " + JSON.stringify(item));
					}
					return item.save();

				} else {
					item.ratings.push({user: req.user._id, criteria: [
						{
							name: criteriaName,
							type: "number",
							value: ratingValue
						}
					]});
					console.log("new Item with new Rating: " + JSON.stringify(item));
					return item.save();
				}
			})
			.then((item) => {
				var result = {};
				return render(res, "map/rating", {item: item, title: item.title, rating: item.avgRating().avg})
					.then((html) =>  {
						result.title = html;
						return render(res, "map/rating_total", {avgRating: item.avgRating()});
					})
					.then((html) =>  {
						result.total = html;
						return renderItem(res, item);
					})					
					.then((item) => {
						result.item = item;
						return result
					})
			})
			.then(result => res.send(result))
			.catch(error => sendError(res, error));
	} else {	
		sendError(res, "Bewertung: Ungültige Parameter");
	}
}