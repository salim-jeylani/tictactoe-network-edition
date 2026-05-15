# Tic-Tac-Toe Network Edition 🎮

A multiplayer Tic-Tac-Toe game where two players compete against each other **over the network in real time** — from different browser tabs or even different computers. Built with Node.js and WebSockets as part of the course *Javascript för webbutveckling (ISGB15)* at Karlstad University.

---

## What is this?

This is a two-player online version of the classic Tic-Tac-Toe (Three in a Row) game. Instead of passing a device back and forth, each player connects to the game through their own browser. The server keeps both players in sync — when one player makes a move, the other sees it instantly.

If a player takes too long (more than 5 seconds), their turn is automatically skipped and passed to the opponent.

---

## How to Play

### Step 1 – Start the Server
> *(Someone needs to do this once — usually whoever set up the project)*

Open a terminal in the project folder and run:

```bash
node app.js
```

The game is now running at **http://localhost:3000**

### Step 2 – Both Players Open the Game
Each player opens their browser and goes to:
```
http://localhost:3000
```
> If playing across different computers on the same network, replace `localhost` with the host computer's local IP address (e.g. `http://192.168.1.x:3000`).

### Step 3 – Log In
Each player fills in:
- A **nickname** (at least 3 characters)
- A **color** (used to mark your moves on the board)

Rules for login:
- No two players can share the same nickname or color
- White and black are not allowed as colors

Click **Logga in** to enter the game.

### Step 4 – Play!
- Player 1 goes first
- Players take turns clicking cells on the board
- **You have 5 seconds per turn** — if you don't move in time, your turn is passed to your opponent
- First to get three in a row wins!

### Step 5 – After the Game
When the game ends (win or draw), each player can choose to:
- **Spela igen** – Start a new game with the same players
- **Åter till startsidan** – Log out and return to the login screen

### Step 6 – Log Out / Reset
To log out, visit:
```
http://localhost:3000/reset
```
This clears your session and returns you to the login screen.

---

## Requirements

Make sure you have **Node.js** installed. You can download it at [nodejs.org](https://nodejs.org).

Then install the project dependencies by running this once in the project folder:

```bash
npm install
```

---

## Project Structure

```
/
├── app.js                    # Server — all game logic lives here
├── servermodules/
│   └── game-modul.js         # Shared game state object (globalObject)
├── static/                   # Files served directly to the browser
│   └── (client-side scripts, CSS, etc.)
├── loggain.html              # Login page
└── index.html                # Game page
```

---

## Technical Overview

> *(For developers and the curious)*

| Technology | Purpose |
|---|---|
| **Node.js + Express** | Web server, routing, serving HTML files |
| **socket.io** | Real-time two-way communication (WebSockets) |
| **jsdom** | Manipulating HTML on the server side |
| **cookie-parser** | Managing player session cookies |

### How it works under the hood

1. **Login** – A player submits their nickname and color via a POST request. The server validates the data, stores it in `globalObject`, sets secure session cookies (2-hour lifetime, HTTP-only), and redirects the player to the game.

2. **Connection** – When a player opens the game page, a WebSocket connection is established. The server checks their cookies to identify them. Once both players are connected, the game begins and Player 1 gets the first move.

3. **Moves** – Each move is sent to the server via a `newMove` event. The server updates the board, checks for a win or draw, and tells the next player it's their turn via a `yourMove` event.

4. **Timer** – After each move, a 5-second countdown starts on the server. If no move arrives in time, the `timeout` function fires, skipping the current player's turn.

5. **Game over** – When someone wins or the board is full, a `gameover` event is broadcast to both players with the result.

---

## Course

**Javascript för webbutveckling – ISGB15**  
Karlstad University  
Graded using the automatic feedback system: [JSAutoFeedback](https://informatikwebbkurser.hotell.kau.se/JSAutoFeedback/)
