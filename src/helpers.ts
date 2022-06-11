var isEqual = require('lodash.isequal');
import AggregatedTracksByArtist from "./models/AggregatedTracksByArtist";
import Artist from "./models/Artist";
import Track from "./models/Track";

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const GenerateRandomString = function(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Takes song items' array and parses and aggregates them by artist
 * @param {Track[]} list of Tracks
 * @return {AggregatedTracksByArtist[]} list of list of tracks aggregated by Artist
 */
const GetAggregatedTracksByArtist = (tracks: Track[]) => {
  const aggregatedTracksByArtistList: AggregatedTracksByArtist[] = [];

  for(let i = 0; i < tracks.length; i++) {
    let index;
    if(index = DoesArtistHaveAggregation(aggregatedTracksByArtistList, tracks[i].Artists[0])){
      aggregatedTracksByArtistList[index].AddTrack(tracks[i]);
      continue;
    } 

    aggregatedTracksByArtistList.push(
      new AggregatedTracksByArtist({
        Artist: tracks[i].Artists[0],
        Track: tracks[i],
      })
    );
  }

  console.log(aggregatedTracksByArtistList)
  return aggregatedTracksByArtistList;
};

/**
 * Check if there is an active aggregation for a particular artist
 * @param aggregatedTracksByArtistList 
 * @param artist 
 * @return {index or boolean}
 */
const DoesArtistHaveAggregation = (aggregatedTracksByArtistList: AggregatedTracksByArtist[], artist: Artist) => {
  for(let i = 0; i < aggregatedTracksByArtistList.length; i++) {
    if(isEqual(artist, aggregatedTracksByArtistList[i]["Artist"])){
      return i;
    }
  }
  return false;
}

module.exports = {GenerateRandomString, GetAggregatedTracksByArtist}