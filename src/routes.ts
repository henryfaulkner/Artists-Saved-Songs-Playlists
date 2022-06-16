const express_routes = require('express');
let request = require('request'); // "Request" library
let axios = require("axios");
let cors = require('cors');
let querystring = require('querystring');
let cookieParser = require('cookie-parser');
require('dotenv').config();
let helpers = require("./helpers");

import AggregatedTracksByArtist from "./models/AggregatedTracksByArtist";
import Playlist from "./models/Playlist";
import Track from "./models/Track";
import User from "./models/User";
import Image from "./models/Image"

const client_id: string = process.env.CLIENT_ID; // Your client id
const client_secret: string = process.env.CLIENT_SECRET; // Your secret
const redirect_uri: string = 'http://localhost:8888/callback'; // Your redirect uri
let stateKey = 'spotify_auth_state';
let router = express_routes.Router();
let user: User;
let aggregatedTracksByArtistList: AggregatedTracksByArtist[] = [];

router.use(express_routes.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(express_routes.json());

router.get('/success', (req, res) => {
  res.send({
    status: "success"
  })
})

router.get('/login', function(req, res) {

  let state = helpers.GenerateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  let scope = 'playlist-modify-private playlist-read-private user-library-read ugc-image-upload';
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
          user = body;
          console.log(body);
          console.log(access_token)
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

router.get("/return-home", function(req, res) {
  res.redirect("/");
});

router.get("/get-liked-tracks", async function(req, res) {
  let savedTracksOptions = {
      url: 'https://api.spotify.com/v1/me/tracks',
      headers: { 'authorization': 'Bearer ' + process.env.access_token },
      'Content-Type': "application/json",
      json: true
    };

  let finiteLoop = 500;
  try {
    while(finiteLoop >= 0) {
      let res = null;
      await axios.get(savedTracksOptions.url, {
        headers: savedTracksOptions.headers,
        'Content-Type': savedTracksOptions["Content-Type"],
        json: savedTracksOptions.json
      }).then(function (response) {
        res = response.data;
    
        // creating Track objects from response
        const trackArr: Track[] = [];
        for(let i = 0; i < res['items']?.length ?? 0; i++) {
            trackArr.push(new Track(res['items'][i]['track']));
        }

        aggregatedTracksByArtistList = aggregatedTracksByArtistList.concat(helpers.GetAggregatedTracksByArtist(trackArr));
      }).then(function(error){
        if(error) console.log(error)
      }).then(function() {
        console.log("Done!")
      })

      if(res?.next === null) {
        finiteLoop = 0;
        res.send(aggregatedTracksByArtistList);
      }
      savedTracksOptions.url = res.next;
      if(savedTracksOptions.url === undefined) finiteLoop = 0;
      finiteLoop = finiteLoop - 1;
    }
  } catch(exception) {
    console.log("An exception occurred when getting liked tracks.")
  }
  res.send(aggregatedTracksByArtistList);
});

router.get("/set-artist-image", function(req, res) {
  let artistOptions = {
    url: `${req["artist_href"]}`, //https://api.spotify.com/v1/artists/{id}
    headers: { 'authorization': 'Bearer ' + process.env.access_token },
    'Content-Type': "application/json",
    json: true
  };

  request(artistOptions, (error, response, body) => {
    if(error) console.log(error);
    console.log(response.statusCode);
      
    res = body["images"];
  });
});

// TODO: Use Add Custom Playlist Cover Image 
router.get("/set-artists-image", function(req, res) {
  for(let i = 0; i < aggregatedTracksByArtistList.length; i++){
    let artistOptions = {
      url: `${aggregatedTracksByArtistList[i].Artist.href}`, //https://api.spotify.com/v1/artists/{id}
      headers: { 'authorization': 'Bearer ' + process.env.access_token },
      'Content-Type': "application/json",
      json: true
    };

    request(artistOptions, (error, response, body) => {
      if(error) console.log(error);
      if(response) console.log(response.statusCode);
        
      if(body["images"] === undefined) aggregatedTracksByArtistList[i].Artist.Image = new Image({});
      else aggregatedTracksByArtistList[i].Artist.Image = body["images"][0];
    });
  }
  res.redirect('/');
});

//req should be an Artist object
router.post("/create-playlist", function(req, res) {
  const playlistOptions = {
    url: `https://api.spotify.com/v1/users/${user.id}/playlists`,
    body: {
      name: `z${req.body.Artist.name} - $saved`,
      public: false, //private playlist
      collaborative: false,
      description: `Your favorite songs from ${req.body.Artist.name}`
    },
    headers: { 'authorization': 'Bearer ' + process.env.access_token },
    'Content-Type': "application/json",
    json: true
  }

  request.post(playlistOptions, (error, response, body) => {
    console.log(body)
    res.send(body);
  });
});

// Main program thread
router.get("/run-process", async function(req, res) {
  await axios.get("http://localhost:8888/get-liked-tracks")
  .then(function (response) {
    request("http://localhost:8888/set-artists-image");

    // Create playlists
    for(let i = 0; i < aggregatedTracksByArtistList.length; i++) {
      let createPlaylistOptions = {
        url: "http://localhost:8888/create-playlist",
        body: aggregatedTracksByArtistList[i],
        headers: { 'authorization': 'Bearer ' + process.env.access_token },
        'Content-Type': "application/json",
        json: true
      }
      request.post(createPlaylistOptions, (error, response, body) => {
        if(error) console.log(error);
        console.log(response.statusCode);
          
        const playlist: Playlist = new Playlist(body);
        let trackUris: string[] = [];
        for(let h = 0; h < aggregatedTracksByArtistList[i].Tracks.length; h++) {
          trackUris.push(aggregatedTracksByArtistList[i].Tracks[h].uri);
        }

        let addTracksOptions = {
          url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          body: {
            position: "0",
            uris: trackUris
          },
          headers: { 'authorization': 'Bearer ' + process.env.access_token },
          'Content-Type': "application/json",
          json: true
        }
        request.post(addTracksOptions, (error, response, body) => {
          if(error) console.log(error);
          console.log(response.statusCode);
        })

        let playlistImageOptions = {
          url: `https://api.spotify.com/v1/playlists/{playlist_id}/image`,
          body: {
            
          },
          headers: { 'authorization': 'Bearer ' + process.env.access_token },
          'Content-Type': "application/json",
          json: true
        };
      });
    }
  })
  .catch(function (error) {
    console.log("An exception occurred in the main thread.");
  })
  
  res.redirect("/")
})

router.get("/unfollow-root-playlists", async function(req, res) {
  let hasFiveOTwo: boolean = true;
  while(hasFiveOTwo) {
    hasFiveOTwo = false;
    let getPlaylistsOptions = {
      url: `https://api.spotify.com/v1/users/${user.id}/playlists`,
      headers: { 'authorization': 'Bearer ' + process.env.access_token },
      'Content-Type': "application/json",
      json: true
    };

    let finiteLoop = 500;
    try {
      while(finiteLoop >= 0) {
        let res = null;
        // Get all playlists 
        await axios.get(getPlaylistsOptions.url, {
          headers: getPlaylistsOptions.headers,
          'Content-Type': getPlaylistsOptions["Content-Type"],
          json: getPlaylistsOptions.json
        })
        .then(async function(response) {
          res = response.data;
          for(let i = 0; i < response.data["items"].length; i++) {
            if(response.data["items"][i]["name"].includes("- $saved")) {
              const deletePlaylistOptions = {
                url: `https://api.spotify.com/v1/playlists/${response.data["items"][i]["id"]}/followers`,
                headers: { 'authorization': 'Bearer ' + process.env.access_token },
                method: "DELETE",
                'Content-Type': "application/json",
                json: true
              };

              await axios.delete(deletePlaylistOptions.url, {
                headers: deletePlaylistOptions.headers,
                'Content-Type': deletePlaylistOptions["Content-Type"],
                json: deletePlaylistOptions.json,
                method: deletePlaylistOptions.method
              })
              .then(function(response) {
                console.log(response.status);
              })
              .catch(function(error) {
                console.log(error.response.status);
                if(error.response.status === 502) {
                  console.log(error.response.status);
                  hasFiveOTwo = true;
                }
              });
            }
          }
        });
        if(res?.next === null) {
          finiteLoop = 0;
          res.send(aggregatedTracksByArtistList);
        }
        getPlaylistsOptions.url = res.next;
        if(getPlaylistsOptions.url === undefined) finiteLoop = 0;
        finiteLoop = finiteLoop - 1;
      }
    } catch(exception) {
      console.log("exception occured")
    }
    if(hasFiveOTwo) console.log("Looping through all playlists again.")
    console.log(hasFiveOTwo)
  }
  console.log("Finished deleting playlists.")
  res.redirect("/");
});

module.exports = router