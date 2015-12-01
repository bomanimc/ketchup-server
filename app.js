var express = require('express');
var request = require('request');
var http = require('http');
var path = require('path');
var engines = require('consolidate');
var schedule = require('node-schedule');
var Parse = require('parse/node').Parse;

Parse.initialize("Nz3eFHamqLSy9TDFupG0jmPCJ6ywLoXwsmcgQjH0", "jQM6VnLUno63VjRgolsqOa5LjYXjMxZi6qMSKzfn");

var app = express();

//Twilio-related variables
var twilioNum = "+16153340519";
var accountSid = "AC9857a6b502c9981ffa953ab52c318a35";
var authToken = "b170ec7a985058f30aafe411d5b65994";
var client = require('twilio')(accountSid, authToken);

app.set('port', (process.env.PORT || 8080));

// Everything below taken from https://github.com/datejs/Datejs
Date.isLeapYear = function (year) { 
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () { 
    return Date.isLeapYear(this.getFullYear()); 
};

Date.prototype.getDaysInMonth = function () { 
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};

// Takes in an integer that represents milliseconds since epoch time, and parses it to days
function UTCToDays(utc) {
	var days = utc / 1000 / 60 / 60 / 24;
	return parseInt(days);
}

function calculateDaysLeft(lastCall, interval, unit) {
	var copiedLastCall = new Date(lastCall.getTime()); // Need to do this because JavaScript's pass-by-reference screws everything up
	// First, convert from units to days, where units∈{days, weeks, months, years}
	switch(unit) {
		case "days": // Do nothing
			break;
		case "weeks": // Multiply by 7
			interval = 7*interval;
			break;
		case "months": // Do some open-source library magic
			copiedLastCall.addMonths(interval);
			break;
		case "years": // Goto case "months": and read comment
			copiedLastCall.addMonths(12*interval);
			break;
	}
	var daysElapsedSinceToday = UTCToDays(Date.now() - copiedLastCall);
	return UTCToDays((interval * 24 * 60 * 60 * 1000) - Date.now() + copiedLastCall.getTime());
}

var sendSMS = function(numVal, bodyVal) {
	console.log("Sending Message to " + numVal);

	client.messages.create({
	    body: bodyVal,
	    to: numVal,
	    from: twilioNum,
	}, function(err, message) {
	    console.log("ERROR & MESSAGE: " + JSON.stringify(err, null, 4) + " " + message);
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

var scheduleQuery = function() {

// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    |
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)

	var queryJob = schedule.scheduleJob('*/5 * * * *', function(){
	    getUsers();
	});

	queryJob.cancel();
}

var scheduleQuery = function(year, month, day, hour, minute, sec) {

	var date = new Date(year, month, day, hour, minute, sec);
	console.log("Scheduled Date is: " + date);

	var smsJob = schedule.scheduleJob(date, function(){
		getUsers();
		console.log("Re-queried Parse.");
	});
}

var sendStructuredMessages = function(urgentContacts) {
	for (var num in urgentContacts) {
		contactString = urgentContacts[num].join(" and ");
		var message = "Don't forget to KetchUp with " + contactString + ". Thanks!";
		console.log(message);

		numString = "+"+num;
		sendSMS(numString, message);
	}
	
}

var getUsers = function() {
	var contactToday = {};
	var ContactsObject = Parse.Object.extend("ketchupData");
	var query = new Parse.Query(ContactsObject);
	query.descending("createdAt").find( {
		success: function (results) { // Find all values in database and stuff into results. Results will be in descending order by creation date.
			for (var i = 0; i < results.length; i++) {
		      	var object = results[i];
		      	var daysLeft = calculateDaysLeft(object.get('lastCall'), object.get('interval'), object.get('unit'));
		      	console.log(object.get('name') + " - " + daysLeft);
		      	if(daysLeft == 1) {
		      		//contactToday.push(object);
		      		if(!contactToday.hasOwnProperty(object.get('phoneId'))) {
		      			contactToday[object.get('phoneId')] = [object.get('name')];
		      		}
		      		else {
		      			contactToday[object.get('phoneId')] = contactToday[object.get('phoneId')].concat([object.get('name')])
		      		}
		      	}
		    }

		    console.log(JSON.stringify(contactToday));
		    sendStructuredMessages(contactToday);

		},
		error: function (error) {
			console.log("Error in Parse Query " + error.code + " " + error.message);
		}
	});
};

app.get('/', function (req, res){
	var date = new Date();
	console.log("Server Date: " + date +"\n---------------------------------\n")
	res.send(200);
});

//var scheduleQuery = function(year, month, day, hour, minute, sec)
scheduleQuery(2015, 11, 1, 0, 12, 0);


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