const config = require('../config/config');

exports.hasRated = (user, item) => {
	if (!user) {
		return false;
	} else {
		var rating = item.ratings.find((rating) => { return user._id == rating.user._id })
		if (rating) {
			return true;
		} else {
			return false;
		}		
	}

}

exports.getRating = (user, item) => {
	if (!user || !item) {
		return;
	} else {
		var rating = item.ratings.find((rating) => { return user._id.toString() == rating.user.toString() })
		if (rating) {
			return rating;
		} else {
			return;
		}		
	}

}

exports.getRatingCriteria = (user, item, criteria) => {
	if (!user) {
		return;
	} else {
		var rating = item.ratings.find((rating) => { return user._id.toString() == rating.user.toString() })
		if (rating) {
			criteria = rating.criteria.find((crit) => { return crit.name == criteria.name});
			if (criteria) {
				return criteria.value;
			} else {
				return;			
			}
		} else {
			return;
		}		
	}

}

exports.getCriteriaLabel = (name) => {
	var entry = config.rating_criteria.table_tennis.find((entry) => { return entry.name == name});
	if (entry) {
		return entry.label;
	} else {
		return "";
	}

}