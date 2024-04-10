let cols, rows;
const resolution = 5;
let heightMap;
let grid; // Declare grid globally
let entity = {
  x: 0, // Initial x position
  y: 0, // Initial y position
  pathIndex: 0 // Initial index in the path
};

let path = []; // Path that the entity will follow

function setup() {
  createCanvas(400, 400);
  cols = width / resolution;
  rows = height / resolution;
  heightMap = new Array(cols);

  // Initialize heightMap with Perlin noise values
  let noiseScale = 0.1;
  for (let i = 0; i < cols; i++) {
    heightMap[i] = new Array(rows);
    for (let j = 0; j < rows; j++) {
      let noiseVal = noise(i * noiseScale, j * noiseScale);
      heightMap[i][j] = map(noiseVal, 0, 1, 0, 255);
    }
  }

  // Initialize the grid
  grid = new Array(cols);
  for (let i = 0; i < cols; i++) {
    grid[i] = new Array(rows);
    for (let j = 0; j < rows; j++) {
      grid[i][j] = new Node(i, j, heightMap[i][j]);
    }
  }

  // Add neighbors to each grid cell
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      grid[i][j].addNeighbors(grid);
    }
  }
}

function mousePressed() {
    let startX = floor(entity.x);
    let startY = floor(entity.y);
    let endX = floor(mouseX / resolution);
    let endY = floor(mouseY / resolution);

    if (endX >= 0 && endX < cols && endY >= 0 && endY < rows) {
        let startNode = grid[startX][startY];
        let endNode = grid[endX][endY];

        // Generate a new path using A* algorithm
        let generatedPath = aStar(startNode, endNode);

        // Reverse the path so it starts from the entity's current position
        path = generatedPath.reverse(); // Assuming 'path' is the global variable storing the path

        // Reset the entity's pathIndex to start following the new path
        if (path && path.length > 0) {
            entity.pathIndex = 0;
        }
    }
}



class Node {
  constructor(x, y, height) {
    this.x = x;
    this.y = y;
    this.height = height; // Height at this node
    this.g = Infinity; // Cost from start to this node
    this.h = 0; // Heuristic estimate from this node to end
    this.f = Infinity; // Total cost (g + h)
    this.previous = undefined; // For path reconstruction
    this.neighbors = []; // Adjacent nodes
  }

  addNeighbors(grid) {
    let x = this.x;
    let y = this.y;
    if (x < cols - 1) this.neighbors.push(grid[x + 1][y]);
    if (x > 0) this.neighbors.push(grid[x - 1][y]);
    if (y < rows - 1) this.neighbors.push(grid[x][y + 1]);
    if (y > 0) this.neighbors.push(grid[x][y - 1]);
  }
}

function aStar(start, end) {
  let openSet = [start];
  let closedSet = [];
  start.g = 0;
  start.f = heuristic(start, end);

  while (openSet.length > 0) {
    let lowestIndex = 0;
    for (let i = 0; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    let current = openSet[lowestIndex];

    if (current === end) {
      let path = [];
      let temp = current;
      while (temp !== undefined && temp.previous !== temp) { // Check for undefined and self-reference
        path.push(temp);
        temp = temp.previous; // Follow the chain of previous nodes
        if (path.indexOf(temp) !== -1) {
          console.error('Cycle detected in path reconstruction, aborting to avoid infinite loop.');
          break; // Detects a cycle, breaks to avoid infinite loop
        }
      }
      return path;
    }


    openSet.splice(lowestIndex, 1);
    closedSet.push(current);

    for (let neighbor of current.neighbors) {
      if (!closedSet.includes(neighbor)) {
        let tempG = current.g + dist(current.x, current.y, neighbor.x, neighbor.y) + abs(neighbor.height - current.height);

        let newPath = false;
        if (openSet.includes(neighbor)) {
          if (tempG < neighbor.g) {
            neighbor.g = tempG;
            newPath = true;
          }
        } else {
          neighbor.g = tempG;
          newPath = true;
          openSet.push(neighbor);
        }

        if (newPath) {
          neighbor.h = heuristic(neighbor, end);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.previous = current;
        }
      }
    }
  }

  return []; // No path found
}

function heuristic(a, b) {
  // Manhattan distance, could also use Euclidean distance
  return abs(a.x - b.x) + abs(a.y - b.y);
}

function drawPath() {
  stroke(0, 255, 0); // Set path color
  strokeWeight(2); // Set path line thickness
  noFill();
  
  beginShape();
  for (let p of path) {
    vertex(p.x * resolution + resolution / 2, p.y * resolution + resolution / 2);
  }
  endShape();
}

function drawEntity() {
  // Get the height value at the entity's current position
  noStroke();
  let heightValue = heightMap[entity.x][entity.y];

  // Create a pulsating effect using the sine of the frame count
  let pulse = sin(frameCount * 0.3) * 128 + 128; // Pulsates between 0 and 256

  // Map the height value to a brightness range (0-255 for RGB)
  let baseBrightness = map(heightValue, 0, 255, 50, 255);

  // Apply the pulsating effect to the base brightness
  let brightness = ((baseBrightness * pulse) / 255);

  // Clamp the brightness to ensure it remains within the 0-255 range
  brightness = constrain(brightness, 0, 255);

  // Set fill to a shade of red based on the mapped and pulsating brightness
  fill(brightness, 0, 0);

  // Draw the entity as a square
  rect(entity.x * resolution, entity.y * resolution, resolution, resolution);
}



function drawHeightMap() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      fill(heightMap[i][j]);
      noStroke();
      rect(i * resolution, j * resolution, resolution, resolution);
    }
  }
}

function updateEntityPosition() {
    if (entity.pathIndex !== undefined && path.length > 0 && entity.pathIndex < path.length) {
        // Get the next path position
        let nextPos = path[entity.pathIndex];
        entity.x = nextPos.x; // Update entity position
        entity.y = nextPos.y;
        entity.pathIndex++; // Move to the next point on the path

        // Darken the heightmap cell by reducing its value
        heightMap[entity.x][entity.y] = max(heightMap[entity.x][entity.y] - 10, 0); // Reduce height, ensure it's not less than 0

        if (entity.pathIndex >= path.length) {
            console.log("Reached the target");
            // Clear the path and reset pathIndex when the target is reached
            path = []; // Clear the current path
            entity.pathIndex = undefined; // Reset pathIndex
        }
    }
}



function draw() {
    background(220);
    drawHeightMap(); // Function that draws the height map
    //drawPath(); // Function that draws the path (if you're visually representing it)
    updateEntityPosition(); // Move the entity along the path
    drawEntity(); // Function that draws the entity on the canvas
}
