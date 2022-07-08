const express_routes = require('express');
let request = require('request'); // "Request" library
let axios = require("axios");
let cors = require('cors');
let querystring = require('querystring');
let cookieParser = require('cookie-parser');
require('dotenv').config();
let helpers = require("./helpers");
import {
  Firestore,
  collection,
  addDoc,
} from "firebase/firestore";
import { firestore, auth } from "./lib/firebase";
import * as CollectionConstants from "./lib/CollectionConstants";
import FirestoreUser from "./lib/FirestoreUser";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  UserCredential,
} from "firebase/auth";

import AggregatedTracksByArtist from "./models/AggregatedTracksByArtist";
import Playlist from "./models/Playlist";
import Track from "./models/Track";
import User from "./models/User";
import Image from "./models/Image"

const client_id: string = process.env.CLIENT_ID; // Your client id
const client_secret: string = process.env.CLIENT_SECRET; // Your secret
const redirect_uri: string = `${process.env.SERVER_ENV}/callback`; // Your redirect uri
let stateKey = 'spotify_auth_state';
let router = express_routes.Router();
let aggregatedTracksByArtistList: AggregatedTracksByArtist[] = [];

router.use(express_routes.static(__dirname + '/public'))
  .use(cors({origin: true}))
  .use(cookieParser())
  .use(express_routes.json())

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

router.get('/callback', async function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(process.env.CLIENT_ENV + '/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    // let authOptions = {
    //   form: {
    //     code: code,
    //     redirect_uri: redirect_uri,
    //     grant_type: 'authorization_code'
    //   },
    //   headers: {
    //     "Content-Type": "multipart/form-data",
    //     'Accept' : 'application/json',
    //     'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    //   },
    //   json: true
    // };
    const headers = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        username: process.env.CLIENT_ID,
        password: process.env.CLIENT_SECRET,
      },
    };
    const data = {
      //grant_type: 'client_credentials',
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    };

    const response = await axios.post('https://accounts.spotify.com/api/token', 
      querystring.stringify(data),
      headers)
      .catch(error => {
        console.log("Could not get tokens")
      });
  
    if (response.status === 200) {
      let access_token = response.data.access_token,
          refresh_token = response.data.refresh_token;
      console.log("response.data.access_token")
      console.log(response.data.access_token)
      let headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      };

      //use the access token to access the Spotify Web API
      const userRes = await axios.get('https://api.spotify.com/v1/me', { headers })
      .catch(error => {
        console.log("Could not get user profile.")
      });
      console.log("userRes.data")
      console.log(userRes.data)

      let user = userRes.data;

      // we can also pass the token to the browser to make requests from there
      res.redirect(process.env.CLIENT_ENV + '/#' +
        querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token,
          spotify_user_id: user.id
        }));
    } else {
      res.redirect(process.env.CLIENT_ENV + '/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
  }
});

router.get('/refresh_token', function(req, res) {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
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

router.get('/logout', function(req, res) {
  res.clearCookie(stateKey);
  res.redirect(process.env.CLIENT_ENV);
});

router.get("/return-home", function(req, res) {
  res.redirect(process.env.CLIENT_ENV);
});

router.get("/get-liked-tracks", async function(req, res) {
  
  res.send(aggregatedTracksByArtistList);
});

// Main program thread
router.get("/run-process", async function(req, res) {
  console.log("Run Process")
  let savedTracksOptions = {
    url: 'https://api.spotify.com/v1/me/tracks',
    headers: { 'authorization': 'Bearer ' + req.query.access_token },
    'Content-Type': "application/json",
    json: true
  };

  let finiteLoop = 500;
  try {
    while(finiteLoop >= 0) {
      let res = await axios(savedTracksOptions.url, {
        method: 'GET',
        headers: savedTracksOptions.headers,
        'Content-Type': savedTracksOptions["Content-Type"],
        json: savedTracksOptions.json
      });
      
      const trackArr: Track[] = [];
      for(let i = 0; i < res.data['items']?.length ?? 0; i++) {
        trackArr.push(new Track(res.data['items'][i]['track']));
      }

      // Get all the playlists
      aggregatedTracksByArtistList = aggregatedTracksByArtistList.concat(helpers.GetAggregatedTracksByArtist(trackArr));

      if(res.data?.next === null) {
        console.log(res)
      }
      if(res.data?.next === null && res.data?.total !== 0) {
        finiteLoop = 0;
      }
      savedTracksOptions.url = res.data.next;
      if(res.data.total === 0) savedTracksOptions.url = res.data.href;
      console.log(res.status)
      console.log(res.data.next)
      if(savedTracksOptions.url === undefined) finiteLoop = 0;
      finiteLoop = finiteLoop - 1;
    }
  } catch(exception) {
    console.log("An exception occurred when getting liked tracks.");
    console.log(exception);
  }
  console.log("FINISHED GETTING TRACKS.")
  aggregatedTracksByArtistList = helpers.RemoveDuplicateTrackLists(aggregatedTracksByArtistList);

  // Create playlists
  for(let i = 0; i < aggregatedTracksByArtistList.length; i++) {
    let playlist: Playlist = null
    for(let h = 0; h < 5; h++) {
      if(h > 0) console.log("Playlist creation retry. " + h)
      try {
        await axios(`https://api.spotify.com/v1/users/${req.query.spotify_user_id}/playlists`, {
          method: 'POST',
          data: {
            name: `z${aggregatedTracksByArtistList[i].Artist.name} - $saved`,
            public: false, //private playlist
            collaborative: false,
            description: `Your favorite songs from ${aggregatedTracksByArtistList[i].Artist.name}`
          },
          headers: { 
            "Content-Type": "application/json",
            'Accept' : 'application/json',
            'authorization': 'Bearer ' + req.query.access_token 
          },
          json: true
        }).then((res) => {
          if(res.status === 201) h = 5;
          playlist = new Playlist(res.data ?? {});
          console.log("Add playlist: " + res.status);
        });  
        
      } catch(error) {
        console.log("An exception occurred when creating a playlist.")
      };
    }

    let trackUris: string[] = [];
    for(let h = 0; h < aggregatedTracksByArtistList[i].Tracks.length; h++) {
      trackUris.push(aggregatedTracksByArtistList[i].Tracks[h].uri);
    }

    if(playlist === null) continue;
    let addTracksOptions = {
      url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      data: {
        position: "0",
        uris: trackUris
      },
      headers: { 
        'Content-Type': "application/json",
        'authorization': 'Bearer ' + req.query.access_token 
      },
      json: true
    }
    for(let f = 0; f < 5; f++){
      if(f > 0) console.log("Retry adding track. " + f)
      try {
        const response = await axios(addTracksOptions.url, {
          method: 'POST',
          data: addTracksOptions.data,
          headers: addTracksOptions.headers,
          json: addTracksOptions.json
        }).then((res) => {
          if(res.status === 201 || res.status === 200) f = 5;
          console.log("Add track: "+res.status);
        })
        
      } catch(error) {
        console.log("An exception occurred when adding a track.");
      }
    }
  }
  console.log("Finished creating playlists!");
  aggregatedTracksByArtistList = [];
  res.redirect(`${process.env.CLIENT_ENV}/successfulCreate.html#access_token=${req.query.access_token}&refresh_token=${req.query.refresh_token}&spotify_user_id=${req.query.spotify_user_id}`);
})

router.get("/unfollow-root-playlists", async function(req, res) {
  console.log("goodbye");
  let hasFiveOTwo: boolean = true;
  while(hasFiveOTwo) {
    hasFiveOTwo = false;
    let getPlaylistsOptions = {
      url: `https://api.spotify.com/v1/users/${req.query.spotify_user_id}/playlists`,
      headers: { 'authorization': 'Bearer ' + req.query.access_token },
      'Content-Type': "application/json",
      json: true
    };

    let finiteLoop = 500;
      while(finiteLoop >= 0) {
        try {
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
                  headers: { 'authorization': 'Bearer ' + req.query.access_token },
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
          }
          getPlaylistsOptions.url = res.next;
          if(getPlaylistsOptions.url === undefined) finiteLoop = 0;
          finiteLoop = finiteLoop - 1;
        } catch(exception) {
          console.log("An exception occurred when removing playlists.")
        }
    }
    
    if(hasFiveOTwo) console.log("Looping through all playlists again.")
    console.log(hasFiveOTwo)
  }
  console.log("Finished deleting playlists.")
  res.redirect(`${process.env.CLIENT_ENV}/successfulUnfollow.html#access_token=${req.query.access_token}&spotify_user_id=${req.query.spotify_user_id}`);
});

router.post('/subscribe', async function(req, res) {
  const name: string = req.body.name;
  const email: string = req.body.email;
  const password: string = req.body.password;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const userObj = new FirestoreUser({
      name: name,
      refresh_token: req.body.refresh_token,
      AuthID: userCredential.user.uid,
      SpotifyUserID: req.body.spotify_user_id
    });
    console.log("userObj")
    console.log(userObj)
    addDoc(
      collection(firestore, CollectionConstants.Users),
      JSON.parse(JSON.stringify(userObj))
    ).then((res) => {
      userObj.SetDocumentID = res.id;
    });
    
    console.log("Successfully created user");
    res.redirect(process.env.CLIENT_ENV);
  } catch (exception) {
    console.log("Something went wrong.");
  }
});

// call individually for every subscribed user
// can't do all users in one call because of timeout
// Scheduled Job url:
// https://console.cloud.google.com/cloudscheduler?project=artists-saved-songs-playlists
router.get('/update-subscribers', function(req, res) {
  // Get all documents from Users collection
  
  // Async refresh access token

  // Sync call to /UpdateSavedSongsPlaylists/update-users-playlists
  // , querystring({
  //    access_token: access_token,
  //    spotify_user_id: userDoc.SpotifyUserID
  // }) 
})

module.exports = router