var express = require('express');
var request = require('request');
var http = require('http');
var path = require('path');
var engines = require('consolidate');
var schedule = require('node-schedule');
var Parse = require('parse').Parse;

Parse.initialize("Nz3eFHamqLSy9TDFupG0jmPCJ6ywLoXwsmcgQjH0", "jQM6VnLUno63VjRgolsqOa5LjYXjMxZi6qMSKzfn");

var app = express();

//Twilio-related variables
var twilioNum = "+16153340519";
var accountSid = "AC9857a6b502c9981ffa953ab52c318a35";
var authToken = "b170ec7a985058f30aafe411d5b65994";
var client = require('twilio')(accountSid, authToken);

app.set('port', (process.env.PORT || 8080));


var sendSMS = function(numVal, bodyVal) {
	console.log("Sending Message to " + numVal);

	client.messages.create({
	    body: bodyVal,
	    to: numVal,
	    from: twilioNum,
	}, function(err, message) {
	    //process.stdout.write(message.sid);
	});
};

var scheduleSMS = function(year, month, day, hour, minute, sec, numVal, bodyVal) {

	var date = new Date(year, month, day, hour, minute, sec);
	console.log("Scheduled Date is: " + date);

	var smsJob = schedule.scheduleJob(date, function(){
		sendSMS(numVal, bodyVal);
	    console.log('Sent the scheduled text.');
	});
}

var getUsers = function() {
	var Users = Parse.Object.extend("Users");
	var query = new Parse.Query(Users);
	query.find({
	  success: function(results) {
	    console.log("Successfully retrieved Users");
	    // Do something with the returned Parse.Object values
	    for (var i = 0; i < results.length; i++) {
	      var object = results[i];
	      console.log(object.get('name'));
	    }
	  },
	  error: function(error) {
	    console.log("Error: " + error.code + " " + error.message);
	  }
	}
}

app.get('/', function (req, res){
	getUsers();
	res.send(200);
});

app.get('/text', function (req, res){
	console.log("API endpoint reached.");
	var numVal = req.query.to;
	var bodyVal = req.query.bodyText;
	var monthVal = parseInt(req.query.month);
	var dayVal = parseInt(req.query.day);
	var yearVal = parseInt(req.query.year);
	var hourVal = parseInt(req.query.hour);
	var minuteVal = parseInt(req.query.minute);
	var ampmVal = req.query.ampm;
	var secVal = 0;

	monthVal = monthVal - 1; //Zero-Indexed Months
	if(ampmVal == "PM")
	{
		hourVal = hourVal + 12;
	}

	console.log("Phone Number: " + numVal);
	console.log("Body: " + bodyVal);
	console.log("Month: " + monthVal);
	console.log("Day: " + dayVal);
	console.log("Year: " + yearVal);
	console.log("Hour: " + hourVal);
	console.log("Minute: " + minuteVal);
	console.log("AP/PM: " + ampmVal);
	
	scheduleSMS(yearVal, monthVal, dayVal, hourVal, minuteVal, secVal, numVal, bodyVal);
	console.log("Schedule Check");
	res.send('Scheduled an imaginary text!');
});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found!');
    err.status = 404;
    next(err);
});

app.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});