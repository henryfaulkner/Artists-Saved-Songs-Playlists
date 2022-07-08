const functions = require("firebase-functions");
const express = require("express");
let cookieParser = require('cookie-parser');
const cors = require("cors");
let axios = require("axios");
let helpers = require("./helpers");

const app = express();
app.use(cookieParser()).use(cors({origin: true}));
let router = express.Router();

import AggregatedTracksByArtist from "./models/AggregatedTracksByArtist";
import Playlist from "./models/Playlist";
import Track from "./models/Track";
import User from "./models/User";
import Image from "./models/Image"


// query string needs access_token and user_id
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
        console.log(exception);
    }
    console.log("FINISHED GETTING TRACKS.")
    aggregatedTracksByArtistList = helpers.RemoveDuplicateTrackLists(aggregatedTracksByArtistList);

    // Get all user's playlists
    let usersPlaylistsOptions = {
        url: `https://api.spotify.com/v1/me/playlists`,
        headers: { 'authorization': 'Bearer ' + req.query.access_token },
        'Content-Type': "application/json",
        json: true
    };
    let finiteLoop = 500;
    let playlistArr: Playlist[] = [];
    try {
        while(finiteLoop >= 0) {
            let res = await axios(usersPlaylistsOptions.url, {
                method: 'GET',
                headers: usersPlaylistsOptions.headers,
                'Content-Type': usersPlaylistsOptions["Content-Type"],
                json: usersPlaylistsOptions.json
            });
            for(let i = 0; i < res.data['items']?.length ?? 0; i++) {
                playlistArr.push(new Playlist(res.data['items'][i]));
            }
            if(res.data?.next === null && res.data?.total !== 0) {
                finiteLoop = 0;
            }
            usersPlaylistsOptions.url = res.data.next;
            if(res.data.total === 0) usersPlaylistsOptions.url = res.data.href;
            if(usersPlaylistsOptions.url === undefined) finiteLoop = 0;
            finiteLoop = finiteLoop - 1;
        }
    } catch(exception) {
      console.log("An exception occurred when getting liked tracks.");
    }
    // Keep only playlists I made
    playlistArr = playlistArr.filter(playlist => playlist.name.includes("- $saved"));
    console.log("playlistArr.length")
    console.log(playlistArr.length)

    for(let i = 0; i < aggregatedTracksByArtistList.length; i++) {
        const playlistName: string = `z${aggregatedTracksByArtistList[i].Artist.name} - $saved`;
        
        // Get playlist by name
        const matchingPlaylistArr: Playlist[] = playlistArr.filter(playlist => playlist.name.includes(playlistName));
        if(matchingPlaylistArr.length && false) {
            // NEED TO CHECK FOR IF THE TRACK EXISTS IN HERE
            const matchingPlaylist = matchingPlaylistArr[0];
            let trackUris: string[] = [];
            for(let h = 0; h < aggregatedTracksByArtistList[i].Tracks.length; h++) {
            trackUris.push(aggregatedTracksByArtistList[i].Tracks[h].uri);
            }

            if(matchingPlaylist === null) continue;
            let addTracksOptions = {
                url: `https://api.spotify.com/v1/playlists/${matchingPlaylist.id}/tracks`,
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
    }

    res.send("FINISHED GETTING TRACKS.")
})

app.use(router)

export default app;