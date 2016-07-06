/*
 * Basic Code for Displaying Tones on Photon with NeoPixel Ring
 */

#include "application.h"
#include "neopixel/neopixel.h"
#include "MQTT/MQTT.h"

// IMPORTANT: Set pixel COUNT, PIN and TYPE
#define PIXEL_COUNT 24
#define PIXEL_PIN 6
#define PIXEL_TYPE WS2812B

Adafruit_NeoPixel strip = Adafruit_NeoPixel(PIXEL_COUNT, PIXEL_PIN, PIXEL_TYPE);

// Create variables to hold Watson IoT Foundation information
char *deviceID = "d:ORG:DEVICE-TYPE:DEVICE-ID";  
char *host = "ORG.messaging.internetofthings.ibmcloud.com";  
char *authtoken = "AUTH-TOKEN";  
char *auth = "use-token-auth";
char *topic = "iot-2/cmd/color/fmt/string";  

MQTT client( host, 1883, callback );

uint32_t b = strip.Color(0, 128, 255); // Joy
uint32_t y = strip.Color(255, 255, 0); // Sadness
uint32_t o = strip.Color(255, 153, 0); // Fear
uint32_t m = strip.Color(255, 0, 191); // Anger
uint32_t g = strip.Color(0, 255, 0);   // Disgust
uint32_t n = strip.Color(0, 0, 0);

void setup() {
    
    Serial.begin(9600);
    
    strip.begin();
    strip.setBrightness(40);
    
    char toneStats[ ] = "mmmmggggyyyyyyyyoooobbbb"; // Default pixel display
    colors(toneStats);

}

void loop() {
    if (!client.isConnected()) {
        Serial.print("Trying to connect to: ");
        Serial.println(host);
        client.connect(deviceID,auth,authtoken);
        client.subscribe(topic);
    } else {
        client.loop();
    }
}

void callback( char* topic, byte* payload, unsigned int length ) { 
    char toneStats[24];
    
    for(byte i=0;i<24;i++){
        toneStats[i]=(char)payload[i];
    }
    
    colors(toneStats);

}

void colors(char tone[24])
{
    for(byte i=0; i<24;i++){
        char color=tone[i];
        
        strip.setPixelColor(i,n);
        strip.show();
        delay(70);
        
        switch(color){
            case 'b': strip.setPixelColor(i,b); 
            break;
            case 'y': strip.setPixelColor(i,y); 
            break;
            case 'o': strip.setPixelColor(i,o); 
            break;
            case 'm': strip.setPixelColor(i,m); 
            break;
            case 'g': strip.setPixelColor(i,g);
            break;
            case ' ': strip.setPixelColor(i,n);
        }

    }

    strip.show();
    delay(25);
    
}

