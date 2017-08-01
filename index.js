var config = require('./config.js');
var flock = require('flockos');
var express = require('express');
var CronJob = require('cron').CronJob;
var https = require('https');
var mysql = require('mysql');

var connection  = mysql.createConnection({
  host     : '',
  user     : '',
  password : '',
  database : ''
});
connection.connect();
//var Parser = require("simple-text-parser");
var supportedSites = ['github, facebook'];

flock.appId = config.appId;
flock.appSecret = config.appSecret;

var app = express();
app.use(flock.events.tokenVerifier);
app.post('/events', flock.events.listener);

app.listen(8080, function() {
    console.log('Server listening at 8080');
});

flock.events.on('app.install', function(event, callback) {
    var user = {
        userid: event.userId,
        token: event.token
    };
    var query = connection.query('insert into Users set ?', user, function (error, results, fields) {
        if (error) throw error;
    });
    console.log(query.sql);
    callback();
});

flock.events.on('client.slashCommand',function(event, callback) {
	console.log('parse result',event.text);
	if(event.text) {
		console.log('subscribing api',event.text);
        if(event.text === 'github' || event.text === 'facebook') {
            console.log(' CONDITION TRUE');
            var user = {
                site: event.text,
                userid: event.userId
            };
            var query = connection.query('insert into Subscription set ?', user, function (error, results, fields) {
                if (error) throw error;
            });
            console.log(query.sql);
        }
		callback(null, { text: event.userName+' subscribed to API '+event.text});
	} else {
		callback(null, {text: 'API to be subscribed not specified'});
 	}
});

flock.events.on('app.uninstall', function(event, callback) {
    callback();
});

var job = new CronJob('5 * * * * *', function () {
    checkStatus();
    }, function() {

    },
    true
);

function checkStatus() {

    https.get('https://status.github.com/api/status.json', function (response) {
    response.on("data", function(data) {
        var resp = JSON.parse(data);
        if (resp.status !== "good") {
            notify('github');
        }
        else {
            console.log(resp.status);
        }
    });
    });

/*    https.get('https://www.facebook.com/platform/api-status', function (response) {
        console.log('FACEBOOK IN');
        console.log(response);
    response.on("data", function(data) {

        var resp = JSON.parse(data);
        if (resp.current.health === 1) {
            console.log('INSIDE HEALTH OF FACEBOOK');
            notify('facebook');
        }
        else {
            console.log(resp.current.health);
        }
    });
    });
*/

}

//function checkFBStatus() {

//}

var notify = function (siteToCheck) {
    connection.query('SELECT userid from Subscription where site=?', siteToCheck, function (error, results, fields) {
    if (error) throw error;
    console.log(siteToCheck);
    console.log(results);

    for (var i in results) {
        console.log(results[i]);
        flock.chat.sendMessage(config.botToken,{
    		to: results[i].userid,
    		text: siteToCheck + ' server is down',
    	});
    }

    });
}
