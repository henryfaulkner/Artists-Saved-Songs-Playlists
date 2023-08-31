import Image from "./Image";

class Playlist {
    public collaborative: boolean;
    public description: string;
    public external_url: {};
    public followers: {};
    public href: string;
    public id: string;
    public images: Image[];
    public name: string;
    public owner: UserVerificationRequirement;
    public primary_color;
    public public: boolean;
    public snapshot_id: string;
    public tracks: {};
    public type: string;
    public uri: string;

    constructor(json) {
        if (json["collaborative"]) this.collaborative = json["collaborative"];
        if (json["description"]) this.description = json["description"];
        if (json["external_url"]) this.external_url = json["external_url"];
        if (json["followers"]) this.followers = json["followers"];
        if (json["href"]) this.href = json["href"];
        if (json["id"]) this.id = json["id"];
        if (json["images"]) this.images = json["images"];
        if (json["name"]) this.name = json["name"];
        if (json["owner"]) this.owner = json["owner"];
        if (json["primary_color"]) this.primary_color = json["primary_color"];
        if (json["public"]) this.public = json["public"];
        if (json["snapshot_id"]) this.snapshot_id = json["snapshot_id"];
        if (json["tracks"]) this.tracks = json["tracks"];
        if (json["type"]) this.type = json["type"];
        if (json["uri"]) this.uri = json["uri"];
    }
}

export default Playlist;