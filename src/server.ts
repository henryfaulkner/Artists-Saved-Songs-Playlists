const functions = require("firebase-functions");
const express = require('express');
const app = express(express.json());
import { config } from "./config/config"

let access_token;
let refresh_token;

app.use(require("./routes"))

console.log(`Listening on port ${config.server.port}`)
const server = app.listen(config.server.port)
server.setTimeout(75*60*1000) //75min timeout for connections

exports.expressAPI = functions.https.onRequest(app);