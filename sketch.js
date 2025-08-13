// === YOUR ORIGINAL GLOBALS (kept) ===
let k = 5;
let STEP = 5;
let ITER = 200;
let img;
let sampleArray = [];
let centroids = [];
let compliment = [];

// === NEW: UI elements ===
let kSlider, iterSlider, stepSlider;
let fileInput;            // single-file upload
let folderInput;          // folder upload (webkitdirectory)

// Keep your preload if you want a default image when the page opens.
// Users can overwrite it via the inputs.
function preload(){
  img = loadImage('Zeri_0.jpg'); // keep or remove; uploads will replace img
}

// put these near your globals
let html = { k: null, iter: null, step: null, file: null, folder: null };

function setup() {
  pixelDensity(1);
  noStroke();

  // find the HTML controls that are already on the page
  bindControls();

  // canvas goes *below* the controls because the controls are in HTML flow
  createCanvas(img ? img.width + 200 : 800, img ? img.height : 600);

  recompute();
  noLoop();
}

function bindControls(){
  html.k     = document.getElementById('k');
  html.iter  = document.getElementById('iter');
  html.step  = document.getElementById('step');
  html.file  = document.getElementById('imgFile');
  html.folder= document.getElementById('folderInput');

  if (html.k) {
    html.k.value = k;
    html.k.addEventListener('input', () => { k = +html.k.value; recompute(); });
  }
  if (html.iter) {
    html.iter.value = ITER;
    html.iter.addEventListener('input', () => { ITER = +html.iter.value; recompute(); });
  }
  if (html.step) {
    html.step.value = STEP;
    html.step.addEventListener('input', () => { STEP = +html.step.value; recompute(); });
  }
  if (html.file) {
    html.file.addEventListener('change', () => {
      const f = html.file.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      loadImage(url, (loaded) => { img = loaded; URL.revokeObjectURL(url); resizeIfNeeded(); recompute(); });
    });
  }
  if (html.folder) {
    html.folder.addEventListener('change', () => {
      const files = [...html.folder.files].filter(f => f.type.startsWith('image/'));
      if (!files.length) return;
      const url = URL.createObjectURL(files[0]);
      loadImage(url, (loaded) => { img = loaded; URL.revokeObjectURL(url); resizeIfNeeded(); recompute(); });
    });
  }
}

function recompute(){
  if (!img) return;
  sampleArray.length = 0;
  sample(img, STEP);            // your sampler
  centroids = kmeans(ITER, k);  // your k-means
  resizeIfNeeded();
  redraw();
}

function resizeIfNeeded(){
  if (!img) return;
  const W = img.width + 200, H = img.height;
  if (width !== W || height !== H) resizeCanvas(W, H);
}

function draw() {
  if (!img) return;
  image(img, 0, 0);
  // Keep your rendering exactly the same:
  showPalette(centroids, 10, 10, 40, 40);
}

// === NEW: central recompute that uses YOUR code exactly ===
function recompute() {
  if (!img) return;
  sampleArray.length = 0;     // clear previous samples
  sample(img, STEP);          // YOUR sampler (unchanged)
  centroids = kmeans(ITER, k);// YOUR k-means (unchanged)
  resizeIfNeeded();           // keep canvas aligned to image (esp. after uploads)
  redraw();
}

// === NEW: uploads ===
function handleFileUpload(file) {
  if (file && file.type.startsWith('image')) {
    loadImage(file.data, (loaded) => {
      img = loaded;
      recompute();
    }, (err) => console.error('Image load failed:', err));
  }
}

function handleFolderUpload() {
  // Pick the first image in the folder (minimal UI by design)
  const files = Array.from(this.elt.files).filter(f => f.type.startsWith('image/'));
  if (files.length === 0) return;
  const first = files[0];
  const url = URL.createObjectURL(first);
  loadImage(url, (loaded) => {
    img = loaded;
    recompute();
    URL.revokeObjectURL(url);
  }, (err) => console.error('Folder image load failed:', err));
}

// === NEW: keep canvas sized to the current image so your layout stays identical ===
function resizeIfNeeded() {
  const targetW = img.width + 200;
  const targetH = img.height;
  if (width !== targetW || height !== targetH) {
    resizeCanvas(targetW, targetH);
  }
}

/* =========================
   EVERYTHING BELOW IS YOURS
   (unchanged from your code)
   ========================= */

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
