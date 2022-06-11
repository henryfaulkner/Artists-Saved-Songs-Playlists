const express_routes = require('express');
let request = require('request'); // "Request" library
let cors = require('cors');
let querystring = require('querystring');
let cookieParser = require('cookie-parser');
require('dotenv').config();
let helpers = require("./helpers");

import AggregatedTracksByArtist from "./models/AggregatedTracksByArtist";
import Track from "./models/Track";

const client_id: string = process.env.CLIENT_ID; // Your client id
const client_secret: string = process.env.CLIENT_SECRET; // Your secret
const redirect_uri: string = 'http://localhost:8888/callback'; // Your redirect uri
let stateKey = 'spotify_auth_state';
let router = express_routes.Router();
let aggregatedTracksByArtistList: AggregatedTracksByArtist[] = [];


router.use(express_routes.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

router.get('/success', (req, res) => {
  res.send({
    status: "success"
  })
})

router.get('/login', function(req, res) {

  let state = helpers.GenerateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  let scope = 'playlist-modify-private user-library-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

router.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        let access_token = body.access_token,
            refresh_token = body.refresh_token;

        process.env.access_token = access_token;
        process.env.refresh_token = refresh_token;

        let options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

router.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  let refresh_token = req.query.refresh_token;
  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      let access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

router.get("/get-liked-tracks", function(req, res) {
  let savedTracksOptions = {
      url: 'https://api.spotify.com/v1/me/tracks',
      headers: { 'authorization': 'Bearer ' + process.env.access_token },
      'Content-Type': "application/json",
      json: true
    };

  request(savedTracksOptions, (error, response, body) => {
   
      // Printing the error if occurred
      if(error) console.log(error)
      
      // Printing status code
      console.log(response.statusCode);
        
      // creating Track objects from response
      const trackArr: Track[] = [];
      for(let i = 0; i < body['items']?.length ?? 0; i++) {
          trackArr.push(new Track(body['items'][i]['track']))
      }

      aggregatedTracksByArtistList = helpers.GetAggregatedTracksByArtist(trackArr)
  })
  res.redirect('/');
});

router.get("/set-artist-image", function(req, res) {
  let artistOptions = {
    url: `${req["artist_href"]}`, //https://api.spotify.com/v1/artists/{id}
    headers: { 'authorization': 'Bearer ' + process.env.access_token },
    'Content-Type': "application/json",
    json: true
  };

  request(artistOptions, (error, response, body) => {
   
    // Printing the error if occurred
    if(error) console.log(error);
    
    // Printing status code
    console.log(response.statusCode);
      
    res = body["images"];
  });
});

router.get("/set-artists-image", function(req, res) {
  for(let i = 0; i < aggregatedTracksByArtistList.length; i++){
    let artistOptions = {
      url: `${aggregatedTracksByArtistList[i].Artist.href}`, //https://api.spotify.com/v1/artists/{id}
      headers: { 'authorization': 'Bearer ' + process.env.access_token },
      'Content-Type': "application/json",
      json: true
    };

    request(artistOptions, (error, response, body) => {
      // Printing the error if occurred
      if(error) console.log(error);
      
      // Printing status code
      console.log(response.statusCode);
        
      aggregatedTracksByArtistList[i].Artist.Image = body["images"][0];
    });
  }
  res.redirect('/');
});

router.get("/create-playlists", function(req, res) {

});

module.exports = router