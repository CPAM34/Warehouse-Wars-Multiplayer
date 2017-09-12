// JavaScript Document
// Global variables
var current_user = "";
var current_data = null;
var socket = null;
// SOME GLUE CODE CONNECTING THIS PAGE TO THE STAGE
var prev = "login";
//measure x axis movement 
var startX; 
//measure y axis movement 
var startY;
var endX;
var endY;
var ax, ay, az;
// sounds
var victorySound = new Audio("./sounds/victory.wav");
var playerStepSound = new Audio("./sounds/playerstep.wav");
var playerHitSound = new Audio("./sounds/playerhit.wav");
var playerDeathSound = new Audio("./sounds/playerdeath.wav");
var newPlayerSound = new Audio("./sounds/newplayer.wav");
var monsterStepSound = new Audio("./sounds/monsterstep.wav");
var monsterDeathSound = new Audio("./sounds/monsterdeath.wav");
var gameOverSound = new Audio("./sounds/gameover.wav");

function shake(event){
	// Grab the acceleration including gravity from the results
	var acceleration = event.accelerationIncludingGravity;

	// Display the raw acceleration data
	var nax=Math.round(acceleration.x);
	var nay=Math.round(acceleration.y);
	var naz=Math.round(acceleration.z);
	var h=event.interval;
	var d= [Math.round((nax-ax)/h), Math.round((nay-ay)/h), Math.round((naz-az)/h)];
	var magnitude=Math.round(Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]));
	ax=nax; ay=nay; az=naz;
	// logout if shaken hard enough
	if ((magnitude > 500) && (prev == "game")) {
		logout();
	}
}

function setupGame(){
	console.log(socket);
	socket.send(JSON.stringify({ "status" : "newPlayer", "msg" : {"name" : current_user}}));
	document.getElementById("score").innerHTML = "Score: ";
	document.getElementById("player_health").innerHTML = "Player Health = 3";
	// document.getElementById('pause').innerHTML = 'Resume';
	// document.getElementById('pause').onclick = startGame;
}
// YOUR CODE GOES HERE
function onLoginSuccess(resp) {
	socket.send(JSON.stringify({ "status" : "loginSuccess", "msg" : {"name" : resp.username}}));
	$("#login").hide();
	$("#nav").show();
	$("#logout").show();
	$("#stage").show();
	$("#game").show();
	prev = "game";
	current_data = resp;
	current_user = resp.username;
	setupGame();
	document.getElementById("loginerror").innerHTML = "";
	document.getElementById("userlogin").style.color = "black";
	document.getElementById("passlogin").style.color = "black";
	document.getElementById("rusername").value = resp.username;
	document.getElementById("rpassword").value = resp.password;
	document.getElementById("email").value = resp.email;
	document.getElementById("firstname").value = resp.firstname;
	document.getElementById("lastname").value = resp.lastname;
	$.ajax({
		method: "GET",
		url: "/userscores",
		data: {"user" : current_user},
		dataType: "text",
		success: function(resp) {
			displayScore(resp);
		}
	});
}
function onRegUpdSuccess(data) {
	socket.send(JSON.stringify({ "status" : "regUpdSuccess", "msg" : {"name" : data.username}}));
	$("#profile").hide();
	$("#reg").hide();
	$("#upd").hide();
	$("#deloption").hide();
	$("#logout").show();
	$("#game").show();
	$("#stage").show();
	prev = "game";
	current_data = data;
	current_user = data.username;
	setupGame();
	document.getElementById("regerror").innerHTML = "";
	document.getElementById("reguser").style.color = "black";
	document.getElementById("regpass").style.color = "black";
	document.getElementById("regemail").style.color = "black";
	document.getElementById("rusername").value = data.username;
	document.getElementById("rpassword").value = data.password;
	document.getElementById("email").value = data.email;
	document.getElementById("firstname").value = data.firstname;
	document.getElementById("lastname").value = data.lastname;
	$.ajax({
		method: "GET",
		url: "/userscores",
		data: {"user" : current_user},
		dataType: "text",
		success: function(resp) {
			displayScore(resp);
		}
	});
}
function onSuccessfulDelete() {
	socket.send(JSON.stringify({ "status" : "delSuccess", "msg" : {"name" : current_user}}));
	$("#profile").hide();
	$("#upd").hide();
	$("#deloption").hide();
	$("#nav").hide();
	$("#logout").hide();
	$("#login").show();
	highScores();
	current_data = null;
	current_user = "";
	prev = "login";
	alert("Account successfully deleted.");
}
function highScores() {
	$.ajax({
		method: "GET",
		url: "/topscores",
		data: {"highscores" : "highscores"},
		dataType: "text",
		success: function(resp) {
			displayScore(resp);
		}
	});
}
function displayScore(resp) {
	if (current_user == "") {
		document.getElementById("topscores").innerHTML = resp;
	}
	else {
		document.getElementById("personalscores").innerHTML = resp;
	}
}
function back() {
	if (prev == "login") {
		highScores();
		$("#nav").hide();
		$("#profile").hide();
		$("#reg").hide();
		$("#login").show();
		document.getElementById("regerror").innerHTML = "";
		document.getElementById("reguser").style.color = "black";
		document.getElementById("regpass").style.color = "black";
		document.getElementById("regemail").style.color = "black";
	}
	else {
		$.ajax({
			method: "GET",
			url: "/userscores",
			data: {"user" : current_user},
			dataType: "text",
			success: function(resp) {
				displayScore(resp);
			}
		});
		$("#nav").hide();
		$("#profile").hide();
		$("#upd").hide();
		$("#deloption").hide();
		$("#game").show();
		$("#stage").show();
		$("#logout").show();
		setupGame();
	}
}
function logout() {
	var c = confirm("You will lose any current in game progress by logging out. Are you sure?");
	if (c) {
		socket.send(JSON.stringify({"status" : "logoutSuccess", "msg" : {"name" : current_user}}));
		$("#game").hide();
		$("#stage").hide();
		$("#nav").hide();
		$("#logout").hide();
		$("#login").show();
		document.getElementById("log").innerHTML = "";
		highScores();
		current_data = null;
		current_user = "";
		prev = "login";
	}
}
// code taken from http://stackoverflow.com/questions/10655202/detect-multiple-keys-on-single-keypress-event-in-jquery
var map = {37: false, 38: false, 39: false, 40: false};
$(document).keydown(function(e){
	if (e.keyCode in map){
		map[e.keyCode] = true;
		if (map[38]){
			if (map[37]){
				move('north_west');
			} else if (map[39]){
				move('north_east');
			} else {
				move('north');
			}
		} else if (map[40]){
			if (map[37]){
				move('south_west');
			} else if (map[39]){
				move('south_east');
			} else {
				move('south');
			}
		} else if (map[37]){
			move('west');
		} else if (map[39]){
			move('east');
		}
	}
}).keyup(function(e){
	if (e.keyCode in map){
		map[e.keyCode] = false;
	}
});
function parseStage (stagearray, x, y) {
	var s="<table class = 'stage'>";
	for (var i=0; i<20; i++) {
		s += '<tr>';
		for (var j=0; j<20; j++) {
			if ((i == x) && (j == y)) {
				s += "<td id = " + "'" + i + "_" + j + "'" + ">" + "<img src='icons/face-cool-24-player.png' height = '30' width = '30'>" + "</td>";
			}
			else {
				s += "<td id = " + "'" + i + "_" + j + "'" + ">" + "<img src='" + stagearray[i][j] + "' height = '30' width = '30'>" + "</td>";
			}
		}
		s += '</tr>';
	}
	s+="</table>";
	// Put it in the stageElementID (innerHTML)
	document.getElementById("stage").innerHTML = s;
}
function move (direction) {
	socket.send(JSON.stringify({"status" : "move", "msg" : {"name" : current_user, "direction" : direction}}));
}
window.onload = highScores;
// Set up page on initial load with only login form
$(function(){
	socket = new WebSocket("ws://cslinux.utm.utoronto.ca:10691");
	
	canvas = document.getElementById('canvas');
	
	// moving character via swipeable canvas
	canvas.addEventListener('touchstart', function(event) {
		event.preventDefault();
		startX = event.touches[0].pageX;
		startY = event.touches[0].pageY;
	}, false);
	
	canvas.addEventListener('touchmove', function(event) {
		endX = event.touches[0].pageX;
		endY = event.touches[0].pageY;
	}, false);

	canvas.addEventListener('touchend', function(event) {
		var deltaX, deltaY;
		deltaX = endX - startX;
		deltaY = endY - startY;
		console.log(deltaX);
		console.log(deltaY);
		currlog = document.getElementById("log").innerHTML;
		direction = "none";
		if (deltaX > 50) {
			if (deltaY > 50) {
				direction = "south_east";
			}
			else if (deltaY < -50) {
				direction = "north_east";
			}
			else {
				direction = "east";
			}
		}
		else if (deltaX < -50) {
			if (deltaY > 50) {
				direction = "south_west";
			}
			else if (deltaY < -50) {
				direction = "north_west";
			}
			else {
				direction = "west";
			}
		}
		else {
			if (deltaY > 50) {
				direction = "south";
			}
			else if (deltaY < -50) {
				direction = "north";
			}
		}
		if (direction != "none") {
			move(direction);
		}
		startX = null;
		startY = null;
	}, false);
	socket.onopen = function (event) {
		console.log("connected");
	};
	socket.onmessage = function (event) {
		if (event.data == "__ping__") {
			socket.send("__pong__");
		}
		else if (event.data == "L") {
			$.ajax({
				method: "PUT",
				url: "/score",
				data: JSON.stringify({"name" : current_user, "score" : "L", "date" : "N/A"}),
				contentType: "application/json; charset=utf-8",
				success: function(data) {
				},
				error: function() {
				}
			});
			$("#game").hide();
			$("#stage").hide();
			$("#nav").hide();
			$("#logout").hide();
			$("#login").show();
			document.getElementById("log").innerHTML = "";
			alert("Game over. Better luck next time!");
			gameOverSound.play();
			highScores();
			current_data = null;
			current_user = "";
			prev = "login";
		}
		else {
			var message = JSON.parse(event.data);
			if (message.status == "game") {
				parseStage(message.game, message.coordinates[0], message.coordinates[1]);
				document.getElementById("score").innerHTML = "Score: " + message.score;
				document.getElementById("player_health").innerHTML = "Player Health = " + message.health;
			}
			else if (message.status == "log") {
				sound = new Audio(message.sound);
				sound.play();
				currlog = document.getElementById("log").innerHTML;
				document.getElementById("log").innerHTML = message.msg + "<br/>" + currlog;
			}
			else if (message.status == "W") {
				$.ajax({
					method: "PUT",
					url: "/score",
					data: JSON.stringify({"user" : current_user, "score" : message.score, "date" : message.date}),
					contentType: "application/json; charset=utf-8",
					success: function(data) {
					},
					error: function() {
					}
				});
				$("#game").hide();
				$("#stage").hide();
				$("#nav").hide();
				$("#logout").hide();
				$("#login").show();
				document.getElementById("log").innerHTML = "";
				alert("YOU WIN!");
				victorySound.play();
				highScores();
				current_data = null;
				current_user = "";
				prev = "login";
			}
			else if (message.status == "sound") {
				sound = new Audio(message.sound);
				sound.play();
			}
		}
	};
	socket.onclose = function (event) {
		socket.send(JSON.stringify({"status" : "closed", "msg" : {"name" : current_user}}));
	};
	if ((window.DeviceMotionEvent) || ('listenForDeviceMovement' in window)) {
		window.addEventListener('devicemotion', shake, false);
	}
	$("#loginButton").on('click', function() {
		var user = $("#lusername").val();
		var pass = $("#lpassword").val();
		$.ajax({
			method: "GET",
			url: "/player",
			data: {"user" : user, "pass" : pass},
			success: function(resp) {
				onLoginSuccess(resp);
			},
			error: function() {
				document.getElementById("loginerror").innerHTML = "Incorrect Username/password!";
				document.getElementById("userlogin").style.color = "red";
				document.getElementById("passlogin").style.color = "red";
			}
		});
	});

	$("#goToRegButton").on('click', function() {
		$("#login").hide();
		$("#nav").show();
		$("#reg").show();
		$("#profile").show();
		document.getElementById("loginerror").innerHTML = "";
		document.getElementById("userlogin").style.color = "black";
		document.getElementById("passlogin").style.color = "black";
	});

	$("#registerButton").on('click', function() {
		var user = $("#rusername").val();
		var pass = $("#rpassword").val();
		var email = $("#email").val();
		var firstname = $("#firstname").val();
		var lastname = $("#lastname").val();
		var email_valid = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		if (user.length < 6) {
			document.getElementById("regerror").innerHTML = "Your username is too short!";
			document.getElementById("reguser").style.color = "red";
			document.getElementById("regpass").style.color = "black";
			document.getElementById("regemail").style.color = "black";
		}
		else if (user.length > 32) {
			document.getElementById("regerror").innerHTML = "Your username is too long!";
			document.getElementById("reguser").style.color = "red";
			document.getElementById("regpass").style.color = "black";
			document.getElementById("regemail").style.color = "black";
		}
		else if (pass.length < 6) {
			document.getElementById("regerror").innerHTML = "Your password is too short!";
			document.getElementById("reguser").style.color = "black";
			document.getElementById("regpass").style.color = "red";
			document.getElementById("regemail").style.color = "black";
		}
		else if (pass.length > 32) {
			document.getElementById("regerror").innerHTML = "Your password is too long!";
			document.getElementById("reguser").style.color = "black";
			document.getElementById("regpass").style.color = "red";
			document.getElementById("regemail").style.color = "black";
		}
		else if (!email_valid.test(email)) {
			document.getElementById("regerror").innerHTML = "This is an invalid email address!";
			document.getElementById("reguser").style.color = "black";
			document.getElementById("regpass").style.color = "black";
			document.getElementById("regemail").style.color = "red";
		}
		else {
			$.ajax({
				method: "POST",
				url: "/player",
				data: JSON.stringify({"user" : user, "pass" : pass, "email" : email, "firstname" : firstname, "lastname" : lastname}),
				contentType: "application/json; charset=utf-8",
				success: function(data) {
					onRegUpdSuccess(data);
				},
				error: function() {
					document.getElementById("regerror").innerHTML = "This username already exists!";
					document.getElementById("reguser").style.color = "red";
					document.getElementById("regpass").style.color = "black";
					document.getElementById("regemail").style.color = "black";
				}
			});
		}
	});

	$("#updateButton").on('click', function() {
		var user = $("#rusername").val();
		var pass = $("#rpassword").val();
		var email = $("#email").val();
		var firstname = $("#firstname").val();
		var lastname = $("#lastname").val();
		var email_valid = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		if (user.length < 6) {
			document.getElementById("regerror").innerHTML = "Your username is too short!";
			document.getElementById("reguser").style.color = "red";
			document.getElementById("regpass").style.color = "black";
			document.getElementById("regemail").style.color = "black";
		}
		else if (user.length > 32) {
			document.getElementById("regerror").innerHTML = "Your username is too long!";
			document.getElementById("reguser").style.color = "red";
			document.getElementById("regpass").style.color = "black";
			document.getElementById("regemail").style.color = "black";
		}
		else if (pass.length < 6) {
			document.getElementById("regerror").innerHTML = "Your password is too short!";
			document.getElementById("regpass").style.color = "red";
		}
		else if (pass.length > 32) {
			document.getElementById("regerror").innerHTML = "Your password is too long!";
			document.getElementById("regpass").style.color = "red";
		}
		else if (!email_valid.test(email)) {
			document.getElementById("regerror").innerHTML = "This is an invalid email address!";
			document.getElementById("regemail").style.color = "red";
		}
		else {
			$.ajax({
				method: "PUT",
				url: "/player",
				data: JSON.stringify({"current" : current_user, "user" : user, "pass" : pass, "email" : email, "firstname" : firstname, "lastname" : lastname}),
				contentType: "application/json; charset=utf-8",
				success: function(data) {
					onRegUpdSuccess(data);
				},
				error: function() {
					document.getElementById("regerror").innerHTML = "This username already exists!";
					document.getElementById("reguser").style.color = "red";
				}
			});
		}
	});

	$("#deleteButton").on('click', function() {
		var c = confirm("Your account will be permanently erased and so will any data associated with it. This action cannot be undone. Are you sure?");
		if (c) {
			$.ajax({
				method: "DELETE",
				url: "/player",
				data: JSON.stringify({"user" : current_user}),
				contentType: "application/json; charset=utf-8",
				success: function() {
					onSuccessfulDelete();
				},
				error: function() {
					alert("There was a problem deleting your account");
				}
			});
		}
	});

	$("#modifyAcct").on('click', function() {
		var c = confirm("You will lose any current in game progress by modifying your account. Are you sure?");
		if (c) {
			socket.send(JSON.stringify({ "status" : "modify", "msg" : {"name" : current_user}}));
			$("#logout").hide();
			$("#game").hide();
			$("#stage").hide();
			$("#nav").show();
			$("#upd").show();
			$("#deloption").show();
			$("#profile").show();
			document.getElementById("log").innerHTML = "";
		}
	});
	
	$("#chatButton").on('click', function() {
		var message = $("#chatmsg").val();
		if ((message != "") && (message != null)) {
			socket.send(JSON.stringify({"status" : "chat", "sender" : current_user, "msg" : message}));
		}
	});
});