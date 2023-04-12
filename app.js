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

var USER_LIST = [];

const { usernameIsInvalid } = require("./server/components/username");

//user connect
io.on("connection", (socket) => {
  console.log("\x1b[32m", "user connected: " + socket.id, "\x1b[0m");

  //recieve & emit message
  socket.on("usernameSelect", (userName) => {
    if (usernameIsInvalid(userName, USER_LIST)) {
      USER_LIST.push(userName);
      socket.userName = userName;
    }

    console.table(USER_LIST);
    console.log("username: " + userName);
    io.emit("usernameSelect", userName);
  });

  //dev log
  /*
  socket.onAny((event, args) => {
    console.log(event, args);
  });
  */

  //user disconnect
  socket.on("disconnect", () => {
    USER_LIST.splice(socket.userName);
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
        console.log("key: space");
        break;
    }
  });

  //user keyup
  socket.on("keyup", (event) => {
    switch (event.key) {
      case "a":
        //
        break;
      case "d":
        //
        break;
    }
  });

  //user click
  socket.on("click", (click) => {
    console.log(click.x, click.y);
  });
});
