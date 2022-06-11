class Image {
    public url: string;
    public height: number;
    public width: number;

    constructor(json) {
        if (json["url"]) this.url = json["url"];
        if (json["height"]) this.height = json["height"];
        if (json["width"]) this.width = json["width"];
    }
}

export default Image;