/* ============================================================
   ANOMALY SCENE — wireframe icosahedron, noise-displaced,
   reacts to cursor. Sits behind the hero as ambient atmosphere.
   ============================================================ */
(function () {
  const container = document.getElementById("scene-container");
  if (!container || typeof THREE === "undefined") return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getSize = () => ({
    w: container.clientWidth || window.innerWidth,
    h: container.clientHeight || window.innerHeight,
  });

  let { w, h } = getSize();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.z = 4.2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(1.5, 24);

  const vertexShader = `
    uniform float time;
    varying vec3 vNormal;

    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m*m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vNormal = normal;
      float displacement = snoise(position * 1.6 + time * 0.35) * 0.22;
      vec3 newPosition = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 color;
    varying vec3 vNormal;

    void main() {
      vec3 normal = normalize(vNormal);
      float fresnel = pow(1.0 - abs(normal.z), 2.2);
      vec3 finalColor = color * (0.25 + fresnel * 1.1);
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0xff3b3b) },
    },
    vertexShader,
    fragmentShader,
    wireframe: true,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let targetRotX = 0, targetRotY = 0;

  window.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    targetRotY = x * 0.4;
    targetRotX = y * 0.25;
  });

  window.addEventListener("resize", () => {
    const size = getSize();
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    renderer.setSize(size.w, size.h);
  });

  let frameId;
  function animate(t) {
    material.uniforms.time.value = t * 0.0003;
    mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.02 + 0.0012;
    mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.02;
    renderer.render(scene, camera);
    if (!reduceMotion) {
      frameId = requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
  if (reduceMotion) {
    // Render a single still frame instead of looping.
    animate(0);
    cancelAnimationFrame(frameId);
  }
})();

(function () {
  const glitchItems = document.querySelectorAll('.glitch-text');
  if (!glitchItems.length) return;

  const createTextMorph = (el, targetText) => {
    el.textContent = targetText;
  };

  const animateGlitch = (el, targetText, direction) => {
    if (el.dataset.locked === targetText) return;
    el.dataset.locked = targetText;

    el.classList.add('glitching');
    el.setAttribute('data-default', targetText);

    setTimeout(() => {
      createTextMorph(el, targetText);
      el.classList.remove('glitching');
    }, 420);
  };

  glitchItems.forEach((item) => {
    const defaultText = item.getAttribute('data-default') || 'ⓢⓒ⓪ⓓ③ⓡ';
    const hoverText = item.getAttribute('data-hover') || 'SURAJ CHAUHAN';
    item.textContent = defaultText;

    item.addEventListener('mouseenter', () => {
      animateGlitch(item, hoverText, 'forward');
    });

    item.addEventListener('mouseleave', () => {
      animateGlitch(item, defaultText, 'reverse');
    });
  });
})();

/* ============================================================
   DOCK NAV — hover magnification of neighboring icons,
   active state driven by the current page (each nav item
   is a real link to its own HTML file).
   ============================================================ */
(function () {
  const items = Array.from(document.querySelectorAll(".dock-item"));
  if (!items.length) return;

  items.forEach((item, idx) => {
    item.addEventListener("mouseenter", () => {
      items.forEach((other, otherIdx) => {
        const distance = Math.abs(otherIdx - idx);
        other.classList.remove("neighbor");
        if (distance === 1) other.classList.add("neighbor");
      });
    });
    item.addEventListener("mouseleave", () => {
      items.forEach((other) => other.classList.remove("neighbor"));
    });
  });

  const currentPage = document.body.dataset.page;
  items.forEach((item) => {
    item.classList.toggle("active", item.dataset.target === currentPage);
  });
})();