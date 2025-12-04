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

// Volcanic ground lava plane
const groundGeometry = new THREE.PlaneGeometry(60, 60, 200, 200);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    lavaColor: { value: new THREE.Color(0xff2a00) },
    lavaHighlight: { value: new THREE.Color(0xffcc66) },
  },
  transparent: true,
  vertexShader: `
    varying vec2 vUv;
    varying float vHeight;
    uniform float time;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave = sin(pos.x * 0.25 + time * 0.6) * 0.15 +
                   cos(pos.z * 0.18 - time * 0.4) * 0.15;
      pos.y += wave;
      vHeight = wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vHeight;
    uniform vec3 lavaColor;
    uniform vec3 lavaHighlight;
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
    void main() {
      float n = noise(vUv * 12.0);
      float lava = smoothstep(0.4, 1.0, n + vHeight * 1.2);
      vec3 col = mix(vec3(0.02,0.0,0.0), lavaColor, lava);
      col = mix(col, lavaHighlight, pow(lava, 8.0));
      float alpha = 0.9;
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

// Ember particles
const particleCount = 600;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 6;
  positions[i * 3 + 1] = Math.random() * 4;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

  colors[i * 3] = 1;
  colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
  colors[i * 3 + 2] = 0;
}

const emberGeometry = new THREE.BufferGeometry();
emberGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
emberGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

const emberMaterial = new THREE.PointsMaterial({
  size: 0.06,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const embers = new THREE.Points(emberGeometry, emberMaterial);
scene.add(embers);

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
const PRESSURE_MIN_DELAY = 10; // seconds
const PRESSURE_MAX_DELAY = 24;

const eruptionState = {
  fragments: [],
};

function scheduleNextCharge() {
  const now = performance.now() / 1000;
  const delay =
    PRESSURE_MIN_DELAY + Math.random() * (PRESSURE_MAX_DELAY - PRESSURE_MIN_DELAY);
  lastEruptionTime = now;
  setTimeout(() => startPressureCycle(), delay * 1000);
}

function startPressureCycle(triggeredByScroll = false) {
  if (isCharging) return;
  isCharging = true;
  const targetPressure = 1;

  gsap.to({ value: 0 }, {
    value: targetPressure,
    duration: triggeredByScroll ? 2.6 : 4,
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

function triggerEruption() {
  isCharging = false;
  pressure = 0;
  applyPressureVisuals(0);
  spawnEruptionFragments();
  triggerScreenShake();

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
  trigger: ".portfolio",
  start: "top bottom",
  end: "bottom top",
  onUpdate: (self) => {
    gsap.to(targetRotation, {
      x: -self.progress * 0.5,
      y: self.progress * 0.6,
      duration: 0.6,
      overwrite: true,
    });
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

  embers.rotation.y += 0.0005;

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

gsap.from(".portfolio-card", {
  scrollTrigger: {
    trigger: ".portfolio",
    start: "top 80%",
  },
  y: 60,
  opacity: 0,
  duration: 1.1,
  stagger: 0.2,
  ease: "power3.out",
});

gsap.from(".about-panel", {
  scrollTrigger: {
    trigger: ".about",
    start: "top 80%",
  },
  y: 80,
  opacity: 0,
  duration: 1.1,
  ease: "power3.out",
  stagger: 0.2,
});

// Ember bursts on card hover
const cards = document.querySelectorAll(".portfolio-card");
cards.forEach((card) => {
  card.addEventListener("pointerenter", (event) => burstEmbers(event, card));
});

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

