import Artist from "./Artist";
import Track from "./Track";

class AggregatedTracksByArtist {
    public Artist: Artist;
    public Tracks: Track[];

    constructor(json) {
        if(json["Artist"]) this.Artist = json["Artist"];
        if(json["Track"]) this.Tracks = [json["Track"]];
    }

    public AddTrack(track: Track) {
        this.Tracks.push(track);
    }
}

export default AggregatedTracksByArtist;