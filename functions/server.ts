const functions = require("firebase-functions/v2");
const express = require('express');
const app = express(express.json());
const jobApp = express(express.json());
import { config } from "./config/config"

app.use(require("./routes"))
jobApp.use(require("./scheduled_job"))

console.log(`Listening on port ${config.server.port}`)

exports.api = functions.https.onRequest({region: 'us-east1', timeoutSeconds: 2701,}, app);