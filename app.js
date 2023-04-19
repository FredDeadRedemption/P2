const express = require("express");

const app = express();

const http = require("http");

const server = http.createServer(app);

const port = 420;

const io = require("socket.io")(server);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});
app.use(express.static(__dirname + "/client"));

server.listen(port, (error) => {
  if (error) {
    console.error("error: ", error);
  } else {
    console.log("server running on port: " + port);
  }
});

var SOCKET_LIST = [];

//user connect
io.on("connection", (socket) => {
  socket.id = Math.random();
  console.log("\x1b[32m", "user connected: " + socket.id, "\x1b[0m");
  socket.x = 150;
  socket.y = 150;
  SOCKET_LIST[socket.id] = socket;

  /*
  //recieve & emit message
  socket.on("usernameSelect", (userName) => {
    if (usernameIsInvalid(userName, SOCKET_LIST)) {
      SOCKET_LIST.push(userName);
      socket.userName = userName;
      socket.sprite = new Sprite({
        position: {
          x: 250,
          y: 180,
        },
        velocity: {
          x: 0,
          y: 5,
        },
      });
    }

    console.table(SOCKET_LIST);
    console.log("username: " + userName);
    io.emit("usernameSelect", userName);
  });
  */

  //dev log
  /*
  socket.onAny((event, args) => {
    console.log(event, args);
  });
  */

  //user disconnect
  socket.on("disconnect", () => {
    SOCKET_LIST.splice(socket.userName);
    console.log("\x1b[31m", "user disconnected: " + socket.id, "\x1b[0m");
  });

  //user keydown
  socket.on("keydown", (event) => {
    switch (event) {
      case "a":
        console.log("key: a");
        break;
      case "d":
        console.log("key: d");
        break;
      case " ":
        /*
        if (socket.position.y > 450) {
          socket.velocity.y = -15;
        }
        */
        break;
    }
  });

  //user keyup
  socket.on("keyup", (event) => {
    switch (event.key) {
      case "a":
        break;
      case "d":
        break;
    }
  });

  //user click
  socket.on("click", (click) => {
    console.log(click.x, click.y);
  });
});

//emit playerstate
setInterval(() => {
  var playerDataPack = [];
  for (let i in SOCKET_LIST) {
    var socket = SOCKET_LIST[i];
    playerDataPack.push({
      x: socket.x,
      y: socket.y,
    });
  }

  for (let i in SOCKET_LIST) {
    socket.emit("playerState", playerDataPack[i]);
  }
}, 1000 / 25); //25 fps
