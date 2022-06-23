const express = require('express');
const app = express(express.json());

let access_token;
let refresh_token;

app.use(require("./routes"))

console.log("Listening on port 8888")
const server = app.listen(8888)
server.setTimeout(10*60*1000) //10min timeout for connections