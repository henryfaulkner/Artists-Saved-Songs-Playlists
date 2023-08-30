import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 8888;
let domain: string;
if(process.env.NODE_ENV !== "dev") domain = "https://artists-saved-songs-playlists.web.app/";
else domain = "http://localhost:8888";

export const config = {
    server: {
        port: PORT,
        domain: domain
    }
}