/*eslint-env node*/

//------------------------------------------------------------------------------------------------
// Watson Tone Analyzer Using Tweets and NeoPixel Ring Display
// 
// Author: Stefania Kaczmarczyk @slkaczma
// 
// Inspired by Node-RED documentation and device code by @jeancarl:
// https://github.com/jeancarl/tone-led-pin
//
//------------------------------------------------------------------------------------------------
// The MIT License (MIT)
//
// Copyright (c) 2016 Stefania Kaczmarczyk
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//------------------------------------------------------------------------------------------------

/*************************************************************************************************

  Define global variables for NPM packages and Cloud Foundry environment

*************************************************************************************************/

var express   = require("express"),
  app         = express(),
  bodyParser  = require("body-parser"),
  cfenv       = require("cfenv"),
  appEnv      = cfenv.getAppEnv(),
  cloudant    = require("cloudant"),
  session     = require('express-session');
  twitter     = require("twitter-ng"),
  request     = require("request"),
  watson      = require("watson-developer-cloud"),
  Client      = require("ibmiotf"),
  io          = require('socket.io')(),
  ip          = require('ip');
  
/*************************************************************************************************
 
  Global variable declaration section
  
*************************************************************************************************/

var tag = "ibm";      // TODO Set the tag for Twitter to stream 

var vcapServices; 
var db;
var cloudantURL;
var dbName = "stats"; // Database to hold the overall stats for each tag
var docAll = "allTime_"+tag;
var tweets = [];
var stats = [];
var led = [];
var ledStats = [];
var t = 0;       // Variable to hold the total number of Tweets
var dataSet = 0; // Determines the tone set for the Neopixel Ring - 0 Emotion | 1 Language | 2 Social

/* Variables for Each Set of Tones: Emotion, Social, Language ***********************************/
var traitNames = ["Anger","Disgust","Fear","Joy","Sadness","Analytical","Confident","Tentative","Openness","Conscientiousness","Extraversion","Agreeableness","Emotional Range"];
var totalScores = [0,0,0,0,0,0,0,0,0,0,0,0,0];
// Emotion Tone: Anger, Fear, Disgust, Joy, Sadness
var emotion=[0,0,0,0,0];
// Social Tone: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
var social=[0,0,0,0,0];
// Language Tone: Analytical, Confident, Tentative
var language=[0,0,0];
/************************************************************************************************/

/*************************************************************************************************
 
  Check for service running in Bluemix and grab VCAP for Cloudant and Tone Analyzer
  
*************************************************************************************************/
if(process.env.VCAP_SERVICES) {
		vcapServices = JSON.parse(process.env.VCAP_SERVICES);	
		if(vcapServices.cloudantNoSQLDB) {
			cloudantURL = vcapServices.cloudantNoSQLDB[0].credentials.url;
			console.log("Cloudant URL: ",cloudantURL);
		}
		if(vcapServices.tone_analyzer){
			taURL = vcapServices.tone_analyzer[0].credentials.url;
			taPassword = vcapServices.tone_analyzer[0].credentials.password;
			taUsername = vcapServices.tone_analyzer[0].credentials.username;
			
		}
		console.log("Using VCAP credentials.Cloudant: "+cloudantURL+" Tone Analyzer: "+taURL);
	} else {
		// Set defaults for no VCAP or local. Replace with your Cloudant details from Bluemix.
		var cloudantUsername = "CLOUDANT_USERNAME";
		var cloudantPassword = "CLOUDANT_PASSWORD";
		var cloudantHost = "CLOUDANT_HOST";
		
		// Replace with your Tone Analyzer credentials from Bluemix.
		var taURL     = "https://gateway.watsonplatform.net/tone-analyzer/api";
		var taPassword = "TONE_ANALYZER_PASSWORD";
		var taUsername = "TONE_ANALYZER_USERNAME";
		
		cloudantURL = "https://"+cloudantUsername+":"+cloudantPassword+"@"+cloudantHost;
		console.log("No VCAP. Use stored credentials.");
}

function initDBConnection() {
	
	var Cloudant = cloudant(cloudantURL);
	
	// Check to see if the "stats" database exists and create 
	Cloudant.db.create(dbName,function(err,body){
		if (err) {
			console.log("Database already exists.");
		} else {
			console.log("New database created: ",dbName);
		}
	});
	
	db = Cloudant.db.use(dbName);
	getStats();
	console.log("Database data initialized.");
}

// Create the service wrapper
var toneAnalyzer = watson.tone_analyzer({
  url: 'https://gateway.watsonplatform.net/tone-analyzer/api/',
  username: taUsername,
  password: taPassword,
  version_date: '2016-05-19',
  version: 'v3'
});

// Connection for Twitter. Create an app at apps.twitter.com
var twit = new twitter({
  consumer_key: 'TWITTER_CONSUMER_KEY',
  consumer_secret: 'TWITTER_CONSUMER_SECRET',
  access_token_key: 'TWITTER_TOKEN_KEY',
  access_token_secret: 'TWITTER_TOKEN_SECRET'
});

twit.verifyCredentials(function (err, data) {
	if(err) {
		console.log("Credentials appear to be wrong. Check your Twitter application and update.");
	}
	else {
		console.log("Connect to Twitter success!");
	}
  });
  
 require("cf-deployment-tracker-client").track();
  
/************************************************************************************************* 
  
  Start the server and socket.io and display the index page out of the public directory
 
*************************************************************************************************/
 
// serve the files out of ./public as our main files
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(__dirname+ '/public'));
app.use(session({
	secret: 'supersecretsquirrel',
	cookie: { maxAge: 60000 },
	resave: true,
	saveUninitialized: true
}));

var host = process.env.VCAP_APP_HOST || 'localhost';
var port = process.env.VCAP_APP_PORT || 8080;

io.on('connection', function(socket){
	console.log("Sockets connected.");
	console.log("Emitting stats to client.");
	
	// Whenever a new client connects send them the latest data
	io.sockets.emit('currentTag',[tag]);
	io.sockets.emit('stats',[emotion,language,social,t]);
	
	socket.on('disconnect', function(){
		console.log("Socket disconnected.");
		
	});
});
io.listen(app.listen(port, host));

console.log('App listening on ',ip.address());


/*************************************************************************************************
 
  Connection and device events for NeoPixel ring with Watson IoT Foundation
 
*************************************************************************************************/

var iotConfig = {
	"org" : "ORGANIZATION",
	"id" : "iotf-service",
	"auth-key" : "AUTH_KEY",
	"auth-token" : "AUTH_TOKEN"
};

// IoT Events. Device connection and log out the device status.
var appClient = new Client.IotfApplication(iotConfig);

appClient.connect();

appClient.on("connect", function () {
	console.log("Connected to broker!");

    appClient.subscribeToDeviceStatus("lDEVICE_TYPE");  // TODO Update with your device type
});

// Track the status of the device. Resend data when there is a Connect. 
appClient.on("deviceStatus", function (deviceType, deviceId, payload, topic) {

    console.log("Device status from: "+deviceType+" : "+deviceId+" with payload : "+payload);
});

/************************************************************************************************
 
  Startup for web application and device
 
*************************************************************************************************/
// Start functions
initDBConnection();
streamTwitter(tag);

var tones;
var curr;
var last = new Date().getTime();

/**
 * Opens a Twitter stream and passes handling off to the Watson services and Cloudant 
 * @param {String} hashtag
 * 
 */
function streamTwitter(hashtag){
	
	twit.stream('statuses/filter', { track: [hashtag]}, function(stream) {
		
		// A user has tweeted. Right now we only want tweets in English.
		stream.on('data', function(tweet) {
			if (tweet.user !== undefined && tweet.lang === "en") {
				curr = new Date().getTime();
				
				var msg = tweet.text;
				
				tweets.push(msg);
				getTone(msg);
			}
		});
	
		// Too many tweets
		stream.on('limit', function(tweet) {
			console.log("Rate limit reached. Wait a few minutes and try again.");
        });
		
		// Log out errors
		stream.on('error', function(tweet,rc) {
			if (rc === 420) {
				console.log("Rate limit reached. Wait a few minutes and try again.");
			} else {
				console.log("Error "+rc+":"+tweet.toString());
			} 
			
			setTimeout(streamTwitter,10000);
         });
		 
		 // Fatal error
		 stream.on('destroy', function (response) {
			 if (this.active) {
				 console.log("Fatal error.");
				 setTimeout(streamTwitter,10000);
			 }
		  });
	});
		  
} // End of streamTwitter function 

/************************************************************************************************
 
  Functions for Watson, Cloudant, and Device Messages
 
*************************************************************************************************/

/**
 * Gets the tone for a tweet and executes a Cloudant update every 12 tweets
 * @param {String} tweet 
 */
function getTone(tweet){
	
	toneAnalyzer.tone({text:tweet}, function(err, data) {
		if (err) {
			console.log("Tone Error: "+err);
		} else {
			tones = data.document_tone;
	
			for(var i=0;i<data.document_tone.tone_categories.length;i++){
				
				var category = tones.tone_categories[i].tones;
				getTopTrait(category);

				} // End loop for tone categories
			}
	}); // End call to tone analyzer
}

/**
 * Creates a new blank document in Cloudant for a tag.
 * 
 */
function blankDoc(){
	var doc = {
			"_id": docAll,
			"tag": tag,
			"totalTweets": 0,
			"Anger": 0,
			"Disgust": 0,
			"Fear": 0,
			"Joy": 0,
			"Sadness": 0,
			"Analytical": 0,
			"Confident" : 0,
			"Tentative" : 0,
			"Openness": 0,
			"Conscientiousness": 0,
			"Extraversion": 0,
			"Agreeableness": 0,
			"Emotional Range": 0
	};
	
	db.insert(doc, function(err, doc) {
		if(err) {
			console.log('Error inserting blank doc\n'+err);
		}
		console.log("Inserted base doc: ",doc);
	});
}

/**
 * Gets the Cloudant doc for the total run of a specified tag. 
 * Creates a new Cloudant document if one does not exist yet. 
 * 
 */
function getStats(){
	
	db.get(docAll,function(err,doc){
		if (!err) {
     		console.log(doc);
			
			// Set each number in the totalScores array equal to the amount in Cloudant
			for(var i=0; i<traitNames.length; i++){
				totalScores[i]=doc[traitNames[i]];
			}
			
			console.log(totalScores);
			
			emotion=[totalScores[0],totalScores[1],totalScores[2],totalScores[3],totalScores[4]];
			language=[totalScores[5],totalScores[6],totalScores[7]];
			social=[totalScores[8],totalScores[9],totalScores[10],totalScores[11],totalScores[12]];
			
	 		t = doc.totalTweets;
			
			// Send the totals off to the setColors function to format the array for the device
			if(dataSet === 0) {
				ledStats = [totalScores[0],totalScores[1],totalScores[2],totalScores[3],totalScores[4],t];
			} else if(dataSet === 1) {
				ledStats = [totalScores[5],totalScores[6],totalScores[7],t];
			} else {
				ledStats = [totalScores[8],totalScores[9],totalScores[10],totalScores[11],totalScores[12],t];
			}
			setColors(ledStats);
			
		} else {
			console.log("Failed to find document for this tag: ",err);
			blankDoc();
		}
	});
}

/**
 * Updates Cloudant doc for tag with stats for latest 12 tweets
 * @return {Number} db return code
 */
function updateCloudant(){
	
	db.get(docAll, function(err, doc) {

    	if (!err) {
			
			var ledStats=[];
			
			// Pick the higher of a number and 0 to prevent null entries
			for(var s=0; s<totalScores.length; s++){
				totalScores[s]=Math.max(totalScores[s],0);
			}
			t = totalScores[0]+totalScores[1]+totalScores[2]+totalScores[3]+totalScores[4];
			
			// Set document attributes to current run
			doc.tag = tag;
	 		doc.totalTweets = t;
			
			for(var i=0; i<traitNames.length; i++){
				doc[traitNames[i]]=totalScores[i];
			}
			
			// Send the totals off to the setColors function to format the array for the device
			if(dataSet === 0) {
				ledStats = [totalScores[0],totalScores[1],totalScores[2],totalScores[3],totalScores[4],t];
			} else if(dataSet === 1) {
				ledStats = [totalScores[5],totalScores[6],totalScores[7],t];
			} else {
				ledStats = [totalScores[8],totalScores[9],totalScores[10],totalScores[11],totalScores[12],t];
			}
					
			setColors(ledStats);
			console.log(doc);
			
			// Emit a stat update to the client
			emotion=[totalScores[0],totalScores[1],totalScores[2],totalScores[3],totalScores[4]];
			language=[totalScores[5],totalScores[6],totalScores[7]];
			social=[totalScores[8],totalScores[9],totalScores[10],totalScores[11],totalScores[12]];
			
			io.sockets.emit('stats',[emotion,language,social,t]);
	 
     		db.insert(doc, doc.id, function(err, doc) {
        		if(err) {
           			console.log('Error inserting data\n'+err);
           			return 500;
        		}
				console.log("Updated total stats: ",doc);
        		return 200;
     		});
   		} else {
			console.log("Error retrieving Cloudant document("+docAll+"): "+err);
			return 500;
		}
	});	
}

/**
 * Cycles through the traits to create an array for the line chart
 * @param {Array} tones
 * 
 */
function getChartTraits(tones){
	var scores=[];
	
	for(var i=0;i<tones.length;i++){
		scores.push(Math.round(tones[i].score*100));
	}
	
	io.sockets.emit('tweet',scores);
}

/**
 * Cycles through the score for each trait in each category and finds the highest percentage.
 * @param {Array} tones
 * 
 */
function getTopTrait(traits){
	var score;
	var name;
	stats = [];
	var topTrait = "";
	
	// Unlike Personality Insights tone order stays constant. Store tones in array for UI.
	for(var i=0; i<traits.length; i++){
		name = traits[i].tone_name;
		score = traits[i].score;
		stats.push(score);
		
		//console.log(name+" : "+score);
		
		// Note: Language tone often results in 0 across all traits. This defaults it to Tentative.
		if(Math.max.apply(Math,stats)===score){
			topTrait = name;
		}
		
	}
	//console.log(topTrait);
	
	// Update the running total for each trait based on topTrait
	for (var n=0; n<traitNames.length; n++){
		if(topTrait===traitNames[n]){
			totalScores[n]+=1;
			
			if(tweets.length>=12){
				tweets = [];
				updateCloudant();
			}
			
			getChartTraits(tones.tone_categories[dataSet].tones);
			
			return;
		}
	}
}

/**
 * Creates an array of 24 items proportionate to the 
 * total of the traits in the Cloudant doc
 * @param {Array} stats 
 * @return {Array} led
 */
function setColors(stats){
	var colors = [];
	var total;
	
	// Magenta a m, Green as g, Yellow as y, Orange as o, Blue as b
	if(dataSet===1){
		colors = ['m','g','b'];
		total = stats[3];
	} else {
		colors = ['m','g','o','b','y'];
		total = stats[5];
	}
	
	led = "";
	
	// Loop through each stat to set a number equivalent to a portion of 24 lights
	for(var c=0;c<stats.length;c++){
		var stat = stats[c];
		
		var count = Math.round((stat/total)*24);
		
		// Fill the array with colors in order of trait
		for(var i=1;i<=count;i++){
			led+=colors[c];
		}	
		
		// Slice it down to 24 colors just in case
		led = led.slice(0,24);
	}
	
	console.log(led);
	if(appClient.isConnected){
		// TODO Update with your IoT device information: Device Type and Device ID
		appClient.publishDeviceCommand("DEVICE_TYPE","DEVICE_ID", "color", "string", led);
	}
	
	return led;
}