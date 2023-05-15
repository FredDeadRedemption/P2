const express = require("express");

const app = express();

const http = require("http");

const server = http.createServer(app);

const port = 420;

const io = require("socket.io")(server);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/StartPage.html");
});
app.use(express.static(__dirname + "/client"));

server.listen(port, (error) => {
  if (error) {
    console.error("error: ", error);
  } else {
    console.log("server running on port: " + port);
  }
});

//mongoDB
const mongoose = require("mongoose");

const uri = "mongodb+srv://Admin:p2projekt@userdata.htaltmo.mongodb.net/?retryWrites=true&w=majority";

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("connected to MongoDB");
  } catch (error) {
    console.error(error);
  }
}
connect();

//component imports
const Player = require("./server/components/sprites").Sprite;
const Bomb = require("./server/components/sprites").Bomb;
const Explosion = require("./server/components/sprites").Explosion;
const PLATFORM_LIST = require("./server/components/platforms").PLATFORM_LIST;
const dist = require("./server/components/util").distanceformula;

//dynamic lists
let SOCKET_LIST = []; //contains active connection
let PLAYER_LIST = []; //contains active player objects
let BOMB_LIST = []; //contains active bombs
let EXPLOSION_LIST = []; //contains active explosions

//settings
let gravity = 0.6;
let bombGravity = 0.5;
let movementSpeed = 5.5;
let throwingSpeed = 6.2;
let jumpPower = 16;
let blastRadius = 300;

//suck it io
io.on("connection", (socket) => {
  socket.id = Math.random(); //reject characters, embrace integers.

  socket.emit("join-lobby", socket.id); //??
  console.log("\x1b[32m", "user connected: " + socket.id, "\x1b[0m"); //notify server
  //store client connection
  SOCKET_LIST[socket.id] = socket;

  socket.on("clientSelections", (username, team, role) => {
    //spawn player object
    let player = new Player({
      position: {
        x: 300,
        y: 175,
      },
      velocity: {
        x: 0,
        y: 0,
      },
      username: username,
      team: team,
      role: role,
    });

    //store player object
    PLAYER_LIST[socket.id] = player;

    //send info to client
    socket.emit("clientSelections", username, team, role);

    //DEBUG
    console.log("new player object spawned: ", PLAYER_LIST[socket.id]);
  });

  //delete user data on disconnect
  socket.on("disconnect", () => {
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
    console.log("\x1b[31m", "user disconnected: " + socket.id, "\x1b[0m");
  });

  //user keydown events
  socket.on("keydown", (event) => {
    let player = PLAYER_LIST[socket.id];
    switch (event) {
      case "a":
        player.pressingKey.a = true;
        player.lastKey = "a";
        break;
      case "d":
        player.pressingKey.d = true;
        player.lastKey = "d";
        break;
      case " ":
        if (!player.isJumping) {
          player.velocity.y = -jumpPower;
          player.isJumping = true;
        }
        break;
      case "s":
        player.pressingKey.s = true;
        break;
      case "k":
        player.role === "bomber" ? spawnBomb(player) : detonateBomb(player);
        break;
    }
  });

  //user keyup events
  socket.on("keyup", (event) => {
    let player = PLAYER_LIST[socket.id];
    switch (event) {
      case "a":
        player.pressingKey.a = false;
        break;
      case "d":
        player.pressingKey.d = false;
        break;
      case "s":
        player.pressingKey.s = false;
        break;
    }
  });
});

function spawnBomb(player) {
  //determine throwing direction
  let throwingDirection;
  player.lastKey === "a" ? (throwingDirection = -throwingSpeed) : (throwingDirection = throwingSpeed);

  //spawn bomb & store in bomb list
  let bomb = new Bomb({
    position: {
      x: player.position.x,
      y: player.position.y,
    },
    velocity: {
      x: throwingDirection,
      y: -12,
    },
    team: player.team,
  });

  BOMB_LIST.push({
    position: {
      x: bomb.position.x,
      y: bomb.position.y,
    },
    velocity: {
      x: bomb.velocity.x,
      y: bomb.velocity.y,
    },
    height: bomb.height,
    width: bomb.width,
    team: bomb.team,
    damage: bomb.damage,
    timer: bomb.timer,
    isFlying: bomb.isFlying,
    friction: bomb.friction,
  });
}

function detonateBomb(detonator) {
  //loop all bombs
  for (let i in BOMB_LIST) {
    let bomb = BOMB_LIST[i];

    //identify first bomb belonging to team
    if (bomb.team === detonator.team) {
      spawnExplosion(bomb, blastRadius);

      //hit req for all players
      for (let i in PLAYER_LIST) {
        let player = PLAYER_LIST[i];

        //in blast range
        if (dist(player, bomb) < blastRadius && !player.hit) {
          //hit
          player.hit = true;
          player.health = player.health - bomb.damage;

          if (player.health <= 0) {
            //kill player
            player.dead = true;
            console.log(player.username + " has died");
          }
          console.log("bomb was a hit and exploded");
        }
      }
      delete BOMB_LIST[i];
      break;
    }
  }
}

function spawnExplosion(bomb, radius) {
  let explosion = new Explosion({
    position: {
      x: bomb.position.x + bomb.width / 2,
      y: bomb.position.y + bomb.height / 2,
    },
    radius: radius,
  });
  EXPLOSION_LIST.push({
    position: {
      x: explosion.position.x - radius / 2,
      y: explosion.position.y - radius / 2,
    },
    radius: explosion.radius,
    fadeTime: explosion.fadeTime,
  });
}

//gametick
function gametick() {
  let playerDataPacks = [];
  let bombDataPacks = [];
  let explosionDataPacks = [];

  //loop players
  for (let i in PLAYER_LIST) {
    let player = PLAYER_LIST[i];

    //player respawn
    if (player.dead) {
      player.isJumping = true;
      player.position.y = -1000;
      player.position.x = 512;
      player.health = player.maxHealth;
      player.dead = false;
    }

    //player physics
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
    player.velocity.x = 0;

    let playerFeetPos = player.position.y + player.height;

    //player / platform collision
    for (let i in PLATFORM_LIST) {
      let platformXWidth = PLATFORM_LIST[i].position.x + PLATFORM_LIST[i].width;

      //handle player collission with platform while falling (isJumping = true and velocity y > 0) and not holding s
      if (
        playerFeetPos >= PLATFORM_LIST[i].position.y &&
        !(playerFeetPos >= PLATFORM_LIST[i].position.y + PLATFORM_LIST[i].height) &&
        player.position.x + player.width / 2 >= PLATFORM_LIST[i].position.x &&
        player.position.x + player.width / 2 <= platformXWidth &&
        player.isJumping &&
        player.velocity.y > 0 &&
        ((!player.pressingKey.s && !PLATFORM_LIST[i].unpassable) || PLATFORM_LIST[i].unpassable)
      ) {
        player.velocity.y = 0;
        player.position.y = PLATFORM_LIST[i].position.y - player.height;
        player.isJumping = false;
      }

      //handle player walking off edge by setting isjumping to true if the player walks off or holds s
      if (
        (playerFeetPos >= PLATFORM_LIST[i].position.y &&
          !(playerFeetPos >= PLATFORM_LIST[i].position.y + PLATFORM_LIST[i].height) && //The is between the top and bottom of the platform
          (player.position.x + player.width / 2 <= PLATFORM_LIST[i].position.x || player.position.x + player.width / 2 >= platformXWidth) &&
          player.position.x + player.width / 2 >= PLATFORM_LIST[i].position.x - movementSpeed &&
          player.position.x + player.width / 2 <= platformXWidth + movementSpeed &&
          !player.isJumping) ||
        (player.pressingKey.s && !PLATFORM_LIST[i].unpassable && player.position.x + player.width / 2 >= PLATFORM_LIST[i].position.x && player.position.x + player.width / 2 <= platformXWidth && playerFeetPos == PLATFORM_LIST[i].position.y)
      ) {
        player.isJumping = true;
      }
    }

    //player jumping physics
    if (player.isJumping && player.velocity.y <= player.terminalVelocity) {
      player.velocity.y += gravity;
    }

    //player left/right movement
    if (player.pressingKey.a && player.position.x + player.width / 2 >= 0) {
      player.velocity.x = -movementSpeed;
    } else if (player.pressingKey.d && player.position.x + player.width / 2 <= 1024) {
      player.velocity.x = movementSpeed;
    }

    //invinsibility frames
    if (player.hit) {
      player.hitTimer--;
      if (player.hitTimer <= 0) {
        player.hit = false;
        player.hitTimer = player.hitFrames;
      }
    }

    //update player data pack
    playerDataPacks.push({
      x: player.position.x,
      y: player.position.y,
      pressingKey: {
        a: player.pressingKey.a,
        d: player.pressingKey.d,
      },
      username: player.username,
      isJumping: player.isJumping,
      team: player.team,
      maxHealth: player.maxHealth,
      health: player.health,
      hit: player.hit,
      role: player.role,
    });
  }

  //loop bombs
  for (let i in BOMB_LIST) {
    let bomb = BOMB_LIST[i];

    //despawn bomb after 450 ticks
    bomb.timer--;
    if (bomb.timer < 0) {
      delete BOMB_LIST[i];
    }

    //bomb physics
    if (bomb.isFlying) {
      bomb.position.y += bomb.velocity.y;
      bomb.velocity.y += bombGravity;
    }

    //bomb losing momentum
    if (bomb.velocity.x > 0) {
      bomb.position.x += bomb.velocity.x;
      bomb.velocity.x += -0.05;
      if (bomb.velocity.x < 0.05) {
        bomb.velocity.x = 0;
      }
    } else if (bomb.velocity.x < 0) {
      bomb.position.x += bomb.velocity.x;
      bomb.velocity.x += 0.05;
      if (bomb.velocity.x > 0.05) {
        bomb.velocity.x = 0;
      }
    }

    //bomb platform collision
    for (i in PLATFORM_LIST) {
      bombFeetPos = bomb.position.y + bomb.height;
      platform = PLATFORM_LIST[i];
      platformWidth = platform.position.x + platform.width;
      if (
        bombFeetPos >= platform.position.y &&
        !(bombFeetPos >= platform.position.y + platform.height) &&
        bomb.position.x + bomb.width / 2 >= platform.position.x &&
        bomb.position.x + bomb.width / 2 <= platformWidth &&
        bomb.velocity.y > 0 &&
        bomb.isFlying
      ) {
        bomb.velocity.y = 0;
        bomb.isFlying = false;
        bomb.position.y = platform.position.y - bomb.height + 25.5;
      }

      if (
        bombFeetPos >= platform.position.y &&
        !(bombFeetPos >= platform.position.y + platform.height) && //The is between the top and bottom of the platform
        (bomb.position.x + bomb.width / 2 <= platform.position.x || bomb.position.x + bomb.width / 2 >= platformWidth) &&
        bomb.position.x + bomb.width / 2 >= platform.position.x - 20 &&
        bomb.position.x + bomb.width / 2 <= platformWidth + 20 && //avoids confusion when multiple platforms share same y level space
        !bomb.isFlying
      ) {
        bomb.isFlying = true;
      }
    }

    //bombs bouncing off walls
    if (bomb.position.x < 15 - bomb.width / 2 || bomb.position.x > 1024 - bomb.width / 2) {
      bomb.velocity.x = -bomb.velocity.x * 1.2; //1.2 lil xtra bounce
    }

    //update bomb data pack
    bombDataPacks.push({
      x: bomb.position.x,
      y: bomb.position.y,
      velocityX: bomb.velocity.x,
      team: bomb.team,
      timer: bomb.timer,
    });
  }

  //loop explosions
  for (let i in EXPLOSION_LIST) {
    let explosion = EXPLOSION_LIST[i];
    explosion.fadeTime = explosion.fadeTime - 1;
    if (explosion.fadeTime <= 0) {
      EXPLOSION_LIST.splice(i, 1);
    }

    //update explosion data pack
    explosionDataPacks.push({
      x: explosion.position.x,
      y: explosion.position.y,
      radius: explosion.radius,
    });
  }

  //emit player & bomb data packs to all socket connections
  for (let i in SOCKET_LIST) {
    let socket = SOCKET_LIST[i];
    socket.emit("playerState", playerDataPacks);
    socket.emit("bombState", bombDataPacks);
    socket.emit("explosionState", explosionDataPacks);
    //emit platform datapacks
    socket.emit("platform", PLATFORM_LIST);
  }
} //gametick

//allows us to get time from program start
//alternative to "window.performance.now" which is not available in server environment
const { PerformanceObserver, performance } = require("node:perf_hooks");

//get current time from program start
let msPrev = performance.now();

//set to desired fps
const fps = 60;

//calculate ms pr. frame
const msPerFrame = 1000 / fps;

function requestAnimationFrame(f) {
  setImmediate(() => f(Date.now()));
}

//animate gametick in chosen fps
function animate() {
  //request next frame, msPrev is now actually previous time
  requestAnimationFrame(animate);

  //get current time from program start
  const msNow = performance.now();

  //time passed between current frame and previous frame
  const msPassed = msNow - msPrev;

  //execute gametick if enough time passed to match desired fps and subtract excess time, otherwise return
  if (msPassed < msPerFrame) {
    return;
  } else {
    const excessTime = msPassed % msPerFrame;
    msPrev = msNow - excessTime;
    gametick();
  }
}

animate();
