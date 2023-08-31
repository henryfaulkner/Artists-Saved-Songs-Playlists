import Artist from "./Artist";

class Album {
    public album_type: string;
    public artists: Artist[];
    public available_markets: string[];
    public external_urls: {};
    public href: string;
    public id: string;
    public name: string;
    public release_date: string;
    public release_date_precision: string;
    public total_tracks: number;
    public type: string;
    public uri: string;

    constructor(json) {
        if (json["album_type"]) this.album_type = json["album_type"];
        if (json["artists"]) this.artists = json["artists"];
        if (json["available_markets"]) this.available_markets = json["available_markets"];
        if (json["external_urls"]) this.external_urls = json["external_urls"];
        if (json["href"]) this.href = json["href"];
        if (json["id"]) this.id = json["id"];
        if (json["name"]) this.name = json["name"];
        if (json["release_date"]) this.release_date = json["release_date"];
        if (json["release_date_precision"]) this.release_date_precision = json["release_date_precision"];
        if (json["total_tracks"]) this.total_tracks = json["total_tracks"];
        if (json["type"] !== NaN) this.type = json["type"];
        if (json["uri"] != undefined) this.uri = json["uri"];
    }
}

export default Album;