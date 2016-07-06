# Crowd Sentiment with Watson Tone Analyzer Demo

Coming in v2: Color picker for neopixel, user chosen tags, tweet display, and dual stream comparison. 

This app was ispired by: https://github.com/jeancarl/tone-led-pin

##Overview
The watson-mood-ring app is a demo application that feeds a live stream of Tweets for a given topic through the [Watson Tone Analyzer](http://www.ibm.com/watson/developercloud/tone-analyzer.html) service and displays the results in a simple user interface. The application is designed to be paired with a Particle Photon and uses the [Watson IoT Foundation](https://console.ng.bluemix.net/catalog/services/internet-of-things-platform/) for configuration and messaging. 

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/slkaczma/watson-mood-ring)

##Application Requirements
The application uses a Twitter stream and requires you to create an app with Twitter at [apps.twitter.com](https://apps.twitter.com/). To create an app you need a phone number linked to your account. 

Once you have the app registered, you need a Access Token and Token Secret in addition to a Consume Key and Secret. Follow the steps at [dev.twitter.com](https://dev.twitter.com/oauth/overview/application-owner-access-tokens) for more information.

Update app.js with your tokens and secrets. 
```
// Connection for Twitter. Create an app at apps.twitter.com
var twit = new twitter({
  consumer_key: 'TWITTER_CONSUMER_KEY',
  consumer_secret: 'TWITTER_CONSUMER_SECRET',
  access_token_key: 'TWITTER_TOKEN_KEY',
  access_token_secret: 'TWITTER_TOKEN_SECRET'
});
```

##Run the app on Bluemix
1. If you do not already have a Bluemix account, [sign up here](https://console.ng.bluemix.net/registration/)

2. Download and install the [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/releases) tool

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/slkaczma/watson-mood-ring.git
  ```

4. `cd` into this newly created directory

5. Open the `manifest.yml` file and change the `host` value from `mymoodring` to something unique.

  The host you choose will determinate the subdomain of your application's URL:  `<host>.mybluemix.net`

6. Connect to Bluemix in the command line tool and follow the prompts to log in.

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```

7. Create the Cloudant service in Bluemix.

  ```
  $ cf create-service cloudantNoSQLDB shared moodring-cloudant
  ```
  
8. Create the Tone Analyzer service in Bluemix.

  ```
  $ cf create-service tone_analyzer standard moodring-tone
  ```
  
9. Create the Watson IoT Foundation service in Bluemix. See the [README](https://github.com/slkaczma/watson-mood-ring/blob/master/photon/README.MD) in the photon folder for device and server setup.

  ```
  $ cf create-service iotf-service iotf-service-free moodring-iot
  ```
  
10. OPTIONAL: Update the local credentials for each service in app.js.

  ```
  // Set defaults for no VCAP or local. Replace with your Cloudant details from Bluemix.
		var cloudantUsername = "CLOUDANT_USERNAME";
		var cloudantPassword = "CLOUDANT_PASSWORD";
		var cloudantHost = "CLOUDANT_HOST";
		
		// Replace with your Tone Analyzer credentials from Bluemix.
		var taURL     = "https://gateway.watsonplatform.net/tone-analyzer/api";
		var taPassword = "TONE_ANALYZER_PASSWORD";
		var taUsername = "TONE_ANALYZER_USERNAME";
  ```

11. Change the tag being tracked in app.js to your Twitter hashtag of choice.
  
  `var tag = "ibm";      // TODO Set the tag for Twitter to stream `

11. Push the app to Bluemix.

  ```
  $ cf push
  ```

##Run the app locally
1. If you do not already have a Bluemix account, [sign up here](https://console.ng.bluemix.net/registration/)

2. Download and install the [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/releases) tool

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/slkaczma/watson-mood-ring.git
  ```

4. `cd` into this newly created directory

5. Log into your Bluemix account and navigate to the Catalog.

6. Create the Watson Tone Analyzer, Cloudant, and Watson IoT Foundation services using your Bluemix account and replace the   corresponding credentials in your `app.js` file. Refer to the [README](https://github.com/slkaczma/watson-mood-ring/blob/master/photon/README.MD) in the photon folder for more information on the       Watson IoT Foundation and adding device and server credentials.

  ```
  // Set defaults for no VCAP or local. Replace with your Cloudant details from Bluemix.
		var cloudantUsername = "CLOUDANT_USERNAME";
		var cloudantPassword = "CLOUDANT_PASSWORD";
		var cloudantHost = "CLOUDANT_HOST";
		
		// Replace with your Tone Analyzer credentials from Bluemix.
		var taURL     = "https://gateway.watsonplatform.net/tone-analyzer/api";
		var taPassword = "TONE_ANALYZER_PASSWORD";
		var taUsername = "TONE_ANALYZER_USERNAME";
  ```
  
7. Change the tag being tracked in app.js to your Twitter hashtag of choice.
  
  `var tag = "ibm";      // TODO Set the tag for Twitter to stream `

8. Start your app locally with the following commands

  ```
  npm install
  ```
  ```
  node app
  ```

Navigate to localhost:8080 in your browser after you see the `No VCAP. Use stored credentials.` message.


## Troubleshooting

The primary source of debugging information for your Bluemix app is the logs. To see them, run the following command using the Cloud Foundry CLI:

  ```
  $ cf logs watsonmoodring --recent
  ```
For more detailed information on troubleshooting your application, see the [Troubleshooting section](https://www.ng.bluemix.net/docs/troubleshoot/tr.html) in the Bluemix documentation.

## Contribute
We are more than happy to accept external contributions to this project, be it in the form of issues and pull requests. If you find a bug, please report it via the [Issues section](https://github.com/slkaczma/watson-mood-ring/issues).

##Privacy Notice
The watsonmoodring sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms.

The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:
    * Application Name (application_name)
    * Space ID (space_id)
    * Application Version (application_version)
    * Application URIs (application_uris)

This data is collected from the VCAP_APPLICATION environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `app.js` file.
