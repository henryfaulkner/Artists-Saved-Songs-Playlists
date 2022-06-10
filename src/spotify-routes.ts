import { callbackify } from "util";
import Track from "./models/Track";

const express_spotify = require('express');
let request_spotify = require('request'); // "Request" library
let cors_spotify = require('cors');
let querystring_spotify = require('querystring');
let cookieParser_spotify = require('cookie-parser');

const router_spotify = express_spotify.Router();
let stateKey_spotify = 'spotify_auth_state';
const helpers_spotify = require("./helpers")

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
          
        // creating Track objects from response
        const trackArr: Track[] = [];
        for(let i = 0; i < body['items'].length; i++) {
            trackArr.push(new Track(body['items'][i]['track']))
        }

        helpers_spotify.GetAggregatedTracksByArtist(trackArr)
    })
});

module.exports = router_spotify;