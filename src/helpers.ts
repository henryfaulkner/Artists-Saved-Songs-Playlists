var isEqual = require('lodash.isequal');
import AggregatedTracksByArtist from "./models/AggregatedTracksByArtist";
import Artist from "./models/Artist";
import Playlist from "./models/Playlist";
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
 * Concatenates two aggregate track lists with no repeating artists.
 * @param {AggregatedTracksByArtist[]} list of list of tracks aggregated
 * @param {AggregatedTracksByArtist[]} list of list of tracks aggregated
 * @return {AggregatedTracksByArtist[]} list of list of tracks aggregated by Artist
 */
const RemoveDuplicateTrackLists = (allList: AggregatedTracksByArtist[]) => {
  // Find appropriate sorting algorithm 
  for(let i = 0; i < allList.length; i++) {
    for(let h = i+1; h < allList.length; h++) {
      if(allList[i].Artist.id === allList[h].Artist.id) {
        allList[i].Tracks = allList[i].Tracks.concat(allList[h].Tracks);
        allList.splice(h, 1);
      }
    }
  }
  return allList;
}

/**
 * Takes song items' array and parses and aggregates them by artist
 * @param {Track[]} list of Tracks
 * @return {AggregatedTracksByArtist[]} list of list of tracks aggregated by Artist
 */
const GetAggregatedTracksByArtist = (tracks: Track[]) => {
  const aggregatedTracksByArtistList: AggregatedTracksByArtist[] = [];

  for(let i = 0; i < tracks.length; i++) {
    let index = DoesArtistHaveAggregation(aggregatedTracksByArtistList, tracks[i].Artists[0]);
    if(index !== null){
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
    if(artist.id === aggregatedTracksByArtistList[i]["Artist"].id){
      return i;
    }
  }
  return null;
}

module.exports = {GenerateRandomString, GetAggregatedTracksByArtist, RemoveDuplicateTrackLists}