# Ketch Up Text Notification Server
A text messaging server for the prototype app called KetchUp, which was built for our clients in the Northwestern Master's of Product Design &amp; Development program.

##Installation
This project is dependent on API keys for Parse and Twilio. Make sure to change these fields.
```
Parse.initialize(ApplicationId, JavascriptKey);

var app = express();

//Twilio-related variables
var twilioNum = "";
var accountSid = "";
var authToken = "";
var client = require('twilio')(accountSid, authToken);
```

##Text Scheduling
The code can be changed to have events occur on a consistent interval. To do this, please switch to scheduling with the Cron-style function.
