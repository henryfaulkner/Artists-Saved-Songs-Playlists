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

router_spotify.get("/read-playlists", function(req, res) {
    console.log("access_token")
    console.log(process.env.access_token)
});

module.exports = router_spotify;