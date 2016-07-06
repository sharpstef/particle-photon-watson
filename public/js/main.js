$(document).ready(function() {

    // Call the graph creator for the toneGraph div
    initGraph('toneGraph');

    // Null out global variables and set div elements for doughnuts
    var a, d, f, j, s;
    var eDonut;
    var lDonut;
    var sDonut;
    var eDiv = $("#eDonut");
    var sDiv = $("#sDonut");
    var lDiv = $("#lDonut");

    // Create a client connection to server with socket.io
    var socket = io({
        forceNew: true,
        autoConnect: true
    });
    socket.connect();

    // Receive the tag for the data and update the tag div
    socket.on('currentTag', function(data) {

        $("#tag").fadeOut('slow', function() {
            $("#tag").html(data[0]);
            $("#tag").fadeIn('slow');
        });

    });

    // Receive new stats. 
    socket.on('stats', function(data) {

        var tones = [];
        var total = data[3]; // Need this to do some math

        console.log("Received tone data from server.");

        // Data format --------------------------------------------------------------------
        // [Anger, Disgust, Fear, Joy, Sadness]
        // [Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism]
        // [Analytical, Confident, Tentative]
        // Total
        // --------------------------------------------------------------------------------

		// Create percentages for the boxes
        for (var i = 0; i < 3; i++) {
            var traits = data[i];
            var scores = [];

            for (var t = 0; t < traits.length; t++) {
                var score = traits[t];

                var percentage = Math.round((score / total) * 100);
                scores.push(percentage);
            }

            tones.push(scores);
        }

		// Fade update the total number of Tweets in the pies section
        $("#tweetsTotal").fadeOut('slow', function() {
            $("#tweetsTotal").html(total);
            $("#tweetsTotal").fadeIn('slow');
        });

        // Update the three doughnuts with the raw data 
		updateEmotion(data[0]);
        updateLanguage(data[1]);
        updateSocial(data[2]);

        // Update the boxes with the calculated percentages from the for loop
		updatePercentages(tones[0]);
    });

	// Smoothie chart keeps a stream of raw data for Tweets, the more Tweets the crazier it looks
    socket.on('tweet', function(data) {
        console.log("New tweet data for chart.");

        updateChart(data);
    });

    /*
     *
     * Renders for the doughnut charts
     *
     */

    // Global chart settings and colors
    Chart.defaults.global.legend.display = false;
    var bg5 = ["rgba(0,255,255,1)", "rgba(230,184,0,1)", "rgba(255,0,254,1)", "rgba(255,136,0,1)", "rgba(0,255,156,1)"];
    var bg3 = ["rgba(0,255,255,1)", "rgba(230,184,0,1)", "rgba(255,0,254,1)"];

    // Create the base Emotion doughnut chart 
    eDonut = new Chart(eDiv, {
        type: 'doughnut',
        data: {
            labels: ["Anger", "Disgust", "Fear", "Joy", "Sadness"],
            datasets: [{
                data: [10, 20, 30, 20, 20],
                backgroundColor: bg5,
                hoverBackgroundColor: bg5
            }]
        }
    });

    // Create the base Language doughnut chart
    lDonut = new Chart(lDiv, {
        type: 'doughnut',
        data: {
            labels: ["Analytical", "Confident", "Tentative"],
            datasets: [{
                data: [10, 20, 70],
                backgroundColor: bg3,
                hoverBackgroundColor: bg3
            }]
        }
    });

    // Create the base Social doughnut chart
    sDonut = new Chart(sDiv, {
        type: 'doughnut',
        data: {
            labels: ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"],
            datasets: [{
                data: [10, 20, 30, 20, 20],
                backgroundColor: bg5,
                hoverBackgroundColor: bg5
            }]
        }
    });

    /*
     * initGraph - Function to render the graph
     *
     * Uses the smoothie.js library to stream the lines every minute (60000 * milliseconds). When live streaming is turned off the graph  
     * uses cached data from the server. 
     *
     * @div {string} div - identifier for canvas from index
     *
     */
    function initGraph(div) {

        // Set colors for lines to match boxes in Index
        var aOptions = {
            strokeStyle: 'rgba(0,255,255,1)',
            lineWidth: 3
        };
        var dOptions = {
            strokeStyle: 'rgba(230,184,0,1)',
            lineWidth: 3
        };
        var fOptions = {
            strokeStyle: 'rgba(255,0,254,1)',
            lineWidth: 3
        };
        var jOptions = {
            strokeStyle: 'rgba(255,136,0,1)',
            lineWidth: 3
        };
        var sOptions = {
            strokeStyle: 'rgba(0,255,156,1)',
            lineWidth: 3
        };


        // Build the timeline
        var timeline = new SmoothieChart();
        var canvas = document.getElementById(div);

        //Initialize the three lines
        a = new TimeSeries(); // a - anger
        d = new TimeSeries(); // d - disgust
        f = new TimeSeries(); // f - fear
        j = new TimeSeries(); // j - joy
        s = new TimeSeries(); // s - sadness

        //Add lines to chart with styling options
        timeline.addTimeSeries(a, aOptions);
        timeline.addTimeSeries(d, dOptions);
        timeline.addTimeSeries(f, fOptions);
        timeline.addTimeSeries(j, jOptions);
        timeline.addTimeSeries(s, sOptions);

        //Render the chart on the index page	
        timeline.streamTo(canvas, 1000);

    } //End of initGraph function

    /*
     * updatePercentages - Update the boxes below smoothy chart
     * updateEmotional - Update emotion doughnut
     * updateSocial - Update social doughnut
     * updateLanguage - Update language doughnut
     *
     * Takes in the new data from socket and updates charts on front
     *
     * @data {array} array of percent rounded values
     *
     */
    function updatePercentages(tones) {
        contentFade("a", tones[0]);
        contentFade("d", tones[1]);
        contentFade("f", tones[2]);
        contentFade("j", tones[3]);
        contentFade("s", tones[4]);
    }

    function updateEmotion(data) {

        eDonut.data.datasets[0].data = data;
        eDonut.update();
    }

    function updateSocial(data) {

        sDonut.data.datasets[0].data = data;
        sDonut.update();
    }

    function updateLanguage(data) {

        lDonut.data.datasets[0].data = data;
        lDonut.update();
    }

    function updateChart(data) {
        var time = new Date().getTime();

        a.append(time, data[0]);
        d.append(time, data[1]);
        f.append(time, data[2]);
        j.append(time, data[3]);
        s.append(time, data[4]);
    }

    /*
     * contentFade - Creates a fade effect for a div
     *
     * Updates the boxes in Index with numeric value for trait.
     *
     * @id {string} id - identifier for trait div
     * @content {integer} number - percentage of trait
     *
     */
    function contentFade(id, content) {

        content = Math.floor(content);

        $("#" + id).fadeOut('slow', function() {
            $("#" + id).html(content + "%");
            $("#" + id).fadeIn('slow');
        });

    }
});