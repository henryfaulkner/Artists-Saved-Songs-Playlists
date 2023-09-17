const express = require('express');
const app = express(express.json());
import { config } from "./config/config"

app.use(require("./routes"))

console.log(`Listening on port ${config.server.port}`)
const server = app.listen(config.server.port)
server.setTimeout(75*60*1000) //75min timeout for connections