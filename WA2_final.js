//global constant lol
const WIDTH = 1000;
const HEIGHT = 800;
const GRID_ROWS = 12;
const GRID_COLS = 16;
const NODE_SPACING_X = WIDTH / GRID_COLS;
const NODE_SPACING_Y = HEIGHT / GRID_ROWS;
const GRAVITY = 0.2; // Adjust this value for stronger/weaker gravity


let nodes = [];
let droppers = [];
let startNodeIdx = 0;
let endNodeIdx; 
let bottomRightIdx;
let gameStarted = false;
let gameOver = false;
let win = false;
let dropRate = 1;
let dropAccumulator = 0;
let player = null;
let startTime = 0;
let currentPath = [];
let finalScore = 0;

// Energy system
const MAX_ENERGY = 15; 
let energy = MAX_ENERGY;
const ENERGY_GAIN_PER_BALL = 15; 

// Difficulty params (updated on startGameWithDifficulty)
let dropSpeedForDifficulty = 4;
let playerSpeed = 1;

function setup() {
  createCanvas(WIDTH, HEIGHT);
  bottomRightIdx = GRID_ROWS * GRID_COLS - 1; //calc bottom-right
  endNodeIdx = bottomRightIdx;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      nodes.push(new Node(x, y)); 
    }
  }
  setupNeighbors();
  //
  let c = document.querySelector('canvas');
  c.oncontextmenu = (e) => false;
}

function setupNeighbors() {
  for (let node of nodes) {
    node.neighbors = [];
    let x = node.gridX;
    let y = node.gridY;
    for (let [dx, dy] of [ [1, 0], [-1, 0], [0, 1], [0, -1], ]) {
      let nx = x + dx;
      let ny = y + dy;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        node.neighbors.push(ny * GRID_COLS + nx);
      }
    }
  }
}

function draw() {
  if (!gameStarted) {
    drawHomeScreen();
    return;
  }
  if (gameOver || win) {
    drawEndScreen();
    return;
  }

  background(10, 10, 30);

  if (player && player.currentNodeIdx === bottomRightIdx) {
    win = true;
    gameStarted = false;
    finalScore = floor((millis() - startTime) / 1000); // finale score in seconds
  }
  if (gameOver) {
    finalScore = floor((millis() - startTime) / 1000);
  }
  
  dropAccumulator += deltaTime / 1000 * dropRate;
  while (dropAccumulator >= 1) {
    droppers.push(new DropParticle(dropSpeedForDifficulty));
    dropAccumulator--;
  }
  for (let i = droppers.length - 1; i >= 0; i--) {
    let drop = droppers[i];
    drop.update();
    drop.draw();
    for (let node of nodes) {
    let d = p5.Vector.dist(drop.pos, node.pos);
    if (d < drop.radius + node.radius) {
        // Ball bounces on node
        let direction = p5.Vector.sub(drop.pos, node.pos).normalize();
        drop.pos = p5.Vector.add(
            node.pos,
            direction.mult(drop.radius + node.radius + 1)
        );
        drop.vel.y *= -1;
        // Optionally dampen the bounce:
        // drop.vel.y *= 0.8;
    }
}

    for (let iPath = player.pathIndex; iPath < currentPath.length; iPath++) {
      let nodeIdx = currentPath[iPath];
      if (nodes[nodeIdx].neighbors.length === 0) {
        gameOver = true;
      }
    }

    if (drop.pos.y > HEIGHT + drop.radius) {
      droppers.splice(i, 1);
    }
  }
  currentPath = dijkstra(nodes, startNodeIdx, endNodeIdx);

  if (player && energy > 0) {
    player.path = currentPath;
    player.update();
    energy = constrain(player.energy, 0, MAX_ENERGY);
  }

  stroke(60, 60, 90);
  for (let node of nodes) {
    for (let idx of node.neighbors) {
      if (nodes[idx]) {
        line(node.pos.x, node.pos.y, nodes[idx].pos.x, nodes[idx].pos.y);
      }
    }
  }

  if (player) {
    stroke(255, 100, 100);
    strokeWeight(4);
    for (let i = 0; i < player.pathIndex; i++) {
      let a = nodes[currentPath[i]]?.pos;
      let b = nodes[currentPath[i + 1]]?.pos;
      if (a && b) line(a.x, a.y, b.x, b.y);
    }
    stroke(255, 255, 100, 180);
    strokeWeight(2);
    for (let i = 0; i < currentPath.length - 1; i++) {
      let a = nodes[currentPath[i]]?.pos;
      let b = nodes[currentPath[i + 1]]?.pos;
      if (a && b) line(a.x, a.y, b.x, b.y);
    }


    stroke(255, 100, 100, 80);
    strokeWeight(10);
    for (let i = 0; i < player.pathIndex; i++) {
      let a = nodes[currentPath[i]]?.pos;
      let b = nodes[currentPath[i + 1]]?.pos;
      if (a && b) line(a.x, a.y, b.x, b.y);
    }


    stroke(255, 50, 50);
    strokeWeight(6);
    for (let i = 0; i < player.pathIndex; i++) {
      let a = nodes[currentPath[i]]?.pos;
      let b = nodes[currentPath[i + 1]]?.pos;
      if (a && b) line(a.x, a.y, b.x, b.y);
    }

    strokeWeight(1); 
  }

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].update();
    nodes[i].draw(i === startNodeIdx || i === endNodeIdx || i === bottomRightIdx);
  }

  if (player) player.draw();

  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  let score = floor((millis() - startTime) / 1000);
  text(`Score: ${score}`, 10, 10);


  drawEnergyBar();

  for (let drop of droppers) {
    if (player) {
      let d = p5.Vector.dist(drop.pos, player.pos);
      if (d < drop.radius + 10) { // 10 = player's radius / 2 approx
        gameOver = true;
        break;
      }
    }

    if (player && player.path && player.path.length > 1) {
      for (let i = 0; i < player.path.length - 1; i++) {
        let a = nodes[player.path[i]].pos;
        let b = nodes[player.path[i + 1]].pos;
        if (pointLineDistance(drop.pos, a, b) < drop.radius) {
          gameOver = true;
          break;
        }
      }
    }
  }
}

function drawEnergyBar() {
  let barX = 10,
    barY = 40,
    barW = 300,
    barH = 20;

  stroke(255);
  noFill();
  rect(barX, barY, barW, barH);
  noStroke();
  fill(255, 50, 50);
  let energyWidth = map(energy, 0, MAX_ENERGY, 0, barW);
  rect(barX, barY, energyWidth, barH);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(14);
  text("Energy", barX + 5, barY + barH / 2);
}

function drawHomeScreen() {
  background(30, 30, 50);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("Pathfinding Visualizer", width / 2, height / 2 - 150);

  textSize(20);
  text("Select Difficulty", width / 2, height / 2 - 100);

  let instrY = height * 0.75;
  textSize(16);
  fill(255);
  text("Instructions:", width / 2, instrY - 30);

  textSize(13);
  fill(200);
  text("• Left Click on a Node to Set Starting Point (Not Bottom-Right)", width / 2, instrY);
  text("• Player moves automatically following Dijkstra’s shortest path", width / 2, instrY + 20);
  text("• Avoid falling red balls! They destroy connections (edges) between nodes", width / 2, instrY + 40);
  text("• Shift + Click on a falling red ball to collect energy & boost player", width / 2, instrY + 60);
  text("• Energy depletes as player moves; collect balls to regain energy", width / 2, instrY + 80);
  text("• Game ends if player is hit by a ball, path is broken, or connections destroyed", width / 2, instrY + 100);
  text("• Win by reaching the bottom-right green node!", width / 2, instrY + 120);

  rectMode(CENTER);
  let btnW = 120,
    btnH = 50;
  let midX = width / 2;
  let yStart = height / 2 - 40;

  // Easy button
  fill(100, 255, 100);
  rect(midX - 150, yStart, btnW, btnH, 10);
  fill(0);
  text("Easy", midX - 150, yStart);

  // Medium button
  fill(100, 255, 100);
  rect(midX, yStart, btnW, btnH, 10);
  fill(0);
  text("Medium", midX, yStart);

  // Hard button
  fill(100, 255, 100);
  rect(midX + 150, yStart, btnW, btnH, 10);
  fill(0);
  text("Hard", midX + 150, yStart);
}

function drawEndScreen() {
  background(20, 20, 40, 220);
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(48);
  if (win) {
    text("YOU WIN!", width / 2, height / 2 - 60);
    textSize(24);
    text(`Your score: ${finalScore} seconds`, width / 2, height / 2 - 10);
  } else {
    text("GAME OVER", width / 2, height / 2 - 40);
  }
  textSize(24);
  text("Click to Restart", width / 2, height / 2 + 40);
}

function mousePressed() {
  if (!gameStarted) {
    let btnW = 120,
      btnH = 50;
    let midX = width / 2;
    let yStart = height / 2 - 40;
    if (
      mouseX > midX - 150 - btnW / 2 &&
      mouseX < midX - 150 + btnW / 2 &&
      mouseY > yStart - btnH / 2 &&
      mouseY < yStart + btnH / 2
    ) {
      startGameWithDifficulty("easy");
      return;
    }
    if (
      mouseX > midX - btnW / 2 &&
      mouseX < midX + btnW / 2 &&
      mouseY > yStart - btnH / 2 &&
      mouseY < yStart + btnH / 2
    ) {
      startGameWithDifficulty("medium");
      return;
    }
    if (
      mouseX > midX + 150 - btnW / 2 &&
      mouseX < midX + 150 + btnW / 2 &&
      mouseY > yStart - btnH / 2 &&
      mouseY < yStart + btnH / 2
    ) {
      startGameWithDifficulty("hard");
      return;
    }
    return;
  }

  if (gameOver || win) {
    gameStarted = false;
    gameOver = false;
    win = false;
    droppers = [];
    player = null;
    currentPath = [];
    energy = MAX_ENERGY;
    setupNeighbors();
    return;
  }

  // Shift + click on a drop 
  if (keyIsDown(SHIFT)) {
    for (let i = droppers.length - 1; i >= 0; i--) {
      let drop = droppers[i];
      let d = dist(mouseX, mouseY, drop.pos.x, drop.pos.y);
      if (d < drop.radius) {
        droppers.splice(i, 1);
        energy += ENERGY_GAIN_PER_BALL;
        energy = constrain(energy, 0, MAX_ENERGY);
        if (player) {
          let impulse = createVector(random(-1, 1), random(-2, -1));
          player.applyForce(impulse.mult(3));
        }
        return; 
      }
    }
  }

  let minDist = Infinity,
    nearestIdx = -1;
  for (let i = 0; i < nodes.length; i++) {
    let d = dist(mouseX, mouseY, nodes[i].pos.x, nodes[i].pos.y);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }
  if (nearestIdx === -1) return;

  if (mouseButton === LEFT) {
    if (nearestIdx === bottomRightIdx) {
      return;
    }
    startNodeIdx = nearestIdx;
    if (player) {
      player.currentNodeIdx = startNodeIdx;
      player.pathIndex = 0;
      player.pos = nodes[startNodeIdx].pos.copy();
      player.vel.set(0, 0);
      player.energy = MAX_ENERGY;
      energy = MAX_ENERGY;
    }
  } else if (mouseButton === RIGHT) {
    endNodeIdx = nearestIdx;
  }

  setupNeighbors();
  currentPath = dijkstra(nodes, startNodeIdx, endNodeIdx);
  if (player) player.pathIndex = 0;
}

function startGameWithDifficulty(mode) {
  gameStarted = true;
  gameOver = false;
  win = false;
  startTime = millis();
  currentPath = [];
  energy = MAX_ENERGY;
  if (mode === "easy") {
    dropRate = 0.5;
    dropSpeedForDifficulty = 2;
    playerSpeed = 1.5; // Increased initial speed
  } else if (mode === "medium") {
    dropRate = 1.5;
    dropSpeedForDifficulty = 3.5;
    playerSpeed = 1.0;
  } else if (mode === "hard") {
    dropRate = 3;
    dropSpeedForDifficulty = 6;
    playerSpeed = 0.9;
  }
  setupNeighbors();
  startNodeIdx = 0;
  endNodeIdx = bottomRightIdx;
  player = new PlayerNode(startNodeIdx, playerSpeed);
}

class Node {
  constructor(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.basePos = createVector(
      gridX * NODE_SPACING_X + NODE_SPACING_X / 2,
      gridY * NODE_SPACING_Y + NODE_SPACING_Y / 2
    );
    this.pos = this.basePos.copy(); // actual position with jitter
    this.neighbors = [];
    this.radius = 8;
  }

  update() {
    // Brownian motion 
    let angle = random(TWO_PI);
    let magnitude = random(0, 1.5);
    let jitter = createVector(cos(angle), sin(angle)).mult(magnitude);
    this.pos = p5.Vector.add(this.basePos, jitter);
  }

  draw(highlight = false) {
    noStroke();
    fill(
      highlight
        ? color(255, 100, 100)
        : this.isBottomRight()
        ? color(100, 255, 100)
        : color(200, 200, 255)
    );
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }

  isBottomRight() {
    return this.gridX === GRID_COLS - 1 && this.gridY === GRID_ROWS - 1;
  }
}

class PlayerNode {
  constructor(startNodeIdx, speed) {
    this.currentNodeIdx = startNodeIdx;
    this.pathIndex = 0;
    this.path = [];
    this.pos = nodes[startNodeIdx].pos.copy();
    this.speed = speed;
    let vx = random(-2, 2); // Adjust range for more or less sideways motion
this.vel = createVector(vx, this.speed);

    this.energy = MAX_ENERGY;
  }

  applyForce(force) {
    this.vel.add(force);
  }

  update() {
    if (!this.path || this.path.length < 2) return;
    if (this.pathIndex >= this.path.length - 1) return;

    // Target position is next node in path
    let targetNodeIdx = this.path[this.pathIndex + 1];
    let targetPos = nodes[targetNodeIdx].pos;

    let desired = p5.Vector.sub(targetPos, this.pos);
    let distance = desired.mag();
    desired.normalize();
    desired.mult(this.speed);

    // Steering force = desired velocity - current velocity
    let steer = p5.Vector.sub(desired, this.vel);
    this.applyForce(steer);

    // Update position and velocity
    this.pos.add(this.vel);

    // Slow down when close to target
    if (distance < 3) {
      this.pos = targetPos.copy();
      this.currentNodeIdx = targetNodeIdx;
      this.pathIndex++;
      this.vel.set(0, 0);
    }

    // Drain energy faster
    this.energy -= 0.025;
    energy = this.energy;

    if (this.energy <= 0) {
      gameOver = true;
    }
  }

  draw() {
    noStroke();
    fill(255, 50, 50);
    ellipse(this.pos.x, this.pos.y, 20);
  }
}

class DropParticle {
  constructor(speed) {
    this.pos = createVector(random(WIDTH), -10);
    this.radius = 10;
    this.speed = speed;
    let vx = random(-2, 2); // random left/right motion
    this.vel = createVector(vx, this.speed);
  }


  update() {
  this.vel.y += GRAVITY;
  this.vel.x += random(-0.1, 0.1);

  // limit the max horizontal speed
  this.vel.x = constrain(this.vel.x, -3, 3);

  this.pos.add(this.vel);
}

  draw() {
    noStroke();
    fill(255, 50, 50);
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }
}

function dijkstra(nodes, startIdx, endIdx) {
  let dist = [];
  let prev = [];
  let Q = new Set();

  for (let i = 0; i < nodes.length; i++) {
    dist[i] = Infinity;
    prev[i] = -1;
    Q.add(i);
  }

  dist[startIdx] = 0;

  while (Q.size > 0) {
    let u = null;
    let uDist = Infinity;
    for (let v of Q) {
      if (dist[v] < uDist) {
        uDist = dist[v];
        u = v;
      }
    }
    if (u === null) break;
    Q.delete(u);
    if (u === endIdx) break;

    for (let neighbor of nodes[u].neighbors) {
      if (!Q.has(neighbor)) continue;
      let alt = dist[u] + p5.Vector.dist(nodes[u].pos, nodes[neighbor].pos);
      if (alt < dist[neighbor]) {
        dist[neighbor] = alt;
        prev[neighbor] = u;
      }
    }
  }

  // Reconstruct path
  let path = [];
  let u = endIdx;
  if (prev[u] !== -1 || u === startIdx) {
    while (u !== -1) {
      path.unshift(u);
      u = prev[u];
    }
  }

  return path;
}

function pointLineDistance(p, a, b) {
  let ab = p5.Vector.sub(b, a);
  let ap = p5.Vector.sub(p, a);
  let t = ap.dot(ab) / ab.magSq();
  t = constrain(t, 0, 1);
  let closest = p5.Vector.add(a, ab.mult(t));
  return p5.Vector.dist(p, closest);
}
