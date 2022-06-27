const functions = require("firebase-functions");
const express = require("express");
let cookieParser = require('cookie-parser');
const cors = require("cors");

const app = express();
app.use(cookieParser()).use(cors({origin: true}));
let router = express.Router();

import Album from "./models/Album";

router.get("/cum", (req, res) => {
    const cum = req.query.message || req.cookies["auth_token"] || "cumm";
    res.status(200).send(cum);
})

app.use(router)

exports.expressAPI = functions.https.onRequest(app);