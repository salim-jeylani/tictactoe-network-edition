'use strict';
//Filen app.js är den enda ni skall och tillåts skriva kod i.
const express = require("express");
const jsDOM = require("jsdom");
const cookieParser = require("cookie-parser");
const globalObject = require("./servermodules/game-modul.js");
const fs = require("fs");
const path = require("path");
const port = 3000;

const app = express();

app.use("/public",express.static(path.join(__dirname,"static")));
app.use(express.text());
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ strict: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
    if(req.cookies["nickName"] !== undefined && req.cookies["color"] !== undefined) {
        res.sendFile(path.join(__dirname, "static/html/index.html"));
    } else {
        res.sendFile(path.join(__dirname, "static/html/loggain.html"));
    }
})

app.get("/reset", (req, res) => {
    res.clearCookie("nickName", { httpOnly:true });
    res.clearCookie("color", { httpOnly:true });
    // berörda attribut i globalObject tömmas
    globalObject.playerOneNick = null;
    globalObject.playerOneColor = null;
    globalObject.playerTwoNick = null;
    globalObject.playerTwoColor = null;
    res.redirect("/");
})

app.post("/", (req, res) => {

    const nick_1 = req.body.nick_1;
    const color_1 = req.body.color_1;

    try{

        if(nick_1 === undefined) {
            throw new Error("Nickname saknas!");
        }

        if(nick_1.length < 3) {
            throw new Error("Nickname ska vara minst tre tecken långt!");
        }

        if(nick_1 === globalObject.playerOneNick) {
            throw new Error("Nickname redan tagen!");
        }

        if(color_1 === undefined) {
            throw new Error("Färg saknas!");
        }

        if(color_1.length !== 7) {
            throw new Error("Färgen ska innehǻlla sju tecken");
        }

        if(color_1 === "#ffffff" || color_1 === "#000000") {
            throw new Error("Ogiltig färg");
        }

        if(color_1 === globalObject.playerOneColor) {
            throw new Error("Färg redan tagen!");
        }

        if(globalObject.playerOneNick === null) {
            globalObject.playerOneNick = nick_1;
        } else {
            if (nick_1 === globalObject.playerOneNick) {
                throw new Error("Nickname redan tagen!")
            }
            globalObject.playerTwoNick = nick_1
        }

        if(globalObject.playerOneColor === null) {
            globalObject.playerOneColor = color_1;
        } else {
            if(color_1 === globalObject.playerOneColor){
                throw new Error("Färg redan tagen");
            }
            globalObject.playerTwoColor = color_1;
        }

        res.cookie("nickName", nick_1, { maxAge: 2 * 60 * 60 * 1000, httpOnly:true });
        res.cookie("color", color_1, { maxAge: 2 * 60 * 60 * 1000, httpOnly:true });
        res.redirect("/");
    }catch(err) {

        jsDOM.JSDOM.fromFile(path.join(__dirname, "static/html/loggain.html"))
            .then(dom => {
                dom.window.document.getElementById("errorMsg").textContent = err.message;
                dom.window.document.getElementById("nick_1").setAttribute("value", nick_1);
                dom.window.document.getElementById("color_1").setAttribute("value", color_1);
                res.send(dom.serialize());
            })
    }

})

const server = app.listen(port, () => console.log(`Listening on: http://localhost:${port}/`));