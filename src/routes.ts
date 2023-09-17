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
import { Router } from "express";

const client_env = process.env.CLIENT_ENV; // Your client-side url
const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = `${process.env.SERVER_ENV}/callback`; // Your redirect uri
let stateKey: string = 'spotify_auth_state';
let router: Router = express_routes.Router();
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
  let scope: string = 'playlist-modify-private playlist-read-private user-library-read ugc-image-upload user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      show_dialog: true,
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
    res.redirect(client_env + '/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);

    const response = await axios('https://accounts.spotify.com/api/token',
      {
        method: "POST",
        headers: {
          Accept: 'application/json',
          'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
          //grant_type: 'client_credentials',
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        },
      })
      .catch(error => {
        console.log("Could not get tokens")
      });
  
    if (response.status === 200) {
      let access_token = response.data.access_token;
      let refresh_token = response.data.refresh_token;

      //use the access token to access the Spotify Web API
      const userRes = await axios('https://api.spotify.com/v1/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + access_token
        }
      })
      .catch(error => {
        console.log("Could not get user profile.")
      });

      let user = userRes.data;

      // we can also pass the token to the browser to make requests from there
      res.redirect(client_env + '/main.html#' +
        querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token,
          spotify_user_id: user.id
        }));
    } else {
      res.redirect(client_env + '/#' +
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
  res.redirect(client_env);
});

router.get("/return-home", function(req, res) {
  res.redirect(client_env);
});

router.get("/get-liked-tracks", async function(req, res) {
  
  res.send(aggregatedTracksByArtistList);
});

// Main program thread
// Introduce Parallel Execution to avoid timeout
router.get("/run-process", async function(req, res) {
  console.log("Run Process")
  let savedTracksUrl = 'https://api.spotify.com/v1/me/tracks';
  let finiteLoop = 500;
  try {
    while(finiteLoop >= 0) {
      let res = await axios(savedTracksUrl, {
        method: 'GET',
        headers: { 
          'authorization': 'Bearer ' + req.query.access_token,
          'Content-Type': 'application/json',
        },
        json: true
      });
      
      const trackArr: Track[] = [];
      for(let i = 0; i < res.data['items']?.length ?? 0; i++) {
        trackArr.push(new Track(res.data['items'][i]['track']));
      }

      // Get all the playlists
      aggregatedTracksByArtistList = aggregatedTracksByArtistList.concat(helpers.GetAggregatedTracksByArtist(trackArr));

      if(res.data?.next === null && res.data?.total !== 0) {
        finiteLoop = 0;
      }
      savedTracksUrl = res.data.next;
      if(res.data.total === 0) savedTracksUrl = res.data.href;
      console.log(res.status)
      console.log(res.data.next)
      if(savedTracksUrl === undefined) finiteLoop = 0;
      finiteLoop = finiteLoop - 1;
    }
  } catch(exception) {
    console.log("An exception occurred when getting liked tracks.");
    console.log("exception trace: ", exception.message);
  }
  console.log("FINISHED GETTING TRACKS.")
  aggregatedTracksByArtistList = helpers.RemoveDuplicateTrackLists(aggregatedTracksByArtistList);

  // Create playlists
  //aggregatedTracksByArtistList.forEach(async aggregatedTracksByArtist => {//for(let i = 0; i < aggregatedTracksByArtistList.length; i++) {
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
      } catch(exception) {
        console.log("An exception occurred when creating a playlist.");
        console.log("exception trace: ", exception.message);
      };
    }

    let trackUris: string[] = [];
    for(let h = 0; h < aggregatedTracksByArtistList[i].Tracks.length; h++) {
      trackUris.push(aggregatedTracksByArtistList[i].Tracks[h].uri);
    }

    if(playlist === null) return;
    for(let f = 0; f < 5; f++){
      if(f > 0) console.log("Retry adding track. " + f)
      try {
        const response = await axios(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: 'POST',
          data: {
            position: "0",
            uris: trackUris
          },
          headers: { 
            'Content-Type': "application/json",
            'authorization': 'Bearer ' + req.query.access_token 
          },
          json: true
        }).then((res) => {
          if(res.status === 201 || res.status === 200) f = 5;
          console.log("Add track: "+res.status);
        })
      } catch(exception) {
        console.log("An exception occurred when adding a track.");
        console.log("exception trace: ", exception.message);
      }
    }
  };
  console.log("Finished creating playlists!");
  aggregatedTracksByArtistList = [];
  res.redirect(`${client_env}/successfulCreate.html#access_token=${req.query.access_token}&refresh_token=${req.query.refresh_token}&spotify_user_id=${req.query.spotify_user_id}`);
})

router.get("/unfollow-root-playlists", async function(req, res) {
  console.log("goodbye");
  let hasFiveOTwo: boolean = true;
  while(hasFiveOTwo) {
    hasFiveOTwo = false;
    let finiteLoop = 500;
    let getPlaylistsUrl: string = `https://api.spotify.com/v1/users/${req.query.spotify_user_id}/playlists`;
    while(finiteLoop >= 0) {
      try {
        let res = null;
        // Get all playlists 
        await axios.get(getPlaylistsUrl, {
          headers: { 
            'authorization': 'Bearer ' + req.query.access_token,
            'Content-Type': 'application/json',
          },
          json: true
        })
        .then(async function(response) {
          res = response.data;
          for(let i = 0; i < response.data["items"].length; i++) {
            if(response.data["items"][i]["name"].includes("- $saved")) {
              await axios.delete(`https://api.spotify.com/v1/playlists/${response.data["items"][i]["id"]}/followers`, {
                headers: { 
                  'Content-Type': 'application/json',
                  'authorization': 'Bearer ' + req.query.access_token 
                },
                json: true,
                method: "DELETE",
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
        getPlaylistsUrl = res.next;
        if(getPlaylistsUrl === undefined) finiteLoop = 0;
        finiteLoop = finiteLoop - 1;
      } catch(exception) {
        console.log("An exception occurred when removing playlists.")
        if(finiteLoop > 10) finiteLoop = 10;
        else finiteLoop = finiteLoop - 1; 
      }
    }
    
    //Check if anymore remain
    if(!hasFiveOTwo) {
      let usersPlaylistsUrl = 'https://api.spotify.com/v1/me/playlists';
      let playlistArr = [];
      let res = await axios(usersPlaylistsUrl, {
        method: 'GET',
        headers: { 
          'authorization': 'Bearer ' + req.query.access_token,
          'Content-Type': 'application/json',              
        },
        json: true
      });
      for(let i = 0; i < res.data['items']?.length ?? 0; i++) {
        playlistArr.push(res.data['items'][i]);
      }
      // Keep only playlists I made
      // async playlistArr.filter
      // and it lets us break early
      for(let i = 0; i < playlistArr.length; i++) {
        if(playlistArr[i].name.includes("- $saved")) {
          hasFiveOTwo = true;
          break;
        }
      }
    }
    if(hasFiveOTwo) console.log("Looping through all playlists again.")
    console.log(hasFiveOTwo)
  }
  console.log("Finished deleting playlists.")
  res.redirect(`${client_env}/successfulUnfollow.html#access_token=${req.query.access_token}&refresh_token=${req.query.refresh_token}&spotify_user_id=${req.query.spotify_user_id}`);
});

// router.get('/subscribe', async function(req, res) {
//   const name: string = req.query.name as string;
//   const email: string = req.query.email as string;

//   try {
//     //const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//     const userObj: FirestoreUser = new FirestoreUser({
//       name: name,
//       Email: email,
//       refresh_token: req.query.refresh_token,
//       SpotifyUserID: req.query.spotify_user_id
//     });
//     console.log("userObj")
//     console.log(userObj)
//     await addDoc(
//       collection(firestore, CollectionConstants.Users),
//       JSON.parse(JSON.stringify(userObj))
//     ).then((res) => {
//       userObj.SetDocumentID = res.id;
//     });
//     console.log("Successfully created user");
//     res.redirect(client_env);
//   } catch (exception) {
//     console.log("Something went wrong.");
//     res.redirect(client_env);
//   }
// });

// router.get('/unsubscribe', async function(req, res) {
//   const collectionRef = collection(firestore, CollectionConstants.Users);
//   console.log(req.query.email)
//   const q = await query(
//       collectionRef,
//       where("Email", "==", req.query.email)
//   );
//   const docsRef = await getDocs(q);
//   const docRef = doc(collectionRef, docsRef.docs[0].id)
//   console.log("docRef")
//   console.log(docRef)
//   await deleteDoc(docRef);
//   res.redirect(client_env);
// })

// call individually for every subscribed user
// can't do all users in one call because of timeout
// Scheduled Job url:
// https://console.cloud.google.com/cloudscheduler?project=artists-saved-songs-playlists
// router.get('/update-subscribers', async function(req, res) {
//   const data = await getDocs(
//     collection(firestore, CollectionConstants.Users)
//   );
//   const users: FirestoreUser[] = [];
//   data.forEach((doc) => {
//     users.push(
//       new FirestoreUser({
//         name: doc.data().name,
//         Email: doc.data().Email,
//         refresh_token: doc.data().refresh_token,
//         AuthID: doc.data().AuthID,
//         SpotifyUserID: doc.data().SpotifyUserID,
//         DocumentID: doc.id,
//       })
//     );
//   });
//   console.log("users.length")
//   console.log(users.length)
//   for(let i = 0; i < users.length; i++) {
//     console.log(`${process.env.SERVER_ENV}/refresh_token?refresh_token=${users[i].refresh_token}`)
//     // Async refresh access token
//     const response = await axios.get(`${process.env.SERVER_ENV}/refresh_token?refresh_token=${users[i].refresh_token}`, 
//       {
//         'Content-Type': "application/json",
//         json: true
//       }
//     )
//     .catch(function(error) {
//       console.log("Failed to refresh token.")
//     })
//     const access_token: string = response.data.access_token;
    
//     const params = {
//       access_token: access_token,
//       spotify_user_id: users[i].SpotifyUserID
//     };
    
//     axios(`${process.env.SERVER_ENV}/update-users-playlists?access_token=${params.access_token}&spotify_user_id=${params.spotify_user_id}`,
//       {
//         method: 'GET',
//         headers: { 
//           "Content-Type": 'application/json',
//           'Accept' : 'application/json'
//         }
//       }
//     )
//     .catch(function(error) {
//       console.log("Failed to update users' playlists.")
//     })
//   }

//   res.send({success: "success"})
// })

router.get("/update-users-playlists", async (req, res) => {
  console.log("Run Cron Job")
  // Get 50 most recently liked songs 
  let savedTracksOptions = {
      url: 'https://api.spotify.com/v1/me/tracks?limit=50',
      headers: { 'authorization': 'Bearer ' + req.query.access_token },
      'Content-Type': "application/json",
      json: true
  };
  let aggregatedTracksByArtistList: AggregatedTracksByArtist[] = [];
  try {
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
  } catch(exception) {
      console.log("An exception occurred when getting liked tracks.");
      console.log("exception trace: ", exception.message);
  }
  console.log("FINISHED GETTING TRACKS.")
  aggregatedTracksByArtistList = helpers.RemoveDuplicateTrackLists(aggregatedTracksByArtistList);

  // Get all user's playlists
  let usersPlaylistsUrl = 'https://api.spotify.com/v1/me/playlists';
  let finiteLoop = 500;
  let playlistArr = [];
  try {
      while(finiteLoop >= 0) {
          let res = await axios(usersPlaylistsUrl, {
              method: 'GET',
              headers: { 
                'authorization': 'Bearer ' + req.query.access_token,
                'Content-Type': 'application/json',              
              },
              json: true
          });
          for(let i = 0; i < res.data['items']?.length ?? 0; i++) {
              playlistArr.push(res.data['items'][i]);
          }
          if(res.data?.next === null && res.data?.total !== 0) {
              finiteLoop = 0;
          }
          usersPlaylistsUrl = res.data.next;
          if(res.data.total === 0) usersPlaylistsUrl = res.data.href;
          if(usersPlaylistsUrl === undefined) finiteLoop = 0;
          finiteLoop = finiteLoop - 1;
      }
  } catch(exception) {
    console.log("An exception occurred when getting liked tracks.");
    console.log("exception trace: ", exception.message);
  }
  // Keep only playlists I made
  playlistArr = playlistArr.filter(playlist => playlist.name.includes("- $saved"));

  for(let i = 0; i < aggregatedTracksByArtistList.length; i++) {
      const playlistName: string = `z${aggregatedTracksByArtistList[i].Artist.name} - $saved`;
      // Get playlist by name 
      // .href: string
      const matchingPlaylistArr = playlistArr.filter(playlist => playlist.name.includes(playlistName));
      if(matchingPlaylistArr.length) {
        const existingPlaylistWithHref = matchingPlaylistArr[0];
        // GET TRACKS IN EXISTING PLAYLIST
        const resTracks = await axios(existingPlaylistWithHref.tracks.href, {
          method: 'GET',
          headers: {
            'authorization': 'Bearer ' + req.query.access_token,
            'Content-Type': "application/json",
            json: true
          }
        })
        const existingPlaylistTracks: Track[] = resTracks.data.items.map(item => new Track(item.track))

        // n^2 Search could be improved
        // no repeat adds
        const newTrackUris: string[] = [];
        for(let h = 0; h < aggregatedTracksByArtistList[i].Tracks.length; h++) {
          let hasSong: boolean = false;
          for(let j = 0; j < existingPlaylistTracks.length; j++){
            if(aggregatedTracksByArtistList[i].Tracks[h].name === existingPlaylistTracks[j].name) {
              hasSong = true;
              break;
            }
          } 
          if(!hasSong) {
            newTrackUris.push(aggregatedTracksByArtistList[i].Tracks[h].uri)
          }
        }

        if(newTrackUris.length) {
          // add new tracks to playlist
          let addTracksOptions = {
            url: `https://api.spotify.com/v1/playlists/${existingPlaylistWithHref.id}/tracks`,
            data: {
                position: "0",
                uris: newTrackUris
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
                  
              } catch(exception) {
                  console.log("An exception occurred when adding a track.");
                  console.log("exception trace: ", exception.message);
              }
          }
        }
      } else if(!matchingPlaylistArr.length) {
          // If that fails, make the playlist
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
                  
              } catch(exception) {
                  console.log("An exception occurred when creating a playlist.");
                  console.log("exception trace: ", exception.message);
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
                  
              } catch(exception) {
                  console.log("An exception occurred when adding a track.");
                  console.log("exception trace: ", exception.message);
              }
          }
      }
  }

  res.send("FINISHED GETTING TRACKS.")
})

module.exports = router