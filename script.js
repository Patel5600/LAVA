const THREE = window.THREE;
const gsapInstance = window.gsap;
const ScrollTriggerInstance = window.ScrollTrigger;

if (!THREE || !gsapInstance || !ScrollTriggerInstance) {
  throw new Error("Core visual libraries failed to load.");
}

const gsap = gsapInstance;
const ScrollTrigger = ScrollTriggerInstance;
gsap.registerPlugin(ScrollTrigger);

// Smooth scrolling using Lenis (guard if CDN fails)
const lenis = window.Lenis
  ? new Lenis({
      duration: 1.2,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.2,
    })
  : null;

function raf(time) {
  if (lenis) {
    lenis.raf(time);
  }
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Three.js volcanic core + volcano scene
const canvas = document.getElementById("lava-scene");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.22);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 1.5, 7.2);

// Volcanic ground lava plane - enhanced with Fractal Brownian Motion for better detail
const groundGeometry = new THREE.PlaneGeometry(80, 80, 250, 250);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    lavaColor: { value: new THREE.Color(0xff2a00) },
    lavaHighlight: { value: new THREE.Color(0xffcc66) },
    darkCore: { value: new THREE.Color(0x330000) },
  },
  transparent: true,
  vertexShader: `
    varying vec2 vUv;
    varying float vHeight;
    uniform float time;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave1 = sin(pos.x * 0.25 + time * 0.6) * 0.15 +
                    cos(pos.z * 0.18 - time * 0.4) * 0.15;
      float wave2 = sin(pos.x * 0.08 + time * 0.2) * 0.08 +
                    cos(pos.z * 0.12 + time * 0.3) * 0.08;
      pos.y += wave1 + wave2;
      vHeight = wave1 + wave2;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vHeight;
    uniform vec3 lavaColor;
    uniform vec3 lavaHighlight;
    uniform vec3 darkCore;
    
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
    float noise(in vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    float fbm(vec2 p){
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for(int i = 0; i < 4; i++){
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }
    
    void main() {
      float n = fbm(vUv * 8.0);
      float detail = noise(vUv * 24.0);
      float lava = smoothstep(0.35, 1.0, n + vHeight * 1.2 + detail * 0.3);
      
      vec3 col = mix(darkCore, lavaColor, lava);
      col = mix(col, lavaHighlight, pow(lava, 8.0));
      col += vec3(1.0, 0.5, 0.2) * detail * 0.15 * (1.0 - lava);
      
      float alpha = 0.95;
      gl_FragColor = vec4(col, alpha);
    }
  `,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -1.5;
scene.add(ground);

const coreGeometry = new THREE.IcosahedronGeometry(1.2, 5);
const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x050505,
  metalness: 0.95,
  roughness: 0.28,
  emissive: 0x761000,
  emissiveIntensity: 0.75,
});
const core = new THREE.Mesh(coreGeometry, coreMaterial);
scene.add(core);

// Background volcano cone
const volcanoGroup = new THREE.Group();
const volcanoGeometry = new THREE.ConeGeometry(4.5, 8.5, 64, 32);
const volcanoMaterial = new THREE.MeshStandardMaterial({
  color: 0x050505,
  roughness: 0.9,
  metalness: 0.1,
});
const volcanoMesh = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
volcanoMesh.position.set(0, 2.2, -14);
volcanoGroup.add(volcanoMesh);

// Glowing crater ring
const craterGeometry = new THREE.TorusGeometry(1.4, 0.25, 32, 64);
const craterMaterial = new THREE.MeshBasicMaterial({
  color: 0xff7b00,
  transparent: true,
  opacity: 0.7,
});
const crater = new THREE.Mesh(craterGeometry, craterMaterial);
crater.rotation.x = Math.PI / 2;
crater.position.set(0, 4.5, -13.5);
volcanoGroup.add(crater);

// Smoke plume columns
const plumeGeometry = new THREE.CylinderGeometry(0.4, 1.2, 12, 32, 8, true);
const plumeMaterial = new THREE.MeshBasicMaterial({
  color: 0x777777,
  transparent: true,
  opacity: 0.28,
});
const plume = new THREE.Mesh(plumeGeometry, plumeMaterial);
plume.position.set(0.2, 9, -13.5);
volcanoGroup.add(plume);

volcanoGroup.position.y = -0.5;
scene.add(volcanoGroup);

// Basalt rock shards around
const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.95,
  metalness: 0.05,
});
for (let i = 0; i < 16; i++) {
  const size = 0.25 + Math.random() * 0.35;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMaterial);
  const radius = 3 + Math.random() * 3;
  const angle = Math.random() * Math.PI * 2;
  rock.position.set(Math.cos(angle) * radius, -1.2 + Math.random() * 0.3, Math.sin(angle) * radius);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(rock);
}

// 3D Basalt column forest
const basaltGroup = new THREE.Group();
const basaltForeground = new THREE.Group();
const basaltBackground = new THREE.Group();
basaltGroup.add(basaltForeground);
basaltGroup.add(basaltBackground);
scene.add(basaltGroup);

const basaltColumns = [];
const basaltGeo = new THREE.CylinderGeometry(0.24, 0.3, 1, 6, 1); // hexagonal prism
const basaltMat = new THREE.MeshStandardMaterial({
  color: 0x151515,
  roughness: 0.92,
  metalness: 0.2,
  emissive: 0x1a0c05,
  emissiveIntensity: 0.4,
});

function createBasaltField(targetGroup, rows, cols, radius, depthStart, depthStep, heightMin, heightMax) {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const mesh = new THREE.Mesh(basaltGeo, basaltMat.clone());
      const offsetX = (j - cols / 2) * radius * 0.9;
      const offsetZ = depthStart + i * depthStep + (Math.random() - 0.5) * 0.6;
      const height = heightMin + Math.random() * (heightMax - heightMin);
      mesh.scale.y = height;
      mesh.position.set(offsetX + (i % 2 === 0 ? radius * 0.45 : 0), -3.5, offsetZ);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      targetGroup.add(mesh);
      basaltColumns.push({
        mesh,
        baseY: -3.5,
        targetOffset: 1.6 + height * 0.7 + Math.random() * 0.6,
        layer: targetGroup === basaltForeground ? "fg" : "bg",
      });
    }
  }
}

createBasaltField(basaltForeground, 4, 10, 0.9, -5, -1.2, 1.2, 2.2);
createBasaltField(basaltBackground, 4, 10, 1.0, -11, -1.3, 1.4, 2.8);

// 3D Pumice islands over lava sea
const pumiceGroup = new THREE.Group();
scene.add(pumiceGroup);

const pumiceIslands3D = [];
const pumiceGeo = new THREE.DodecahedronGeometry(0.7, 1);
const pumiceMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.95,
  metalness: 0.05,
});

for (let i = 0; i < 6; i++) {
  const mesh = new THREE.Mesh(pumiceGeo, pumiceMat.clone());
  const lane = i % 3; // spread in z
  const x = -3 + i * 2.4;
  const z = 1 + lane * 1.8;
  mesh.position.set(x, -0.8, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  pumiceGroup.add(mesh);
  pumiceIslands3D.push({ mesh, offset: Math.random() * Math.PI * 2 });
}

// Lava tube tunnel around camera - Enhanced with volumetric lighting
const tubeUniforms = {
  time: { value: 0 },
  progress: { value: 0 },
};
const tubeGeometry = new THREE.CylinderGeometry(6, 6, 40, 48, 80, true);
tubeGeometry.rotateZ(Math.PI / 2); // lay horizontally along X axis
const tubeMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  transparent: true,
  uniforms: tubeUniforms,
  vertexShader: `
    varying vec3 vPos;
    varying vec2 vUv;
    void main() {
      vPos = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vPos;
    varying vec2 vUv;
    uniform float time;
    uniform float progress;

    float hash(vec3 p){
      return fract(sin(dot(p, vec3(12.9898,78.233, 45.164))) * 43758.5453);
    }
    
    float noise(vec3 p){
      vec3 i = floor(p);
      vec3 f = fract(p);
      float n = mix(
        mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
            mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
            mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      return n;
    }

    void main() {
      // radial glow with vignetting
      float r = length(vPos.yz) / 6.0;
      float base = smoothstep(1.3, 0.2, r);
      float vignette = smoothstep(1.0, 0.3, r);

      // lava streaks along tube with more complexity
      float bands = sin(vPos.x * 1.2 + time * 2.0) * 0.4 + 0.6;
      float cracks = noise(vPos * 1.5 + time * 0.5);
      float distortion = sin(vPos.x * 0.8 + time) * 0.3 + 0.7;

      // scroll-synced pulse traveling forward (volumetric lighting effect)
      float pulsePos = mix(-1.0, 1.0, progress);
      float pulse = exp(-8.0 * pow(vPos.x / 20.0 - pulsePos, 2.0));
      float volumetric = pulse * (0.5 + 0.5 * sin(vPos.x * 2.0 + time));

      vec3 lava = vec3(1.0, 0.35, 0.05);
      vec3 ember = vec3(1.0, 0.8, 0.4);
      vec3 dark = vec3(0.02, 0.01, 0.02);

      vec3 col = mix(dark, lava, base * bands * distortion);
      col += ember * volumetric * 1.5;
      col += lava * cracks * 0.12;
      col += vec3(1.0, 0.6, 0.2) * pulse * 0.8;

      float alpha = clamp(base * vignette + pulse * 0.8, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `,
});
const lavaTube = new THREE.Mesh(tubeGeometry, tubeMaterial);
lavaTube.position.set(0, 0.4, 0);
scene.add(lavaTube);

// Magma cracks via shader
const crackMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    time: { value: 0 },
    glowColor: { value: new THREE.Color(0xff2a00) },
  },
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vPos;
    uniform float time;
    uniform vec3 glowColor;
    float noise(vec3 p){
      return fract(sin(dot(p, vec3(12.9898,78.233, 45.164))) * 43758.5453);
    }
    void main() {
      float crack = smoothstep(0.45, 0.5, noise(vPos * 3.0 + time));
      gl_FragColor = vec4(glowColor, crack * 0.9);
    }
  `,
});
const crackMesh = new THREE.Mesh(coreGeometry, crackMaterial);
core.add(crackMesh);

// Floating lava orbs
const orbMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xff7b00,
  emissive: 0xff2a00,
  emissiveIntensity: 1.5,
  roughness: 0.05,
  metalness: 0.3,
});
const orbs = [];
for (let i = 0; i < 12; i++) {
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), orbMaterial);
  orb.position.set(Math.random() * 3 - 1.5, Math.random() * 1.6 - 0.8, Math.random() * 2 - 1);
  scene.add(orb);
  orbs.push(orb);
}

// Ember particles - Enhanced with better drift and movement
const particleCount = 800;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const velocities = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 8;
  positions[i * 3 + 1] = Math.random() * 5;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

  // More varied color palette
  const warmth = 0.5 + Math.random() * 0.5;
  colors[i * 3] = 1;
  colors[i * 3 + 1] = 0.4 + warmth * 0.5;
  colors[i * 3 + 2] = Math.random() * 0.2;
  
  // Add slight drift velocities
  velocities[i * 3] = (Math.random() - 0.5) * 0.02;
  velocities[i * 3 + 1] = Math.random() * 0.03;
  velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
}

const emberGeometry = new THREE.BufferGeometry();
emberGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
emberGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

const emberMaterial = new THREE.PointsMaterial({
  size: 0.08,
  vertexColors: true,
  transparent: true,
  opacity: 0.7,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});

const embers = new THREE.Points(emberGeometry, emberMaterial);
scene.add(embers);

// Store velocities for animation
const emberVelocities = velocities;

// Lighting
const ambient = new THREE.AmbientLight(0xffa366, 0.35);
const keyLight = new THREE.PointLight(0xff2a00, 3, 10);
keyLight.position.set(1.5, 1.2, 1.5);
const fillLight = new THREE.PointLight(0xffcc66, 1.5, 8);
fillLight.position.set(-1.5, -0.5, -1.5);
scene.add(ambient, keyLight, fillLight);

// Postprocessing-like bloom via sprite overlay
const glowTexture = new THREE.TextureLoader().load(
  "https://assets.codepen.io/3685267/sun-soft-glow.png"
);
const glow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff7b00,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
);
glow.scale.set(8, 8, 1);
scene.add(glow);

// Eruption / pressure system
let pressure = 0;
let isCharging = false;
let lastEruptionTime = 0;
const PRESSURE_MAX = 1;
const PRESSURE_MIN_DELAY = 15; // Fixed 15 second intervals
const PRESSURE_MAX_DELAY = 15;

const eruptionState = {
  fragments: [],
  meteorites: [],
};

function scheduleNextCharge() {
  const now = performance.now() / 1000;
  const delay = 15; // Always 15 seconds
  lastEruptionTime = now;
  setTimeout(() => startPressureCycle(), delay * 1000);
}

function startPressureCycle(triggeredByScroll = false) {
  if (isCharging) return;
  isCharging = true;
  const targetPressure = 1;

  gsap.to({ value: 0 }, {
    value: targetPressure,
    duration: triggeredByScroll ? 2.6 : 3,
    ease: "power2.inOut",
    onUpdate: function () {
      pressure = this.targets()[0].value;
      applyPressureVisuals(pressure);
    },
    onComplete: triggerEruption,
  });
}

function applyPressureVisuals(level) {
  coreMaterial.emissiveIntensity = 0.75 + level * 1.4;
  keyLight.intensity = 3 + level * 2.5;
  fillLight.intensity = 1.5 + level * 1.3;
  core.scale.setScalar(1 + level * 0.06);
  glow.material.opacity = 0.35 + level * 0.3;
}

function spawnEruptionFragments() {
  const fragmentCount = 140;
  const geometry = new THREE.SphereGeometry(0.08, 10, 10);
  const material = new THREE.MeshStandardMaterial({
    color: 0x331005,
    emissive: 0xff4a00,
    emissiveIntensity: 1.4,
    roughness: 0.4,
    metalness: 0.4,
  });

  for (let i = 0; i < fragmentCount; i++) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.copy(core.position);
    const angle = Math.random() * Math.PI * 2;
    const up = 1.5 + Math.random() * 2;
    const radius = 0.3 + Math.random() * 1.2;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * radius,
      up,
      Math.sin(angle) * radius
    );
    const life = 1.6 + Math.random() * 0.7;
    eruptionState.fragments.push({ mesh, velocity, life, age: 0 });
    scene.add(mesh);
  }
}

function spawnMeteorites() {
  const meteoriteCount = 50;
  const meteoriteGeometry = new THREE.IcosahedronGeometry(0.15, 2);
  const meteoriteMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    emissive: 0xFF6B35,
    emissiveIntensity: 0.8,
    roughness: 0.8,
    metalness: 0.3,
  });

  for (let i = 0; i < meteoriteCount; i++) {
    const meteor = new THREE.Mesh(meteoriteGeometry, meteoriteMaterial.clone());
    meteor.position.set(
      (Math.random() - 0.5) * 25,
      12 + Math.random() * 8,
      (Math.random() - 0.5) * 25
    );
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.8,
      -8 - Math.random() * 4,
      (Math.random() - 0.5) * 0.8
    );
    
    const life = 3 + Math.random() * 2;
    const rotationSpeed = new THREE.Vector3(
      Math.random() * 0.1,
      Math.random() * 0.1,
      Math.random() * 0.1
    );
    
    eruptionState.meteorites.push({ 
      mesh: meteor, 
      velocity, 
      life, 
      age: 0, 
      rotationSpeed 
    });
    scene.add(meteor);
  }
}

function triggerScreenShake() {
  const body = document.body;
  body.classList.add("eruption-active");

  gsap.fromTo(
    body,
    { x: -4, y: -4 },
    {
      x: 4,
      y: 4,
      duration: 0.45,
      repeat: 5,
      yoyo: true,
      ease: "sine.inOut",
      onComplete: () => {
        gsap.to(body, { x: 0, y: 0, duration: 0.2, clearProps: "transform" });
        body.classList.remove("eruption-active");
      },
    }
  );
}

function triggerIntenseScreenShake() {
  const body = document.body;
  gsap.fromTo(
    body,
    { x: -8, y: -8, rotation: -2 },
    {
      x: 8,
      y: 8,
      rotation: 2,
      duration: 0.25,
      repeat: 8,
      yoyo: true,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.to(body, { x: 0, y: 0, rotation: 0, duration: 0.3, clearProps: "transform" });
      },
    }
  );
}

function triggerEruption() {
  isCharging = false;
  pressure = 0;
  applyPressureVisuals(0);
  spawnEruptionFragments();
  spawnMeteorites(); // New meteorite system
  triggerScreenShake();
  triggerIntenseScreenShake(); // Additional intense shake

  // Short intense ember size spike
  gsap.fromTo(
    emberMaterial,
    { size: 0.06 },
    { size: 0.14, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.inOut" }
  );

  // Reschedule next eruption cycle
  scheduleNextCharge();
}

scheduleNextCharge();

// Camera movement
let targetRotation = { x: 0, y: 0 };
window.addEventListener("pointermove", (event) => {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = (event.clientY / window.innerHeight) * 2 - 1;
  targetRotation.x = y * 0.2;
  targetRotation.y = x * 0.2;
});

ScrollTrigger.create({
  trigger: "#basalt",
  start: "top bottom",
  end: "bottom top",
  onUpdate: (self) => {
    gsap.to(targetRotation, {
      x: -self.progress * 0.4,
      y: self.progress * 0.5,
      duration: 0.6,
      overwrite: true,
    });
  },
});

// Basalt forest rise progress
let basaltProgress = 0;
ScrollTrigger.create({
  trigger: "#basalt",
  start: "top 80%",
  end: "bottom 20%",
  scrub: true,
  onUpdate: (self) => {
    basaltProgress = self.progress;
  },
});

// Pumice islands camera travel
let pumiceProgress = 0;
ScrollTrigger.create({
  trigger: "#pumice",
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate: (self) => {
    pumiceProgress = self.progress;
  },
});

// Lava tube travel progress
let tubeProgress = 0;
ScrollTrigger.create({
  trigger: ".lava-tubes",
  start: "top top",
  end: "+=200%",
  scrub: true,
  onUpdate: (self) => {
    tubeProgress = self.progress;
    tubeUniforms.progress.value = tubeProgress;
    document.body.classList.toggle("in-tunnels", self.isActive);
  },
});

// Scroll-triggered pressure spike when leaving hero
ScrollTrigger.create({
  trigger: ".hero",
  start: "top top",
  end: "bottom top",
  onLeave: () => startPressureCycle(true),
});

const clock = new THREE.Clock();
function animate() {
  const elapsed = clock.getElapsedTime();
  crackMaterial.uniforms.time.value = elapsed * 0.4;
  groundMaterial.uniforms.time.value = elapsed;
  tubeUniforms.time.value = elapsed;

  // Volcano breathing and plume motion
  crater.material.opacity = 0.55 + Math.sin(elapsed * 2.0) * 0.25;
  crater.scale.setScalar(1 + Math.sin(elapsed * 1.6) * 0.06);
  plume.position.y = 9 + Math.sin(elapsed * 0.8) * 0.6;
  plume.material.opacity = 0.25 + Math.sin(elapsed * 1.1) * 0.1;

  core.rotation.y += 0.002;
  core.rotation.x += 0.0015;
  core.rotation.y += (targetRotation.y - core.rotation.y) * 0.02;
  core.rotation.x += (targetRotation.x - core.rotation.x) * 0.02;

  orbs.forEach((orb, i) => {
    orb.position.y = Math.sin(elapsed + i) * 0.5;
  });

  // Enhanced ember particle animation with drift
  const positionAttribute = emberGeometry.getAttribute("position");
  const posArray = positionAttribute.array;
  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;
    // Add drift velocity
    posArray[idx] += emberVelocities[idx] * 0.016;
    posArray[idx + 1] += emberVelocities[idx + 1] * 0.016;
    posArray[idx + 2] += emberVelocities[idx + 2] * 0.016;
    
    // Wrap around boundaries
    if (posArray[idx] > 8) posArray[idx] = -8;
    if (posArray[idx] < -8) posArray[idx] = 8;
    if (posArray[idx + 1] > 5) posArray[idx + 1] = 0;
    if (posArray[idx + 1] < 0) posArray[idx + 1] = 5;
    if (posArray[idx + 2] > 8) posArray[idx + 2] = -8;
    if (posArray[idx + 2] < -8) posArray[idx + 2] = 8;
  }
  positionAttribute.needsUpdate = true;
  
  embers.rotation.y += 0.0005;

  // Update basalt forest rise & parallax
  const riseStrength = basaltProgress;
  basaltColumns.forEach((col) => {
    const mesh = col.mesh;
    const layerFactor = col.layer === "fg" ? 1.0 : 0.55;
    mesh.position.y = col.baseY + col.targetOffset * riseStrength * layerFactor;
    mesh.material.emissiveIntensity = 0.4 + riseStrength * 0.7 * layerFactor;
  });
  basaltForeground.position.y = riseStrength * 0.4;
  basaltBackground.position.y = riseStrength * 0.2;

  // Pumice 3D islands float + sideways travel
  const cameraSideOffset = (pumiceProgress - 0.5) * 6; // -3 to +3
  camera.position.x = cameraSideOffset * (1.0 - tubeProgress);
  pumiceIslands3D.forEach((island, index) => {
    const mesh = island.mesh;
    const phase = island.offset + elapsed * 0.7 + index * 0.35;
    mesh.position.y = -0.8 + Math.sin(phase) * 0.25;
  });
  pumiceGroup.position.x = -cameraSideOffset * 0.8;

  // Camera adjustment when inside lava tubes
  if (tubeProgress > 0.001) {
    const depth = THREE.MathUtils.lerp(6, -6, tubeProgress);
    camera.position.set(depth, 0.6, 0);
    camera.lookAt(depth + 2, 0.5, 0);
  }

  // Update eruption fragments physics
  for (let i = eruptionState.fragments.length - 1; i >= 0; i--) {
    const frag = eruptionState.fragments[i];
    const dt = clock.getDelta();
    frag.age += dt;
    frag.velocity.y -= 4.5 * dt;
    frag.mesh.position.addScaledVector(frag.velocity, dt);
    const fade = 1 - frag.age / frag.life;
    frag.mesh.material.emissiveIntensity = Math.max(0, fade * 2.0);
    frag.mesh.material.opacity = fade;
    frag.mesh.material.transparent = true;
    if (frag.age >= frag.life) {
      scene.remove(frag.mesh);
      eruptionState.fragments.splice(i, 1);
    }
  }

  // Update meteorite physics
  for (let i = eruptionState.meteorites.length - 1; i >= 0; i--) {
    const meteor = eruptionState.meteorites[i];
    const dt = clock.getDelta();
    meteor.age += dt;
    meteor.velocity.y -= 9.8 * dt; // Gravity
    meteor.mesh.position.addScaledVector(meteor.velocity, dt);
    meteor.mesh.rotation.x += meteor.rotationSpeed.x;
    meteor.mesh.rotation.y += meteor.rotationSpeed.y;
    meteor.mesh.rotation.z += meteor.rotationSpeed.z;
    
    const fade = Math.max(0, 1 - meteor.age / meteor.life);
    meteor.mesh.material.emissiveIntensity = fade * 1.2;
    meteor.mesh.material.opacity = fade;
    meteor.mesh.material.transparent = true;
    
    if (meteor.age >= meteor.life || meteor.mesh.position.y < -10) {
      scene.remove(meteor.mesh);
      eruptionState.meteorites.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Ambient parallax layers
const parallaxLayers = document.querySelectorAll(".ambient");
window.addEventListener("scroll", () => {
  const scroll = window.scrollY;
  parallaxLayers.forEach((layer, index) => {
    const depth = (index + 1) * 0.03;
    layer.style.transform = `translateY(${scroll * depth}px)`;
  });
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// GSAP entrance animations
gsap.from(".hero-content > *", {
  y: 40,
  opacity: 0,
  duration: 1.2,
  ease: "power3.out",
  stagger: 0.15,
  delay: 0.6,
});

gsap.from(".hero-meta > div", {
  y: 30,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
  stagger: 0.15,
  delay: 1,
});

// Basalt columns rise on scroll
gsap.utils.toArray(".basalt-columns span").forEach((col, i) => {
  gsap.to(col, {
    scrollTrigger: {
      trigger: "#basalt",
      start: "top 80%",
      end: "bottom 20%",
      scrub: true,
    },
    yPercent: -10 - i * 8,
  });
});

// Section copy entrance animations
gsap.from(".section-copy", {
  scrollTrigger: {
    trigger: ".section",
    start: "top 75%",
  },
  x: -60,
  opacity: 0,
  duration: 1.2,
  ease: "power3.out",
});

// Obsidian cards entrance (slide from sides)
gsap.utils.toArray(".obsidian-card").forEach((card, index) => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: "#obsidian",
      start: "top 80%",
    },
    x: index % 2 === 0 ? -80 : 80,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out",
  });
});

// Pumice islands bob + horizontal feeling via x offset
gsap.to(".pumice-island", {
  y: 20,
  repeat: -1,
  yoyo: true,
  ease: "sine.inOut",
  duration: 3,
  stagger: {
    each: 0.3,
    from: "random",
  },
});

gsap.to(".pumice-rail", {
  scrollTrigger: {
    trigger: "#pumice",
    start: "top 80%",
    end: "bottom top",
    scrub: true,
  },
  xPercent: -20,
});

// Lava tube horizontal travel (scroll-jacked, pinned)
gsap.to(".lava-tubes-track", {
  scrollTrigger: {
    trigger: ".lava-tubes",
    start: "top top",
    end: "+=200%",
    scrub: true,
    pin: ".lava-tubes-pin",
  },
  xPercent: -65,
  ease: "none",
});

// Crystal growth
gsap.from(".crystal-cluster", {
  scrollTrigger: {
    trigger: ".crystals",
    start: "top 80%",
  },
  scale: 0.6,
  opacity: 0,
  duration: 1.1,
  ease: "back.out(1.6)",
  stagger: 0.15,
});

gsap.to(".crystal-cluster", {
  scrollTrigger: {
    trigger: ".crystals",
    start: "top 80%",
    end: "bottom top",
    scrub: true,
  },
  "--pointer-y": "0%",
});

// Ash field fade-in with enhanced effect
gsap.from(".ash-inner", {
  scrollTrigger: {
    trigger: ".ash",
    start: "top 85%",
  },
  y: 80,
  opacity: 0,
  duration: 1.2,
  ease: "power3.out",
});

// Ash column link animations
gsap.from(".ash-column", {
  scrollTrigger: {
    trigger: ".ash",
    start: "top 85%",
  },
  x: (index) => (index % 2 === 0 ? -40 : 40),
  opacity: 0,
  duration: 1,
  ease: "power2.out",
  stagger: 0.1,
});

// Themed button click effects with lava physics
document.querySelectorAll(".cta").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    triggerButtonImpact(event, button);
    burstEmbers(event, button, true);
    
    // Screen shake effect for primary buttons
    if (button.classList.contains("primary")) {
      triggerButtonShake(button);
    }
  });
  
  // Add pointer down effect
  button.addEventListener("pointerdown", (event) => {
    button.style.transform = "scale(0.95)";
  });
  
  button.addEventListener("pointerup", (event) => {
    button.style.transform = "";
  });
});

function triggerButtonImpact(event, button) {
  const rect = button.getBoundingClientRect();
  const impactX = event.clientX - rect.left;
  const impactY = event.clientY - rect.top;
  
  // Create radial burst effect
  const burst = document.createElement("span");
  burst.className = "lava-impact";
  burst.style.left = `${impactX}px`;
  burst.style.top = `${impactY}px`;
  button.appendChild(burst);
  
  // Animate the impact
  gsap.from(burst, {
    width: 0,
    height: 0,
    opacity: 1,
    duration: 0.6,
    ease: "power2.out",
    onComplete: () => burst.remove(),
  });
}

function triggerButtonShake(button) {
  gsap.to(button, {
    x: -3,
    y: -2,
    duration: 0.08,
    repeat: 4,
    yoyo: true,
    ease: "sine.inOut",
  });
}

// Ember bursts on interactive elements
const cards = document.querySelectorAll(".obsidian-card, .pumice-island, .tube-stop, .crystal-cluster");
cards.forEach((card) => {
  card.addEventListener("pointerenter", (event) => burstEmbers(event, card));
});

// Social pill interactions
document.querySelectorAll(".cta").forEach((button) => {
  button.addEventListener("click", (event) => {
    burstEmbers(event, button, true);
  });
});

// Social pill heat shimmer
const socials = document.querySelectorAll(".social-pill");
socials.forEach((pill) => {
  pill.addEventListener("pointermove", (event) => {
    const rect = pill.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    pill.style.setProperty("--pointer-x", `${x}%`);
    pill.style.setProperty("--pointer-y", `${y}%`);
  });
  pill.addEventListener("click", (event) => {
    burstEmbers(event, pill, true);
  });
});

// Button pointer tracking
document.querySelectorAll(".cta").forEach((button) => {
  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    button.style.setProperty("--pointer-x", `${x}%`);
    button.style.setProperty("--pointer-y", `${y}%`);
  });
});

function burstEmbers(event, element, compact = false) {
  const burst = document.createElement("span");
  burst.className = "ember-burst";
  if (compact) burst.classList.add("compact");
  const rect = element.getBoundingClientRect();
  burst.style.left = `${event.clientX - rect.left}px`;
  burst.style.top = `${event.clientY - rect.top}px`;
  element.appendChild(burst);
  setTimeout(() => burst.remove(), 600);
}

// Heat shimmer ripple via CSS vars
cards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--pointer-x", `${x}%`);
    card.style.setProperty("--pointer-y", `${y}%`);
  });
});

// Ash section hover effects with pointer tracking
const ashInner = document.querySelector(".ash-inner");
if (ashInner) {
  ashInner.addEventListener("pointermove", (event) => {
    const rect = ashInner.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    ashInner.style.setProperty("--pointer-x", `${x}%`);
    ashInner.style.setProperty("--pointer-y", `${y}%`);
  });

  ashInner.addEventListener("pointerleave", () => {
    ashInner.style.setProperty("--pointer-x", "50%");
    ashInner.style.setProperty("--pointer-y", "50%");
  });
}

