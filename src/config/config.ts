import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 1377;
let domain: string;
if(process.env.NODE_ENV !== "dev") domain = "https://artists-saved-songs-playlists.web.app/";
else domain = "http://localhost:1377";

export const config = {
    server: {
        port: PORT,
        domain: domain
    }
}