
let k = 5;
let STEP = 5;
let ITER = 100;
let img;
let sampleArray = [];
let centroids = [];
let compliment = [];

function preload(){
  img = loadImage('Zeri_0.jpg');
}

function setup() {
  pixelDensity(1);
  noStroke();
  createCanvas(img.width+200, img.height);
  sample(img, STEP);          // sample once
  centroids = kmeans(ITER, k);// compute once
  noLoop();
}

function draw() {
  image(img,0,0);
  showPalette(centroids, 10, 10, 40, 40);
}

function sample(img, step){
  img.loadPixels()
  for (let i = 0; i < img.height; i += step){
    for (let j = 0; j < img.width; j += step){
      let index = (i * img.width + j) * 4;
      let r = img.pixels[index];
      let g = img.pixels[index + 1];
      let b = img.pixels[index + 2];
      sampleArray.push([r,g,b]);
    }
  }
}

function kmeans(iter, k, img) {
  let topColours = [];
  for (let y = 0; y < k; y++){
    let randColour = random(sampleArray)
    while(containsColour(topColours,randColour)){
      randColour = random(sampleArray)
    }
    topColours.push([...randColour])
  }
  for (let x = 0; x < iter; x++){
    const closest = [];
    for (let z = 0; z < sampleArray.length; z++){
      let bestDistancePos= 0;
      let bestDistance = distance(sampleArray[z], topColours[0]);
      for (let c = 1; c < topColours.length; c++){
        if (distance(sampleArray[z], topColours[c]) < bestDistance){
          bestDistance = distance(sampleArray[z], topColours[c]);
          bestDistancePos = c;
        }
      }
      closest.push(bestDistancePos);
    }
  const sums = Array.from({ length: k }, () => [0, 0, 0]);
  const counts = new Array(k).fill(0);
  for (let i = 0; i < sampleArray.length; i++){
    sums[closest[i]][0] += sampleArray[i][0]
    sums[closest[i]][1] += sampleArray[i][1]
    sums[closest[i]][2] += sampleArray[i][2]
    counts[closest[i]]++;
  }
  for (let j = 0; j < k; j++) {
  if (counts[j] > 0) {
     topColours[j] = [
       sums[j][0] / counts[j],
       sums[j][1] / counts[j],
       sums[j][2] / counts[j]
     ];
   } else {
     topColours[j] = [...random(sampleArray)]; // reseed empty cluster
   }
 } 
    
  }
  return topColours.map(c => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]);
}

function distance(a, b){
  dr = a[0] - b[0];
  dg = a[1] - b[1];
  db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function coloursEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function containsColour(list, colour) {
  return list.some(c => coloursEqual(c, colour));
}

function showPalette(cols, x, y, w, h){
  cols.sort((a, b) => luminanceRGB(b) - luminanceRGB(a));
  noStroke();
  for (let c = 0; c < cols.length - 1; c++){
    for (let p = 0; p < 1; p += 0.01){
      let c1 = color(cols[c][0],cols[c][1],cols[c][2])
      let c2 = color(cols[c+1][0],cols[c+1][1],cols[c+1][2])
      colour = lerpColor(c1,c2,p)
      fill(colour);
      rect(img.width+100,img.height/k*p + c*img.height/k,100,img.height/(k-1))
    }
  }
  
  for (let i = 0; i < cols.length; i++){
    fill(cols[i][0], cols[i][1], cols[i][2]);
    rect(img.width,i*img.height/k, 100, img.height/k +2);
  }
}


function luminanceRGB(c) {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}