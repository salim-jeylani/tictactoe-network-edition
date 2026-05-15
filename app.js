'use strict';
//Filen app.js är den enda ni skall och tillåts skriva kod i.
const express = require("express");
const jsDOM = require("jsdom");
const { Server } = require("socket.io");
//const { parseCookie } = require("cookie")
const cookieParser = require("cookie-parser");
const globalObject = require("./servermodules/game-modul.js");
const fs = require("fs");
const path = require("path");
const {createServer} = require("node:http");



const port = 3000;
const app = express();
const server = createServer(app);
const socketIO = new Server(server);

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
    globalObject.playerOneSocketId = null;
    globalObject.playerTwoSocketId = null;
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
            //console.log("Player 1 nick set: ", globalObject.playerOneNick);
        } else {
            if (nick_1 === globalObject.playerOneNick) {
                throw new Error("Nickname redan tagen!")
            }
            globalObject.playerTwoNick = nick_1;
            //console.log("Player 2 nick set: ", globalObject.playerTwoNick);

        }

        if(globalObject.playerOneColor === null) {
            globalObject.playerOneColor = color_1;
            //console.log("Player 1 color set: ", globalObject.playerOneColor);
        } else {
            if(color_1 === globalObject.playerOneColor){
                throw new Error("Färg redan tagen");
            }
            globalObject.playerTwoColor = color_1;
            //console.log("Player 2 color set: ", globalObject.playerTwoColor);
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


socketIO.on("connection", (socket) => {

    const cookies = globalObject.parseCookies(socket.request.headers.cookie);
    function debug_log(msg) {
        console.log(msg, JSON.stringify({
            socketID: socket.id,
            go_pl_1: {
                nick: globalObject.playerOneNick,
                color: globalObject.playerOneColor,
                socket_id: globalObject.playerOneSocketId
            },
            go_pl_2: {
                nick: globalObject.playerTwoNick,
                color: globalObject.playerTwoColor,
                socket_id: globalObject.playerTwoSocketId,
            },
            cookies: cookies,
        }, null, 4))
    }

    if(cookies && cookies["nickName"] && cookies["color"]) {

        //debug_log("before: ");
        if(globalObject.playerOneSocketId && globalObject.playerTwoSocketId)
        {
            socket.disconnect();
            console.log("Redan två spelare anslutna!");
            return;
        }

        if(cookies["nickName"] === globalObject.playerOneNick) {
            //console.log("player 1 socket set")
            globalObject.playerOneSocketId = socket.id;
        }

        if(cookies["nickName"] === globalObject.playerTwoNick) {
            //console.log("player 2 socket set")
            globalObject.playerTwoSocketId = socket.id;
        }

        if(globalObject.playerOneSocketId && globalObject.playerTwoSocketId) {
            //console.log("NEW_GAME")
            globalObject.resetGameArea();
            globalObject.currentPlayer = 1;
            socketIO.to(globalObject.playerOneSocketId).emit("newGame", { opponentNick: globalObject.playerTwoNick, opponentColor: globalObject.playerTwoColor, myColor: globalObject.playerOneColor });
            socketIO.to(globalObject.playerTwoSocketId).emit("newGame", { opponentNick: globalObject.playerOneNick, opponentColor: globalObject.playerOneColor, myColor: globalObject.playerTwoColor });
            socketIO.to(globalObject.playerOneSocketId).emit("yourMove", null);
            globalObject.timerId = setInterval(timeout, 5000);
        }

        //debug_log("after: ");

    } else {
        socket.disconnect();
        console.log("Kakorna saknas!");
        return;
    }

    socket.on("newMove", (data) => {
        globalObject.gameArea[data.cellId] = globalObject.currentPlayer;

        if(globalObject.currentPlayer === 1) {
            globalObject.currentPlayer = 2;
            socket.to(globalObject.playerTwoSocketId).emit("yourMove", data);
        }else {
            globalObject.currentPlayer = 1;
            socket.to(globalObject.playerOneSocketId).emit("yourMove", data);
        }

        const gameResult = globalObject.checkForWinner();
        switch (gameResult) {
            case 1:
                // spelare ett vann
                socketIO.to(globalObject.playerOneSocketId).emit("gameover", "Grattis du vann!");
                socketIO.to(globalObject.playerTwoSocketId).emit("gameover", "Du förlorade! Spelare 2 vann.");
                break;
            case 2:
                // spelare två vann
                socketIO.to(globalObject.playerTwoSocketId).emit("gameover", "Grattis du vann!");
                socketIO.to(globalObject.playerOneSocketId).emit("gameover", "Du förlorade! Spelare 2 vann.");
                break;
            case 3:
                // oavgjort
                socketIO.to(globalObject.playerOneSocketId).emit("gameover", "Det blev oavgjort!");
                socketIO.to(globalObject.playerTwoSocketId).emit("gameover", "Det blev oavgjort!");
                break;
        }

        clearInterval(globalObject.timerId);
        if(gameResult > 0) {
            globalObject.playerOneSocketId = null;
            globalObject.playerTwoSocketId = null;
        } else {
            globalObject.timerId = setInterval(timeout, 5000);
        }

        //debug_log("NEW_MOVE: ")
    })

})

server.listen(port, () => console.log(`listening on http://localhost:${port}`));

function timeout() {
    if(globalObject.currentPlayer === 1) {
        socketIO.to(globalObject.playerOneSocketId).emit("timeout");
        globalObject.currentPlayer = 2;
        socketIO.to(globalObject.playerTwoSocketId).emit("yourMove", null);
    } else if( globalObject.currentPlayer === 2) {
        socketIO.to(globalObject.playerTwoSocketId).emit("timeout");
        globalObject.currentPlayer = 1;
        socketIO.to(globalObject.playerOneSocketId).emit("yourMove", null);
    }
}