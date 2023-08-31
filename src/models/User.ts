import Image from "./Image";

class User {
    public display_name: string;
    public external_url: {};
    public followers: {};
    public href: string;
    public id: string;
    public images: Image[];
    public type: string;
    public uri: string;

    constructor(json) {
        if (json["display_name"]) this.display_name = json["display_name"];
        if (json["external_url"]) this.external_url = json["external_url"];
        if (json["followers"]) this.followers = json["followers"];
        if (json["href"]) this.href = json["href"];
        if (json["id"]) this.id = json["id"];
        if (json["images"]) this.images = json["images"];
        if (json["type"]) this.type = json["type"];
        if (json["uri"]) this.uri = json["uri"];
    }
}

export default User;