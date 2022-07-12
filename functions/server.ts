const functions = require("firebase-functions");
const express = require('express');
const app = express(express.json());
const jobApp = express(express.json());
import { config } from "./config/config"

app.use(require("./routes"))
jobApp.use(require("./scheduled_job"))

console.log(`Listening on port ${config.server.port}`)

exports.expressAPI = functions.region("us-east1").https.onRequest(app);
exports.UpdateSavedSongsPlaylists = functions.region("us-east1").https.onRequest(jobApp);