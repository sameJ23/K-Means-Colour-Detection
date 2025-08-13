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

function setup() {
  pixelDensity(1);
  noStroke();

  // Create a canvas that fits the current image (will be resized when users load new images)
  createCanvas(img ? img.width + 200 : 800, img ? img.height : 600);

  // === NEW: build minimal UI (no palette changes) ===
  // k (clusters)
  kSlider = createSlider(2, 12, k, 1);
  kSlider.position(10, 10);
  kSlider.input(() => { k = kSlider.value(); recompute(); });

  // iterations
  iterSlider = createSlider(1, 1000, ITER, 1);
  iterSlider.position(10, 40);
  iterSlider.input(() => { ITER = iterSlider.value(); recompute(); });

  // sampling step (quality / speed tradeoff)
  stepSlider = createSlider(1, 20, STEP, 1);
  stepSlider.position(10, 70);
  stepSlider.input(() => { STEP = stepSlider.value(); recompute(); });

  // Single image upload (uses p5's file input)
  fileInput = createFileInput(handleFileUpload);
  fileInput.position(10, 100);

  // Folder upload (Chrome/Edge/Opera). Firefox has partial support.
  folderInput = createElement('input');
  folderInput.attribute('type', 'file');
  folderInput.attribute('multiple', '');
  folderInput.attribute('webkitdirectory', ''); // key for folders
  folderInput.position(10, 130);
  folderInput.changed(handleFolderUpload);

  // FIRST RUN using your exact pipeline
  recompute();

  noLoop(); // we’ll call redraw() manually after recompute
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
