const express = require('express');
const app = express();

let access_token;
let refresh_token;

app.use(require("./auth-routes.ts"))
app.use(require("./spotify-routes"))

console.log("Listening on port 8888")
app.listen(8888)