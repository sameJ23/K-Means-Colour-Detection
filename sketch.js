// === YOUR ORIGINAL GLOBALS (kept) ===
let k = 5;
let STEP = 5;
let ITER = 200;
let img;
let sampleArray = [];
let centroids = [];
let compliment = [];

// === UI elements (p5-created) ===
let kSlider, iterSlider, stepSlider;
let fileInput;            // single-file upload
let folderInput;          // folder upload (webkitdirectory)
let recomputeTimer;

function preload(){
  // img = loadImage('Zeri_0.jpg'); // optional default
}

function setup() {
  pixelDensity(1);
  noStroke();

  const controlsHost = select('#controls');
  const canvasHost = select('#canvasWrap');

  // Canvas: fit to container width initially (16:9 until an image is loaded)
  const w = canvasHost.elt.clientWidth || 960;
  const h = Math.round(w * 9/16);
  const cnv = createCanvas(w, h);
  cnv.parent('canvasWrap');
  cnv.addClass('p5Canvas');

  // Helper to make labeled rows that match the card UI
  const row = (labelText, elt) => {
    const wrap = createDiv().parent(controlsHost);
    wrap.addClass('control');
    const lab = createElement('label', labelText).parent(wrap);
    lab.style('min-width','120px');
    lab.style('color','var(--muted)');
    elt.parent(wrap);
  };

  // Sliders
  kSlider = createSlider(2, 12, k, 1);
  kSlider.input(scheduleRecompute);
  row('Clusters (k)', kSlider);

  iterSlider = createSlider(1, 1000, ITER, 1);
  iterSlider.input(scheduleRecompute);
  row('Iterations', iterSlider);

  stepSlider = createSlider(1, 20, STEP, 1);
  stepSlider.input(scheduleRecompute);
  row('Quality (STEP)', stepSlider);

  // File inputs
  fileInput = createFileInput(handleFileUpload);
  row('Image', fileInput);

  folderInput = createElement('input').attribute('type','file').attribute('multiple','').attribute('webkitdirectory','');
  folderInput.changed(handleFolderUpload);
  row('Folder', folderInput);

  noLoop(); // draw on demand
}

function windowResized(){
  fitCanvasToHost();
  redraw();
}

// Debounce heavy recomputes while dragging sliders
function scheduleRecompute(){
  k = kSlider.value();
  ITER = iterSlider.value();
  STEP = stepSlider.value();
  if (recomputeTimer) clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(recompute, 120);
}

// Keep the canvas sized to the container, and scale to image if present
function fitCanvasToHost(){
  const host = document.getElementById('canvasWrap');
  const maxW = host.clientWidth || 960;

  if (!img){
    resizeCanvas(maxW, Math.round(maxW * 9 / 16));
    return;
  }
  const scale = maxW / img.width;
  resizeCanvas(maxW, Math.round(img.height * scale));
}

// === Core flow ===
function draw() {
  if (!img) return;

  // draw image scaled to current canvas width
  const scale = width / img.width;
  const imgH = Math.round(img.height * scale);
  image(img, 0, 0, width, imgH);

  // palette strip on the right
  const stripW = Math.max(120, Math.round(width * 0.18));
  const stripX = width - stripW;
  const stripY = 0;
  const stripH = imgH;

  showPalette(centroids, stripX, stripY, stripW, stripH);
}

function recompute() {
  if (!img) return;
  sampleArray.length = 0;
  sample(img, STEP);             // YOUR sampler
  centroids = kmeans(ITER, k);   // YOUR k-means
  fitCanvasToHost();
  redraw();
}

// === Upload handlers ===
function handleFileUpload(file) {
  if (file && file.type && file.type.startsWith('image')) {
    loadImage(file.data, (loaded) => {
      img = loaded;
      recompute();
    }, (err) => console.error('Image load failed:', err));
  }
}

function handleFolderUpload() {
  const files = Array.from(this.elt.files).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  const url = URL.createObjectURL(files[0]);
  loadImage(url, (loaded) => {
    img = loaded;
    recompute();
    URL.revokeObjectURL(url);
  }, (err) => console.error('Folder image load failed:', err));
}

/* =========================
   EVERYTHING BELOW IS YOURS
   (unchanged logic)
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
      const cid = closest[i];
      sums[cid][0] += sampleArray[i][0];
      sums[cid][1] += sampleArray[i][1];
      sums[cid][2] += sampleArray[i][2];
      counts[cid]++;
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
  let dr = a[0] - b[0];
  let dg = a[1] - b[1];
  let db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function coloursEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function containsColour(list, colour) {
  return list.some(c => coloursEqual(c, colour));
}

function showPalette(cols, x, y, w, h){
  if (!cols || !cols.length) return;
  const sorted = [...cols].sort((a, b) => luminanceRGB(b) - luminanceRGB(a));
  noStroke();

  // gradient bands
  for (let c = 0; c < sorted.length - 1; c++){
    for (let p = 0; p < 1; p += 0.01){
      const c1 = color(sorted[c][0], sorted[c][1], sorted[c][2]);
      const c2 = color(sorted[c+1][0], sorted[c+1][1], sorted[c+1][2]);
      const mid = lerpColor(c1, c2, p);
      fill(mid);
      rect(x, y + (h/(sorted.length-1)) * (c + p), w, h/(sorted.length-1));
    }
  }

  // solid swatches
  const cellH = h / sorted.length;
  for (let i = 0; i < sorted.length; i++){
    fill(sorted[i][0], sorted[i][1], sorted[i][2]);
    rect(x, y + i * cellH, w, cellH + 1);
  }
}

function luminanceRGB(c) {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
