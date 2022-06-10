import { callbackify } from "util";

const express_spotify = require('express');
let request_spotify = require('request'); // "Request" library
let cors_spotify = require('cors');
let querystring_spotify = require('querystring');
let cookieParser_spotify = require('cookie-parser');

const router_spotify = express_spotify.Router();
let stateKey_spotify = 'spotify_auth_state';

router_spotify.use(express_spotify.static(__dirname + '/public'))
   .use(cors_spotify())
   .use(cookieParser_spotify());

router_spotify.get("/get-liked-tracks", function(req, res) {
    let savedTracksOptions = {
        url: 'https://api.spotify.com/v1/me/tracks',
        headers: { 'authorization': 'Bearer ' + process.env.access_token },
        'Content-Type': "application/json",
        json: true
      };

    let saved_tracks; 
    request_spotify(savedTracksOptions, (error, response, body)=>{
     
        // Printing the error if occurred
        if(error) console.log(error)
        
        // Printing status code
        console.log(response.statusCode);
          
        // Printing body
        console.log(body);
        body['items'].forEach((item: { added_at: string, track: [Object] }) => {
            console.log("item.track");
            console.log(item.track);
        })
    })
});

module.exports = router_spotify;