#Watson IoT Foundation and Particle Photon

This readme assumes that you have some familiarity with the Particle Photon and already have the device connected to a WiFi network. For more information refer to the Particle [documentation](https://docs.particle.io/guide/getting-started/connect/photon/). 

##Device and Device Code

###Particle Photon and NeoPixel Ring
Part of this build is a visual display that doesn't require lugging around a screen. You can order it wherever you like, but Adafruit has simplified the build by creating a NeoPixel Ring that already has breakout board for soldering headers for the Photon to sit.

[NeoPixel Ring](https://www.adafruit.com/product/2268)

[Particle Photon](https://www.adafruit.com/products/2721) 

###Loading the Code
Once you have a Particle account and the device is added to it. You can load the neopixeltone.ino through the [build](https://build.particle.io/build) web interface.

Make sure to include the MQTT and NeoPixel libraries by navigating to Libraries section of build.particle.io and selecting Include in App. You may have to delete redundant include statments in neopixeltone.ino.

## Watson IoT Foundation

### Create a Server API Key
1. Open the Watson IoT Foundation using the Launch Dashboard button.

2. Navigate to the Access section using the left menu and select API Keys.

3. Select + Generate API Key.

4. Copy the API Key and Authentication Token into another file. The token is ONLY accessible on this screen. Once you close the window you can no longer view the token. 

5. Update the credentials in app.js with your organization (labeled ID in the top of your foundation dashboard window), key, and token. 
   ```
   var iotConfig = {
    "org" : "ORGANIZATION",
    "id" : "iotf-service",
    "auth-key" : "AUTH_KEY",
    "auth-token" : "AUTH_TOKEN"
    };
   ```

### Add the Device and Update neopixeltone.ino

Follow the instructions for adding a device to the Watson IoT foundation: https://developer.ibm.com/recipes/tutorials/how-to-register-devices-in-ibm-iot-foundation/

1. Update the char variables in neopixeltone.ino with your device information. 
   ```
   char *deviceID = "d:ol7di6:ledpin:trogdor";  
   char *host = "ol7di6.messaging.internetofthings.ibmcloud.com";  
   char *authtoken = "1110065847";  
   char *auth = "use-token-auth";
   char *topic = "iot-2/cmd/color/fmt/string";  
   ```
   
2. Update app.js with the correct DEVICE ID and DEVICE TYPE.
   ```
   appClient.subscribeToDeviceStatus("DEVICE_TYPE");  // TODO Update with your device type
   ```
   
   ```
   // TODO Update with your IoT device information: Device Type and Device ID
   appClient.publishDeviceCommand("DEVICE_TYPE","DEVICE_ID", "color", "string", led);
   ```
