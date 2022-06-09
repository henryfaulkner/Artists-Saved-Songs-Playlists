const express = require('express');
var app = express();

app.use(require("./auth-routes"))

console.log("Listening on port 8888")
app.listen(8888)