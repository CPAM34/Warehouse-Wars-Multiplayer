/* What about serving up static content, kind of like apache? */

var express = require('express');
var bodyparser = require('body-parser');
var bcrypt = require('bcrypt');
var salt = 10;
var app = express();
var userfilename = "userInfo.txt";
var scorefilename = "scores.txt";
var users = {};
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

//each user has a document
var collectionUsers;
var collectionScores;

MongoClient.connect('mongodb://pervanch:80746@mcsdb.utm.utoronto.ca/pervanch_309', function(err, db) {
    if (err) {
        console.error(err);
    }
	else {
		collectionUsers = db.collection('users');
		collectionScores = db.collection('scores');
	}
});

// static_files has all of statically returned content
// https://expressjs.com/en/starter/static-files.html
app.use('/',express.static('static_files')); // this directory has files to be returned

// parse application/json
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.listen(10690, function () {
  console.log('Example app listening on port 10690!');
});


/* REST API */

app.get('/player', function(req, res) {
	if ((typeof req.query.user != 'undefined') && (typeof req.query.pass != 'undefined')) {
		user = req.query.user;
		pass = req.query.pass;
		collectionUsers.find({"username" : user}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				if (bcrypt.compareSync(pass, result[0].password)) {
					result[0].timesPlayed++;
					dt = new Date();
					result[0].lastLogin = dt.toUTCString();
					collectionUsers.update({"username" : user}, result[0]);
					result[0].password = req.query.pass;
					res.setHeader('Content-Type', 'application/json');
					res.status(200).send(JSON.stringify(result[0]));
				}
				else {
					return res.status(404).send('Password Not Found');
				}
			}
			else {
				return res.status(404).send('User Not Found');
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});

app.get('/topscores', function(req, res) {
	collectionScores.find().sort({"score" : -1, "date" : 1}).toArray(function (err, result) {
		top10 = 0;
		if (err) {
			console.log(err);
			return res.status(500).send('MongoDB database server error');
		}
		else if (result.length) {
			s = "<table class='scoretable'>";
			s += "<tr><td>Name</td><td>Score</td><td>Date</td></tr>";
			for (i=0; (i < result.length) && (top10 < 10); i++, top10++) {
				names = result[i].username;
				for (j = i+1; (j < result.length) && (result[i].date == result[j].date); j++) {
					names += ", " + result[j].username;
					i = j;
				}
				s += "<tr><td>" + names + "</td><td>" + result[i].score + "</td><td>" + result[i].date + "</td></tr>";
			}
			s += "</table>";
			res.status(200).send(s);
		}
		else {
			res.status(200).send("There are no scores yet");
		}
	});
});

app.get('/userscores', function(req, res) {
	if (typeof req.query.user != 'undefined') {
		collectionScores.find({"username" : req.query.user}).sort({"score" : -1}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				s = "<table class='scoretable'>";
				s += "<tr><td>Score</td><td>Date</td></tr>";
				for (i=0; i < result.length; i++) {
					s += "<tr><td>" + result[i].score + "</td><td>" + result[i].date + "</td></tr>";
				}
				s += "</table>";
				res.status(200).send(s);
			}
			else {
				res.status(200).send("There are no scores yet");
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});

app.post('/player', function(req, res) {
	if ((typeof req.body.user != 'undefined') && (typeof req.body.pass != 'undefined') && (typeof req.body.email != 'undefined') && (typeof req.body.firstname != 'undefined') && (typeof req.body.lastname != 'undefined')) {
		user = req.body.user;
		// 	if  db.mdb.find( { user_name: user } ) == 1
		collectionUsers.find({"username" : user}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				return res.status(405).send('Access Forbidden');
			}
			else {
				insquery = {};
				insquery.username = req.body.user;
				insquery.password = bcrypt.hashSync(req.body.pass, salt);
				insquery.email = req.body.email;
				insquery.firstname = req.body.firstname;
				insquery.lastname = req.body.lastname;
				insquery.timesPlayed = 1;
				insquery.wins = 0;
				insquery.losses = 0;
				dt = new Date();
				insquery.lastLogin = dt.toUTCString();
				collectionUsers.insert(insquery);
				insquery.password = req.body.pass;
				res.setHeader('Content-Type', 'application/json');
				res.status(201).send(JSON.stringify(insquery));
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});

app.put('/player', function(req, res) {
	if ((typeof req.body.current != 'undefined') && (typeof req.body.user != 'undefined') && (typeof req.body.pass != 'undefined') && (typeof req.body.email != 'undefined') && (typeof req.body.firstname != 'undefined') && (typeof req.body.lastname != 'undefined')) {
		user = req.body.user;
		collectionUsers.find({"username" : req.body.current}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				if ((req.body.current != req.body.user)) {
					collectionUsers.find({"username" : user}).toArray(function (err, result2) {
						if (err) {
							console.log(err);
							return res.status(500).send('MongoDB database server error');
						}
						else if (result2.length) {
							return res.status(405).send('User Already Exists');
						}
						else {
							updquery = {};
							updquery.username = req.body.user;
							updquery.password = bcrypt.hashSync(req.body.pass, salt);
							updquery.email = req.body.email;
							updquery.firstname = req.body.firstname;
							updquery.lastname = req.body.lastname;
							updquery.timesPlayed = result[0].timesPlayed++;
							updquery.wins = result[0].wins;
							updquery.losses = result[0].losses;
							dt = new Date();
							updquery.lastLogin = dt.toUTCString();
							collectionUsers.update({"username" : req.body.current}, updquery);
							collectionScores.updateMany({"username" : req.body.current}, {$set : {"username" : req.body.user}});
							updquery.password = req.body.pass;
							res.setHeader('Content-Type', 'application/json');
							res.status(200).send(JSON.stringify(updquery));
						}
					});
				}
				else {
					updquery = {};
					updquery.username = req.body.user;
					updquery.password = bcrypt.hashSync(req.body.pass, salt);
					updquery.email = req.body.email;
					updquery.firstname = req.body.firstname;
					updquery.lastname = req.body.lastname;
					updquery.timesPlayed = result[0].timesPlayed++;
					updquery.wins = result[0].wins;
					updquery.losses = result[0].losses;
					dt = new Date();
					updquery.lastLogin = dt.toUTCString();
					collectionUsers.update({"username" : req.body.user}, updquery);
					res.setHeader('Content-Type', 'application/json');
					res.status(200).send(JSON.stringify(updquery));
				}
			}
			else {
				return res.status(404).send('Not Found');
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});

app.put('/score', function (req, res) {
	if ((typeof req.body.user != 'undefined') && (typeof req.body.score != 'undefined') && (typeof req.body.date != 'undefined')) {
		user = req.body.user;
		collectionUsers.find({"username" : req.body.user}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				if (req.body.score == "L") {
					result[0].losses++;
				}
				else {
					result[0].wins++;
					collectionScores.insert({"username" : req.body.user, "score" : req.body.score, "date" : req.body.date});
				}
				collectionUsers.update({"username" : user}, result[0]);
				res.status(200).send("OK");
			}
			else {
				return res.status(404).send('Not Found');
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});

app.put('/newgame', function (req, res) {
	if (typeof req.body.user != 'undefined') {
		user = req.body.user;
		collectionUsers.find({"username" : req.body.user}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				result[0].timesPlayed++;
				collectionUsers.update({"username" : user}, result[0]);
				res.status(200).send("OK");
			}
			else {
				return res.status(404).send('Not Found');
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});

app.delete('/player', function(req, res) {
	if (typeof req.body.user != 'undefined') {
		collectionUsers.find({"username" : req.body.user}).toArray(function (err, result) {
			if (err) {
				console.log(err);
				return res.status(500).send('MongoDB database server error');
			}
			else if (result.length) {
				try {
					collectionUsers.deleteOne({"username" : req.body.user});
					collectionScores.deleteMany({"username" : req.body.user});
					res.status(200).send("User Deleted");
				}
				catch (e) {
					return res.status(500).send('MongoDB database server error');
				}
			}
			else {
				return res.status(404).send('Not Found');
			}
		});
	}
	else {
		return res.status(400).send("Bad Request");
	}
});
