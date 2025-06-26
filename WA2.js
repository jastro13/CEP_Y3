const WIDTH = 1000;
const HEIGHT = 800;
const GRID_ROWS = 12;
const GRID_COLS = 16;
const NODE_SPACING_X = WIDTH / GRID_COLS;
const NODE_SPACING_Y = HEIGHT / GRID_ROWS;
const BROWNIAN_STEP = 1.5;

let nodes = [];
let particles = [];
let startNodeIdx = 0;
let endNodeIdx;

function setup() {
  createCanvas(WIDTH, HEIGHT);
  endNodeIdx = GRID_ROWS * GRID_COLS - 1;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      nodes.push(new Node(x, y));
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    let x = node.gridX;
    let y = node.gridY;
    for (let [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]) {
      let nx = x + dx;
      let ny = y + dy;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        node.neighbors.push(ny * GRID_COLS + nx);
      }
    }
  }
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  background(10, 10, 30);

  for (let node of nodes) {
    node.brownianMove();
  }

  let path = dijkstra(nodes, startNodeIdx, endNodeIdx);
  stroke(60, 60, 90);
  for (let node of nodes) {
    for (let idx of node.neighbors) {
      line(node.pos.x, node.pos.y, nodes[idx].pos.x, nodes[idx].pos.y);
    }
  }
  stroke(255, 255, 100);
  strokeWeight(4);
  for (let i = 0; i < path.length - 1; i++) {
    let a = nodes[path[i]].pos;
    let b = nodes[path[i + 1]].pos;
    line(a.x, a.y, b.x, b.y);
  }
  strokeWeight(1);


  for (let i = 0; i < nodes.length; i++) {
    nodes[i].draw(i === startNodeIdx || i === endNodeIdx);
  }


  for (let p of particles) {
    p.update();
    p.draw();
  }

  fill(255, 100, 100);
  text("Left Click: Set Start", 10, height - 40);
  text("Right Click: Set End", 10, height - 20);
}

function mousePressed(){
  let minDist = Infinity;
  let nearestIdx = -1;for (let i = 0; i < nodes.length; i++) {
    let d = dist(mouseX, mouseY, nodes[i].pos.x, nodes[i].pos.y);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }

  if (mouseButton === LEFT) {
    startNodeIdx = nearestIdx;
  } else if (mouseButton === RIGHT) {
    endNodeIdx = nearestIdx;
  }
}

class Node {
  constructor(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.pos = createVector(
      gridX * NODE_SPACING_X + NODE_SPACING_X / 2,
      gridY * NODE_SPACING_Y + NODE_SPACING_Y / 2
    );
    this.neighbors = [];
    this.radius = 8;
  }

  brownianMove() {
    let dx = random(-BROWNIAN_STEP, BROWNIAN_STEP);
    let dy = random(-BROWNIAN_STEP, BROWNIAN_STEP);
    this.pos.x = constrain(this.pos.x + dx, 0, WIDTH);
    this.pos.y = constrain(this.pos.y + dy, 0, HEIGHT);
  }

  draw(highlight = false) {
    noStroke();
    fill(highlight ? color(255, 100, 100) : color(200, 200, 255));
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(WIDTH), random(HEIGHT));
    this.vel = p5.Vector.random2D().mult(random(1, 2));
    this.mass = random(3, 7);
    this.color = color(random(100, 255), random(100, 255), random(100, 255));
    this.trail = [];
  }

  update() {
    this.vel.mult(0.98);
    this.pos.add(this.vel);

    if (this.pos.x < 0) this.pos.x += WIDTH;
    if (this.pos.x > WIDTH) this.pos.x -= WIDTH;
    if (this.pos.y < 0) this.pos.y += HEIGHT;
    if (this.pos.y > HEIGHT) this.pos.y -= HEIGHT;

    this.trail.push(this.pos.copy());
    if (this.trail.length > 15) {
      this.trail.shift();
    }
  }

  draw() {
    stroke(this.color);
    noFill();
    beginShape();
    for (let v of this.trail) {
      vertex(v.x, v.y);
    }
    endShape();

    stroke(255);
    line(this.pos.x, this.pos.y, this.pos.x - this.vel.x * 4, this.pos.y - this.vel.y * 4);
    noStroke();
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.mass * 2);
  }
}

function dijkstra(nodes, startIdx, endIdx) {
  let dist = Array(nodes.length).fill(Infinity);
  let prev = Array(nodes.length).fill(null);
  let visited = Array(nodes.length).fill(false);

  dist[startIdx] = 0;
  let pq = new MinHeap();
  pq.push({ node: startIdx, priority: 0 });

  while (!pq.isEmpty()) {
    let { node: u } = pq.pop();
    if (visited[u]) continue;
    visited[u] = true;
    if (u === endIdx) break;

    for (let v of nodes[u].neighbors) {
      let alt = dist[u] + p5.Vector.dist(nodes[u].pos, nodes[v].pos);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push({ node: v, priority: alt });
      }
    }
  }

  let path = [];
  let u = endIdx;
  while (u != null) {
    path.push(u);
    u = prev[u];
  }
  return path.reverse();
}

class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp();
  }

  pop() {
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._bubbleDown();
    }
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp() {
    let idx = this.heap.length - 1;
    while (idx > 0) {
      let parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority >= this.heap[parentIdx].priority) break;
      [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
      idx = parentIdx;
    }
  }

  _bubbleDown() {let idx = 0;
    let length = this.heap.length;
    while (true) {
      let leftIdx = 2 * idx + 1;
      let rightIdx = 2 * idx + 2;
      let smallest = idx;

      if (leftIdx < length && this.heap[leftIdx].priority < this.heap[smallest].priority) {
        smallest = leftIdx;
      }
      if (rightIdx < length && this.heap[rightIdx].priority < this.heap[smallest].priority) {
        smallest = rightIdx;
      }
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}
