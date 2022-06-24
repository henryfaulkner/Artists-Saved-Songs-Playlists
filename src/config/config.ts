import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 8888;
let domain: string;
if(process.env.NODE_ENV === "prod") domain = "https://artists-saved-songs-playlists.herokuapp.com";
else domain = "http://localhost:8888";

export const config = {
    server: {
        port: PORT,
        domain: domain
    }
}