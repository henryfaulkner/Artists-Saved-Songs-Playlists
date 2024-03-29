# Artists-Saved-Songs-Playlists

This Node.js app creates playlists which imitate Spotify's deprecated "listen to saved songs by specific artist in Your Library" functionality.

# Hosted at [https://artists-saved-songs-playlists.azurewebsites.net](https://artists-saved-songs-playlists.azurewebsites.net)

## Spotify Authorization Scopes used

- playlist-modify-private
- playlist-read-private
- user-library-read

## Starting the server

- run 'npm i'
- run 'ts-node .' or 'npx nodemon src/server.ts' to run with nodemon

## Development

- Start server in one terminal
- Use 'npm run watch-sass' for continuous CSS compilation in another terminal
  or 'npm run compile-sass' for immediate compilation.

## Deployment

- Deploy to Firebase with 'firebase deploy'
