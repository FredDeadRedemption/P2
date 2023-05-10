"use strict";

//player sprite
exports.Sprite = class Sprite {
  constructor({ position, velocity, username, team, socketId }) {
    this.position = position;
    this.velocity = velocity;
    this.width = 60;
    this.height = 60;
    this.lastKey = "a";
    this.isAttacking;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.pressingKey = {
      a: false,
      d: false,
      space: false,
      s: false,
    };
    this.username = username;
    this.isJumping = true;
    this.team = team;
    this.dead = false;
    this.terminalVelocity = 6.5;
  }
};

//platform sprite
exports.Platform = class Platform {
  constructor({ position, height, width, color }) {
    this.position = position;
    this.height = height;
    this.width = width;
    this.color = color;
    this.unpassable = false;
  }
};

//bomb sprite
exports.Bomb = class Bomb {
  constructor({ position, velocity, team }) {
    this.position = position;
    this.velocity = velocity;
    this.width = 27; //9*3 from its sprites pixels
    this.height = 27;
    this.blastRadius = {
      height: 300,
      width: 300,
    };
    this.team = team;
    this.damage = 25;
  }
};

exports.Explosion = class Explosion {
  constructor({ position, radius }) {
    this.position = position;
    this.radius = radius;
    this.fadeTime = 20;
  }
};
