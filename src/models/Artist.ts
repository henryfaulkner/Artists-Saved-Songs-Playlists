import Image from "./Image";

class Artist {
    public external_urls: [Object];
    public href: string;
    public id: string;
    public name: string;
    public type: string;
    public uri: string;
    public Image: Image;

    constructor(json) {
        if (json["external_urls"]) this.external_urls = json["external_urls"];
        if (json["href"]) this.href = json["href"];
        if (json["id"]) this.id = json["id"];
        if (json["name"]) this.name = json["name"];
        if (json["type"] !== NaN) this.type = json["type"];
        if (json["uri"] != undefined) this.uri = json["uri"];
    }
}

export default Artist;