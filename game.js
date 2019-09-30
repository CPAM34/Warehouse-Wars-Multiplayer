const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({port: 10691});

var messages=[];
var world = {};
world['users'] = {};
world['state'] = null;
var worlds = {};
var timeoutID;

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function(message){
	dt = new Date();
	date = dt.toUTCString();
	if (message == "W") {
		for (var user in world['users']) {
			try {
				world['users'][user][0].send(JSON.stringify({"status" : "W", "score" : world['state'].score, "date" : date}));
				delete world['users'][user];
				world['users'] = JSON.parse(JSON.stringify(world['users']));
			}
			catch (e) {
			}
		}
		clearInterval(timeoutID);
	}
	else if (message[0] == "chat") {
		for (var user in world['users']) {
			try {
				world['users'][user][0].send(JSON.stringify({"status" : "log", "msg" : date + " - <b>" + message[1] + " says:</b> " + message[2]}));
			}
			catch (e) {
				onDisconnect(world['users'][user][0]);
			}
		}
	}
	else if (message.length == 2) {
		world['state'] = message[1];
		for (var user in world['users']) {
			if ((typeof world['state'].getPlayer(user) != "undefined")) {
				var player = world['state'].getPlayer(user);
				var toSend = world['state'].array;
				var score = world['state'].score;
				var health = player.health;
				try {
					world['users'][user][0].send(JSON.stringify({"status" : "game", "game": toSend, "score" : score, "health" : health, "coordinates" : [player.location[0],player.location[1]]}));
					if (message[0] == "monsterkilled") {
						world['users'][user][0].send(JSON.stringify({"status" : "log", "sound" : "./sounds/monsterdeath.wav", "msg" : date + " - Monster Killed"}));
					}
					else if (message[0] == "monstermove") {
						world['users'][user][0].send(JSON.stringify({"status" : "sound", "sound" : "./sounds/monsterstep.wav"}));
					}
				}
				catch (e) {
					onDisconnect(world['users'][user][0]);
				}
			}
		}
	}
	else if (message.length == 3) {
		world['state'] = message[2];
		for (var user in world['users']) {
			if (typeof world['state'].getPlayer(user) != "undefined") {
				var player = world['state'].getPlayer(user);
				var toSend = world['state'].array;
				var score = world['state'].score;
				var health = player.health;
				try {
					world['users'][user][0].send(JSON.stringify({"status" : "game", "game": toSend, "score" : score, "health" : health, "coordinates" : [player.location[0],player.location[1]]}));
					if (message[0] == "playerkilled") {
						world['users'][user][0].send(JSON.stringify({"status" : "log", "sound" : "./sounds/playerdeath.wav" , "msg" : date + " - " + message[1] + " has been killed!"}));
					}
					else if (message[0] == "playerhit") {
						world['users'][user][0].send(JSON.stringify({"status" : "log", "sound" : "./sounds/playerhit.wav", "msg" : date + " - " + message[1] + " has been hit! He has " + world['state'].getPlayer(message[1]).health + " health points left."}));
					}
					else if (message[0] == "playerjoined") {
						world['users'][user][0].send(JSON.stringify({"status" : "log", "sound" : "./sounds/newplayer.wav", "msg" : date + " - " + message[1] + " has joined the game!"}));
					}
					else if (message[0] == "playerleft") {
						world['users'][user][0].send(JSON.stringify({"status" : "log", "sound" : "./sounds/playerdeath.wav", "msg" : date + " - " + message[1] + " has left the game!"}));
					}
					else if (message[0] == "playermove") {
						world['users'][user][0].send(JSON.stringify({"status" : "sound", "sound" : "./sounds/playerstep.wav"}));
					}
				}
				catch (e) {
					onDisconnect(world['users'][user][0]);
				}
			}
		}
	}

	// Alternatively
	// this.clients.forEach(function (ws){ ws.send(message); });
}

wss.on('connection', function(ws) {
	
	ws.on('message', function(rawMessage) {
		if (rawMessage == "__pong__") {
			clearTimeout(world['users'][userOfSocket(ws)][2]);
		}
		else {
			var message = JSON.parse(rawMessage);
			if (message.status == "newPlayer") {
				setupGame({"name" : message.msg["name"], "socket" : ws});
			}
			if (message.status == "loginSuccess") {
				onLoginSuccess(message.msg);
			}
			if (message.status == "regUpdSuccess") {
				onRegUpdSuccess(message.msg);
			}
			if (message.status == "delSuccess") {
				onDelSuccess(message.msg);
			}
			if (message.status == "modify" || message.status == "logoutSuccess" || message.status == "closed") {
				onLeaveGame(message.msg);
			}
			if (message.status == "move") {
				onMove(message.msg);
			}
			if (message.status == "chat") {
				wss.broadcast([message.status, message.sender, message.msg]);
			}
		}
	});
});

function userOfSocket(ws) {
	for (user in world['users']) {
		if (world['users'].hasOwnProperty(user)) {
			if (world['users'][user][0] == ws) {
				return user;
			}
		}
	}
	return null;
}

function setupGame(user) {
	if (Object.keys(world['users']).length == 0) {
		world['users'][user.name] = [user.socket, setInterval(ping, 35000, user.socket), null];
		world['state'] = new Stage(20,20,"stage");
		world['state'].initialize(user.name);
		var func = world['state'].step;
		timeoutID = setInterval(func, 1500, world['state']);
		dt = new Date();
		console.log(dt.toUTCString() + ": New game initialized by " + user.name + "!");
		wss.broadcast(["playerjoined", user.name, world['state']]);
	} else {
		onEnterGame(user);
	}
};

function ping(ws) {
	user = userOfSocket(ws);
	if (user != null) {
		try {
			ws.send("__ping__");
			world['users'][user][2] = setTimeout(function () {
				onDisconnect(ws);
			}, 30000);
		}
		catch (e) {
			onDisconnect(ws);
		}
	}
};

function onLoginSuccess(user) {
	dt = new Date();
	console.log(dt.toUTCString() + ": " + user.name + " has logged in!");
};

function onRegUpdSuccess(user) {
	dt = new Date();
	console.log(dt.toUTCString() + ": Welcome (back), " + user.name + "!");
};

function onDelSuccess(user) {
	dt = new Date();
	console.log(dt.toUTCString() + ": " + user.name + " has deleted his account!");
};

function onEnterGame(user) {
	world['state'].addPlayer(user.name);
	world['users'][user.name] = [user.socket, setInterval(ping, 35000, user.socket), null];
	dt = new Date();
	console.log(dt.toUTCString() + ": " + user.name + " has joined!");
	wss.broadcast(["playerjoined", user.name, world['state']]);
}

function onLeaveGame(user) {
	world['state'].removePlayer(user.name);
	dt = new Date();
	console.log(dt.toUTCString() + ": " + user.name + " has left the game!");
	if (Object.keys(world['users']).length == 0) {
		clearInterval(timeoutID);
	}
	wss.broadcast(["playerleft", user.name, world['state']]);
};

function onDisconnect(ws) {
	user = userOfSocket(ws);
	if (user != null) {
		world['state'].removePlayer(user);
		dt = new Date();
		console.log(dt.toUTCString() + ": " + user + " has disconnected!");
		wss.broadcast(["playerleft", user, world['state']]);
	}
};

function onMove(user) {
	try {
		world['state'].getPlayer(user.name).move(user.direction);
	}
	catch (e) {
		console.log(e);
	}
};

// Stage class
function Stage(width, height, stageElementID){
	this.actors=[]; // all actors on this stage (monsters, player, boxes, ...)
	this.players={}; // a special actor, the player
	this.score=1000000;
	this.monsters=0;
	this.array= new Array(20);
	for (i=0; i<20; i++) {
		this.array[i] = new Array(20);
	}

	// the logical width and height of the stage
	this.width=width;
	this.height=height;

	// the element containing the visual representation of the stage
	this.stageElementID=stageElementID;

	// take a look at the value of these to understand why we capture them this way
	// an alternative would be to use 'new Image()'
	this.blankImageSrc="icons/blank.gif";
	this.monsterImageSrc="icons/face-devil-grin-24.png";
	this.playerImageSrc="icons/face-cool-24.png";
	this.boxImageSrc="icons/emblem-package-2-24.png";
	this.wallImageSrc="icons/wall.jpeg";

}

// initialize an instance of the game
Stage.prototype.initialize=function(name){

	// Create a table of blank images, give each image an ID so we can reference it later
	// var s="<table class = 'stage'>";
	// YOUR CODE GOES HERE
	for (var i = 0; i < 20; i++){
		// s += '<tr>';

		for (var k = 0; k < 20; k ++){
			// s += "<td id = " + "'" + i + "_" + k + "'" + ">" + "<img src='icons/blank.gif' height = '30' width = '30'>" + "</td>";
			this.array[i][k] = "icons/blank.gif";
		}

		// s += '</tr>';
	}
	// s+="</table>";

	// Put it in the stageElementID (innerHTML)
	// document.getElementById(this.stageElementID).innerHTML = s;

	// Add the player to the center of the stage
	var player = new Player(9, 9, this, name);
	this.players[name] = player;
	this.actors[0] = player;
	// document.getElementById("9_9").innerHTML = "<img src='icons/face-cool-24.png' height = '30' width = '30'>";
	this.array[9][9] = "icons/face-cool-24.png";
	// Add walls around the outside of the stage, so actors can't leave the stage
	for (var i = 0; i < 20; i++){
		/*document.getElementById("0_" + i).innerHTML = "<img src='icons/wall.jpeg' height = '30' width = '30'>"; //first row 
		document.getElementById("19_" + i).innerHTML = "<img src='icons/wall.jpeg' height = '30' width = '30'>"; // last row
		document.getElementById(i + "_0").innerHTML = "<img src='icons/wall.jpeg' height = '30' width = '30'>"; // first column
		document.getElementById(i + "_19").innerHTML = "<img src='icons/wall.jpeg' height = '30' width = '30'>"; */ // last column
		this.array[0][i] = "icons/wall.jpeg";
		this.array[19][i] = "icons/wall.jpeg";
		this.array[i][0] = "icons/wall.jpeg";
		this.array[i][19] = "icons/wall.jpeg";

		var f_row = new Wall(0, i); // Creating wall actors (objects)
		var l_row = new Wall(19, i);
		var f_col = new Wall(i, 0);
		var l_col = new Wall(i, 19);

		this.addActor(f_row); // Adding actors to stage.actors
		this.addActor(l_row);
		this.addActor(f_col);
		this.addActor(l_col);
	}

	// Add in some Monsters
	for (var i = 2; i < 19; i+=5){
		// document.getElementById("4_" + i).innerHTML = "<img src='icons/face-devil-grin-24.png' height = '30' width = '30'>";
		if (this.getActor(4, i) == null) {
			this.array[4][i] = "icons/face-devil-grin-24.png";
			var monster = new Monster(4, i, this);
			this.addActor(monster);
			this.monsters++;
		}
		if (this.getActor(12, i+1) == null) {
			// document.getElementById("12_" + (i+1)).innerHTML = "<img src='icons/face-devil-grin-24.png' height = '30' width = '30'>";
			this.array[12][i+1] = "icons/face-devil-grin-24.png";
			var monster = new Monster(12, i+1, this);
			this.addActor(monster);
			this.monsters++;
		}
	}

	// Add some Boxes to the stage
	for (var i = 0; i < 19; i++){
		for (var k = 0; k < 19; k++){
			var x = Math.floor(Math.random() * 3) + 1;
			if (x < 2){
				if (this.getActor(i, k) == null){
					// document.getElementById(i + '_' + k).innerHTML = "<img src='icons/emblem-package-2-24.png' height = '30' width = '30'>";
					this.array[i][k] = "icons/emblem-package-2-24.png";
					var box = new Box(i, k);
					this.addActor(box);
				}
			}
		}
	}
}
// Return the ID of a particular image, useful so we don't have to continually reconstruct IDs
Stage.prototype.getStageId=function(x,y){ 
	return this.array[x][y]; 
}

Stage.prototype.addActor=function(actor){
	this.actors.push(actor);
}

Stage.prototype.removeActor=function(actor){
	this.setImage(actor.location[0], actor.location[1], this.blankImageSrc); // set image of actor location to blank
	this.array[actor.location[0]][actor.location[1]] = this.blankImageSrc;
	// Lookup javascript array manipulation (indexOf and splice).
	this.actors.splice(this.actors.indexOf(actor),1); // remove actor from stage.actors
}

// Set the src of the image at stage location (x,y) to src
Stage.prototype.setImage=function(x, y, src){
	this.array[x][y] = src;

}

// Take one step in the animation of the game.  
Stage.prototype.step=function(stage){

	if(stage.playerWin() == false){
		stage.score -= (500 + 15*stage.monsters);
		for(var i=1;i<stage.actors.length;i++){
			// each actor takes a single step in the game
			if (stage.actors[i].src == stage.monsterImageSrc){
				stage.actors[i].move();
			}
		}
		wss.broadcast(["monstermove", stage]);
	}
};

// return the first actor at coordinates (x,y) return null if there is no such actor
// there should be only one actor at (x,y)!
Stage.prototype.getActor=function(x, y){

	if (this.array[x][y] == "icons/blank.gif"){
		return null;
	} else {
		for (var i = 0; i < this.actors.length; i++){ // iterate over all actors and check for x,y coordinates
			if (this.actors[i].location[0] == x && this.actors[i].location[1] == y){
				return this.actors[i];
			}
		}
	}
};

// checks if the player has won by getting rid of all monsters.
Stage.prototype.playerWin = function(){
	for (var i = 0; i < this.actors.length; i++){
		if (this.actors[i].src == this.monsterImageSrc){
			return false;
		}
	}
	return true;
};

// Reset game after win or loss
Stage.prototype.resetGame = function(result){
	wss.broadcast(result);
};

Stage.prototype.addPlayer = function(name){
	i = Math.floor(Math.random() * 20);
	j = Math.floor(Math.random() * 20);
	while (this.getActor(i, j) != null) {
		i = Math.floor(Math.random() * 20);
		j = Math.floor(Math.random() * 20);
	}
	player = new Player(i, j, this, name);
	this.players[name] = player;
	this.actors.push(player);
	// document.getElementById("9_9").innerHTML = "<img src='icons/face-cool-24.png' height = '30' width = '30'>";
	this.array[i][j] = "icons/face-cool-24.png";
};

Stage.prototype.removePlayer = function(name) {
	try {
		clearInterval(world['users'][name][1]);
		this.removeActor(this.players[name]);
		delete this.players[name];
		this.players = JSON.parse(JSON.stringify(this.players));
		delete world['users'][name];
		world['users'] = JSON.parse(JSON.stringify(world['users']));
	}
	catch (e) {
		console.log(e);
	}
};

Stage.prototype.getPlayer = function(name) {
	return this.players[name];
};


function Player(x,y,stage,name){
	this.name = name;
	this.stage = stage; // for moving
	this.location = [x,y]; // location in stage
	this.health = 3; // arbitrary value for health
	this.src = "icons/face-cool-24.png";

}

// Move player according to button press. 
Player.prototype.move = function(direction){
	
	this.stage.score -= 225;

	if (direction == 'north_west'){ // move north-west

		this.monsterCollision(this.location[0]-1, this.location[1]-1);
		this.boxPush(this.location[0]-1, this.location[1]-1, 'north_west');

		if (this.stage.getActor(this.location[0]-1, this.location[1]-1) == null){
			this.stage.setImage(this.location[0]-1, this.location[1]-1, this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] -= 1;
			this.location[1] -= 1;
		} else if (this.stage.getActor(this.location[0]-1, this.location[1]-1).src = this.stage.boxImageSrc){

		}

	} else if (direction == 'north'){ // move north

		this.monsterCollision(this.location[0]-1, this.location[1]);
		this.boxPush(this.location[0]-1, this.location[1], 'north');

		if (this.stage.getActor(this.location[0]-1, this.location[1]) == null){
			this.stage.setImage(this.location[0]-1, this.location[1], this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] -= 1;
		}

	} else if (direction == 'north_east'){ // move north-east

		this.monsterCollision(this.location[0]-1, this.location[1]+1);
		this.boxPush(this.location[0]-1, this.location[1]+1, 'north_east');

		if (this.stage.getActor(this.location[0]-1, this.location[1]+1) == null){
			this.stage.setImage(this.location[0]-1, this.location[1]+1, this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] -= 1;
			this.location[1] += 1;
		}

	} else if (direction == 'west'){ // move west

		this.monsterCollision(this.location[0], this.location[1]-1);
		this.boxPush(this.location[0], this.location[1]-1, 'west');

		if (this.stage.getActor(this.location[0], this.location[1]-1) == null){
			this.stage.setImage(this.location[0], this.location[1]-1, this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[1] -= 1;
		}

	} else if (direction == 'east'){ // move east

		this.monsterCollision(this.location[0], this.location[1]+1);
		this.boxPush(this.location[0], this.location[1]+1, 'east');

		if (this.stage.getActor(this.location[0], this.location[1]+1) == null){
			this.stage.setImage(this.location[0], this.location[1]+1, this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[1] += 1;
		}

	} else if (direction == 'south_west'){ // move south-west

		this.monsterCollision(this.location[0]+1, this.location[1]-1);
		this.boxPush(this.location[0]+1, this.location[1]-1, 'south_west');

		if (this.stage.getActor(this.location[0]+1, this.location[1]-1) == null){
			this.stage.setImage(this.location[0]+1, this.location[1]-1, this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] += 1;
			this.location[1] -= 1;
		}

	} else if (direction == 'south'){ // move south

		this.monsterCollision(this.location[0]+1, this.location[1]);
		this.boxPush(this.location[0]+1, this.location[1], 'south');

		if (this.stage.getActor(this.location[0]+1, this.location[1]) == null){
			this.stage.setImage(this.location[0]+1, this.location[1], this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] += 1;
		}

	} else if (direction == 'south_east'){ // move south-east

		this.monsterCollision(this.location[0]+1, this.location[1]+1);
		this.boxPush(this.location[0]+1, this.location[1]+1, 'south_east');

		if (this.stage.getActor(this.location[0]+1, this.location[1]+1) == null){
			this.stage.setImage(this.location[0]+1, this.location[1]+1, this.stage.playerImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] += 1;
			this.location[1] += 1;
		}
	}
	wss.broadcast(["playermove", this.name, this.stage]);
}

Player.prototype.monsterCollision = function(dest1, dest2){
	if (this.stage.getActor(dest1, dest2) != null){
		if (this.stage.getActor(dest1, dest2).src == "icons/face-devil-grin-24.png"){
			if (this.health == 1){
				// document.getElementById("player_health").innerHTML = "Player Health = 0";
				/*$.ajax({
					method: "PUT",
					url: "api/api.php",
					data: {"user" : current_user, "score" : "L"},
					dataType: "text"
				});*/
				world['users'][player.name][0].send("L");
				world['state'].removePlayer(this.name);
				wss.broadcast(["playerkilled", this.name, this.stage]);
			} else {
				this.stage.getPlayer(this.name).health -= 1;
				// document.getElementById("player_health").innerHTML = "Player Health = " + this.health;
				wss.broadcast(["playerhit", this.name, this.stage]);
				/*this.stage.setImage(this.stage.player.location[0], this.stage.player.location[1], this.stage.blankImageSrc);
				wss.broadcast(["flicker", this.stage]);
				window.setTimeout(function(){ // player image blinks to show damage taken
					this.stage.setImage(this.stage.player.location[0], this.stage.player.location[1], this.stage.playerImageSrc);
					wss.broadcast(["flicker", this.stage]);
				}, 200);*/
			}
		}
	}
};

Player.prototype.boxPush = function(dest1, dest2, direction){ // Function to push boxes when player collides with them

	if (this.stage.getActor(dest1, dest2) != null){

		if (this.stage.getActor(dest1, dest2).src == "icons/emblem-package-2-24.png"){
			var box_list = [];

			if (direction == 'north'){

				if (this.stage.getActor(dest1-1, dest2) == null){ // if there's an empty space after the box

					this.stage.setImage(dest1-1, dest2, this.stage.boxImageSrc); // move box image
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc); // move player image
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
					this.stage.getActor(dest1, dest2).location = [dest1-1, dest2]; // change location of box
					this.location[0] = dest1; // change location of player
					this.location[1] = dest2;

				} else if (this.stage.getActor(dest1-1, dest2).src == this.stage.boxImageSrc){ // if there's another box after the box
					var x = dest1;

					while (this.stage.getActor(x,dest2) != null && this.stage.getActor(x,dest2).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(x,dest2));
						x--;
						if (this.stage.getActor(x, dest2) != null && this.stage.getActor(x, dest2).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(x, dest2, this.stage.boxImageSrc); // move box image
							this.stage.setImage(x+1, dest2, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [x, dest2]; // change location of box
							x++;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(x,dest2, this.stage.playerImageSrc); // move player image
						this.location[0] = x; // change location of player
						this.location[1] = dest2;
					}

				}
				
			} else if (direction == 'north_east'){

				if (this.stage.getActor(dest1-1, dest2+1) == null){
					this.stage.setImage(dest1-1, dest2+1, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1-1, dest2+1];
					this.location[0] = dest1;
					this.location[1] = dest2;
				} else if (this.stage.getActor(dest1-1, dest2+1).src == this.stage.boxImageSrc) {
					var x = dest1;
					var y = dest2;

					while (this.stage.getActor(x,y) != null && this.stage.getActor(x,y).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(x,y));
						x--;
						y++;
						if (this.stage.getActor(x, y) != null && this.stage.getActor(x, y).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(x, y, this.stage.boxImageSrc); // move box image
							this.stage.setImage(x+1, y-1, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [x, y]; // change location of box
							x++;
							y--;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(x,y, this.stage.playerImageSrc); // move player image
						this.location[0] = x;
						this.location[1] = y;
					}

				}

			} else if (direction == 'north_west'){

				if (this.stage.getActor(dest1-1, dest2-1) == null){

					this.stage.setImage(dest1-1, dest2-1, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1-1, dest2-1];
					this.location[0] = dest1;
					this.location[1] = dest2;

				} else if (this.stage.getActor(dest1-1, dest2-1).src == this.stage.boxImageSrc) {
					var x = dest1;
					var y = dest2;

					while (this.stage.getActor(x,y) != null && this.stage.getActor(x,y).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(x,y));
						x--;
						y--;
						if (this.stage.getActor(x, y) != null && this.stage.getActor(x, y).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(x, y, this.stage.boxImageSrc); // move box image
							this.stage.setImage(x+1, y+1, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [x, y]; // change location of box
							x++;
							y++;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(x,y, this.stage.playerImageSrc); // move player image
						this.location[0] = x;
						this.location[1] = y;
					}

				}

			} else if (direction == 'west'){

				if (this.stage.getActor(dest1, dest2-1) == null){

					this.stage.setImage(dest1, dest2-1, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1, dest2-1];
					this.location[0] = dest1;
					this.location[1] = dest2;

				} else if (this.stage.getActor(dest1, dest2-1).src == this.stage.boxImageSrc) {
					var y = dest2;

					while (this.stage.getActor(dest1,y) != null && this.stage.getActor(dest1,y).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(dest1,y));
						y--;
						if (this.stage.getActor(dest1, y) != null && this.stage.getActor(dest1, y).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(dest1, y, this.stage.boxImageSrc); // move box image
							this.stage.setImage(dest1, y+1, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [dest1, y]; // change location of box
							y++;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(dest1,y, this.stage.playerImageSrc); // move player image
						this.location[0] = dest1;
						this.location[1] = y;
					}

				}

			} else if (direction == 'east'){

				if (this.stage.getActor(dest1, dest2+1) == null){

					this.stage.setImage(dest1, dest2+1, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1, dest2+1];
					this.location[0] = dest1;
					this.location[1] = dest2;
				
				} else if (this.stage.getActor(dest1, dest2+1).src == this.stage.boxImageSrc) {
					var y = dest2;

					while (this.stage.getActor(dest1,y) != null && this.stage.getActor(dest1,y).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(dest1,y));
						y++;
						if (this.stage.getActor(dest1, y) != null && this.stage.getActor(dest1, y).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(dest1, y, this.stage.boxImageSrc); // move box image
							this.stage.setImage(dest1, y-1, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [dest1, y]; // change location of box
							y--;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(dest1,y, this.stage.playerImageSrc); // move player image
						this.location[0] = dest1;
						this.location[1] = y;
					}

				}

			} else if (direction == 'south'){

				if (this.stage.getActor(dest1+1, dest2) == null){

					this.stage.setImage(dest1+1, dest2, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1+1, dest2];
					this.location[0] = dest1;
					this.location[1] = dest2;
				
				} else if (this.stage.getActor(dest1+1, dest2).src == this.stage.boxImageSrc) {
					var x = dest1;

					while (this.stage.getActor(x,dest2) != null && this.stage.getActor(x,dest2).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(x,dest2));
						x++;
						if (this.stage.getActor(x, dest2) != null && this.stage.getActor(x, dest2).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(x, dest2, this.stage.boxImageSrc); // move box image
							this.stage.setImage(x-1, dest2, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [x, dest2]; // change location of box
							x--;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(x,dest2, this.stage.playerImageSrc); // move player image
						this.location[0] = x;
						this.location[1] = dest2;
					}

				}

			} else if (direction == 'south_east'){

				if (this.stage.getActor(dest1+1, dest2+1) == null){

					this.stage.setImage(dest1+1, dest2+1, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1+1, dest2+1];
					this.location[0] = dest1;
					this.location[1] = dest2;
				
				} else if (this.stage.getActor(dest1+1, dest2+1).src == this.stage.boxImageSrc) {
					var x = dest1;
					var y = dest2;

					while (this.stage.getActor(x,y) != null && this.stage.getActor(x,y).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(x,y));
						x++;
						y++;
						if (this.stage.getActor(x, y) != null && this.stage.getActor(x, y).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(x, y, this.stage.boxImageSrc); // move box image
							this.stage.setImage(x-1, y-1, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [x, y]; // change location of box
							x--;
							y--;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(x,y, this.stage.playerImageSrc); // move player image
						this.location[0] = x;
						this.location[1] = y;
					}

				}

			} else if (direction == 'south_west'){

				if (this.stage.getActor(dest1+1, dest2-1) == null){

					this.stage.setImage(dest1+1, dest2-1, this.stage.boxImageSrc);
					this.stage.setImage(dest1,dest2, this.stage.playerImageSrc);
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
					this.stage.getActor(dest1, dest2).location = [dest1+1, dest2-1];
					this.location[0] = dest1;
					this.location[1] = dest2;
				
				} else if (this.stage.getActor(dest1+1, dest2-1).src == this.stage.boxImageSrc) {
					var x = dest1;
					var y = dest2;

					while (this.stage.getActor(x,y) != null && this.stage.getActor(x,y).src == this.stage.boxImageSrc){
						box_list.push(this.stage.getActor(x,y));
						x++;
						y--;
						if (this.stage.getActor(x, y) != null && this.stage.getActor(x, y).src != this.stage.boxImageSrc){
							box_list = [];
							break;
						}
					}

					if (box_list.length > 0){
						
						for (var i = box_list.length-1; i > -1; i--){
							this.stage.setImage(x, y, this.stage.boxImageSrc); // move box image
							this.stage.setImage(x-1, y+1, this.stage.blankImageSrc); // remove box image from original location
							box_list[i].location = [x, y]; // change location of box
							x--;
							y++;
						}

						this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // remove player image from original location
						this.stage.setImage(x,y, this.stage.playerImageSrc); // move player image
						this.location[0] = x;
						this.location[1] = y;
					}
				}
			}
		}
	}
};

// Monster class

function Monster(x, y, stage){
	this.location = [x,y]; // location in stage
	this.stage = stage; // for moving purposes 
	this.direction = 'forward'; // switching direction of movement
	this.src = "icons/face-devil-grin-24.png";
	this.intelligence= Math.floor(Math.random()*10);
	this.count = 0;
}

// Check if monster is surrounded.
Monster.prototype.surrounded = function(){
	if (this.stage.getActor(this.location[0]+1, this.location[1]) != null){ // bottom
		if (this.stage.getActor(this.location[0]-1, this.location[1]) != null){ // top
			if (this.stage.getActor(this.location[0], this.location[1]+1) != null){ // right
				if (this.stage.getActor(this.location[0], this.location[1]-1) != null){ // left
					if (this.stage.getActor(this.location[0]+1, this.location[1]-1) != null){ // bottom left
						if (this.stage.getActor(this.location[0]+1, this.location[1]+1) != null){ // bottom right
							if (this.stage.getActor(this.location[0]-1, this.location[1]-1) != null){ // top left
								if (this.stage.getActor(this.location[0]-1, this.location[1]+1) != null){ // top right
									return true;
								}
							}
						}
					}	
				} 
			}
		}
	}
	return false;
};

// Remove monster from the stage.
Monster.prototype.remove = function(){
	this.stage.removeActor(this);
	this.src="icons/face-devil-grin-24.png";
	this.stage.monsters-=1;
	if (this.stage.monsters==0) {
		/*$.ajax({
			method: "PUT",
			url: "api/api.php",
			data: {"user" : current_user, "score" : this.stage.score},
			dataType: "text"
		});*/
		this.stage.resetGame("W");
	}
	else {
		wss.broadcast(["monsterkilled", this.stage]);
	}
};

Monster.prototype.playerCollision = function(dest1, dest2){
	if (this.stage.getActor(dest1, dest2) != null){
		if (this.stage.getActor(dest1, dest2).src == this.stage.playerImageSrc){
			player = this.stage.getActor(dest1, dest2);
			name = player.name;
			if (player.health == 1){
				// document.getElementById("player_health").innerHTML = "Player Health = 0";
				world['users'][player.name][0].send("L");
				world['state'].removePlayer(player.name);
				wss.broadcast(["playerkilled", player.name, this.stage]);
			} else {
				this.stage.getActor(dest1, dest2).health -= 1;
				wss.broadcast(["playerhit", player.name, this.stage]);
				/*this.stage.setImage(this.stage.player.location[0], this.stage.player.location[1], this.stage.blankImageSrc);
				wss.broadcast(["flicker", this.stage]);
				window.setTimeout(function(){ // player image blinks to show damage taken
					this.stage.setImage(this.stage.player.location[0], this.stage.player.location[1], this.stage.playerImageSrc);
					wss.broadcast(["flicker", this.stage]);
				}, 200);*/
				// document.getElementById("player_health").innerHTML = "Player Health = " + this.stage.player.health;
			}
		}
	}
};

// Move monster diagonally from left to right (according to example). 
Monster.prototype.move = function(){

	if (this.surrounded()){ //remove monster if surrounded
		this.remove();
	}

	if (this.direction == 'forward'){

		if (this.stage.getActor(this.location[0]+1, this.location[1]+1) == null){ // check bottom right
			this.stage.setImage(this.location[0]+1, this.location[1]+1, this.stage.monsterImageSrc); // set new position image to monster
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // set original position image to empty
			this.location[0] += 1; // change position to new position
			this.location[1] += 1;
		} else {
			this.playerCollision(this.location[0]+1, this.location[1]+1);
			// 1st intelligent monster - after getting turned around 5 times, it teleports
			if (this.intelligence > 8) {
				this.count++;
				if (this.count == 5) {
					this,count = 0;
					coord = [Math.floor(Math.random()*19)+1,Math.floor(Math.random()*19)+1];
					while (this.stage.getActor(coord[0], coord[1]) != null) {
						coord = [Math.floor(Math.random()*19)+1,Math.floor(Math.random()*19)+1];
					}
					this.stage.setImage(coord[0], coord[1], this.stage.monsterImageSrc); // set new position image to monster
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // set original position image to empty
					this.location[0] = coord[0]; // change position to new position
					this.location[1] = coord[1];
				}
			}
			// 2nd intelligent monster - sidesteps an object when stuck before turning back around
			else if (this.intelligence > 5) {
				coord = [Math.floor(Math.random()*3)-1,Math.floor(Math.random()*3)-1];
				while (this.stage.getActor(this.location[0]+coord[0], this.location[1]+coord[1]) != null) {
					coord = [Math.floor(Math.random()*3)-1,Math.floor(Math.random()*3)-1];
				}
				this.stage.setImage(this.location[0]+coord[0], this.location[1]+coord[1], this.stage.monsterImageSrc); // set new position image to monster
				this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // set original position image to empty
				this.location[0] += coord[0]; // change position to new position
				this.location[1] += coord[1];
			}
			this.direction = 'backward'; // reverse direction if blocked
		}
	}

	if (this.direction == 'backward'){

		if (this.stage.getActor(this.location[0]-1, this.location[1]-1) == null){ // check top left
			this.stage.setImage(this.location[0]-1, this.location[1]-1, this.stage.monsterImageSrc);
			this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc);
			this.location[0] -= 1;
			this.location[1] -= 1;
		} else {
			this.playerCollision(this.location[0]-1, this.location[1]-1);
			// 1st intelligent monster - after getting turned around 5 times, it teleports
			if (this.intelligence > 8) {
				this.count++;
				if (this.count == 5) {
					this,count = 0;
					coord = [Math.floor(Math.random()*19)+1,Math.floor(Math.random()*19)+1];
					while (this.stage.getActor(coord[0], coord[1]) != null) {
						coord = [Math.floor(Math.random()*19)+1,Math.floor(Math.random()*19)+1];
					}
					this.stage.setImage(coord[0], coord[1], this.stage.monsterImageSrc); // set new position image to monster
					this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // set original position image to empty
					this.location[0] = coord[0]; // change position to new position
					this.location[1] = coord[1];
				}
			}
			// 2nd intelligent monster - sidesteps an object when stuck before turning back around
			else if (this.intelligence > 5) {
				coord = [Math.floor(Math.random()*3)-1,Math.floor(Math.random()*3)-1];
				while (this.stage.getActor(this.location[0]+coord[0], this.location[1]+coord[1]) != null) {
					coord = [Math.floor(Math.random()*3)-1,Math.floor(Math.random()*3)-1];
				}
				this.stage.setImage(this.location[0]+coord[0], this.location[1]+coord[1], this.stage.monsterImageSrc); // set new position image to monster
				this.stage.setImage(this.location[0], this.location[1], this.stage.blankImageSrc); // set original position image to empty
				this.location[0] += coord[0]; // change position to new position
				this.location[1] += coord[1];
			}
			this.direction = 'forward'; // reverse direction if blocked
		}
	}
};

// Wall class

function Wall(x, y){
	this.location = [x,y];
	this.src="icons/wall.jpeg";
}

// Box class

function Box(x, y){
	this.location = [x,y];
	this.src="icons/emblem-package-2-24.png";
}

module.exports = wss;