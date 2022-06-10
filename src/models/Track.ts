import Album from "./Album";
import Artist from "./Artist";

class Track {
    public Album: Album;
    public Artists: Artist[];
    public available_markets: string[];
    public disc_number: number;
    public duration_ms: number;
    public explicit: boolean;
    public external_ids: {};
    public external_urls: {};
    public href: string;
    public id: string;
    public is_local: boolean;
    public name: string;
    public popularity: number;
    public preview_url: string;
    public track_number: number;
    public type: string;
    public uri: string;

    constructor(json) {
        if (json["album"]) this.Album = json["album"];
        if (json["artists"]) this.Artists = json["artists"];
        if (json["available_markets"]) this.available_markets = json["available_markets"];
        if (json["disc_number"]) this.disc_number = json["disc_number"];
        if (json["duration_ms"]) this.duration_ms = json["duration_ms"];
        if (json["explicit"]) this.explicit = json["explicit"];
        if (json["external_ids"]) this.external_ids = json["external_ids"];
        if (json["external_urls"]) this.external_urls = json["external_urls"];
        if (json["href"]) this.href = json["href"];
        if (json["id"]) this.id = json["id"];
        if (json["is_local"]) this.is_local = json["is_local"];
        if (json["name"]) this.name = json["name"];
        if (json["popularity"]) this.popularity = json["popularity"];
        if (json["preview_url"]) this.preview_url = json["preview_url"];
        if (json["track_number"]) this.track_number = json["track_number"];
        if (json["type"] !== NaN) this.type = json["type"];
        if (json["uri"] != undefined) this.uri = json["uri"];
    }
}

export default Track;