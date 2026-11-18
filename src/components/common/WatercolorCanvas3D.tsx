import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface WatercolorCanvas3DProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  showPetals?: boolean;
  className?: string;
}

const _tmpColor = new THREE.Color();
const _targetPrimary = new THREE.Color();
const _targetSecondary = new THREE.Color();
const _targetAccent = new THREE.Color();
const _targetBg = new THREE.Color();
const _dummyObj = new THREE.Object3D();

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createCurvedPetalGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.18, 0.26, 6, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Taper into an organic rose/lotus petal silhouette
    const ny = (y + 0.13) / 0.26; // 0 bottom -> 1 top
    const widthProfile = Math.sin(ny * Math.PI) * (0.65 + 0.35 * (1 - ny * 0.4));
    const curvedX = x * widthProfile;
    const cupZ = Math.sin(ny * Math.PI) * 0.032 - (curvedX * curvedX) * 1.8;
    pos.setXYZ(i, curvedX, y, cupZ);
  }
  geo.computeVertexNormals();
  return geo;
}

export const WatercolorCanvas3D: React.FC<WatercolorCanvas3DProps> = ({
  primaryColor = '#881337',
  secondaryColor = '#FDF4F5',
  accentColor = '#B45309',
  backgroundColor = '#FAF8F5',
  showPetals = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);

  // Live theme colors stored in ref so prop updates smoothly damp without recreating WebGL context
  const colorTargetsRef = useRef({
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor,
    background: backgroundColor,
  });

  useEffect(() => {
    colorTargetsRef.current = {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: backgroundColor,
    };
  }, [primaryColor, secondaryColor, accentColor, backgroundColor]);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setFallbackActive(true);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setFallbackActive(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setFallbackActive(true);
    };
    const handleContextRestored = () => {
      setFallbackActive(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();

    // Mandatory studio environment reflection for gilded gold flakes
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      50
    );
    camera.position.set(0, 0, 5.5);

    // Warm key + cool hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0xe7e5e4, 1.1);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    // 1. Fullscreen 3D Watercolor Paper & Pigment Wash Shader Plane
    const uPrimary = new THREE.Color(primaryColor);
    const uSecondary = new THREE.Color(secondaryColor);
    const uAccent = new THREE.Color(accentColor);
    const uBg = new THREE.Color(backgroundColor);

    const watercolorUniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: {
        value: new THREE.Vector2(
          container.clientWidth || window.innerWidth,
          container.clientHeight || window.innerHeight
        ),
      },
      uPrimary: { value: uPrimary },
      uSecondary: { value: uSecondary },
      uAccent: { value: uAccent },
      uBg: { value: uBg },
    };

    const backdropGeo = new THREE.PlaneGeometry(18, 12, 1, 1);
    const backdropMat = new THREE.ShaderMaterial({
      uniforms: watercolorUniforms,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        uniform vec3 uPrimary;
        uniform vec3 uSecondary;
        uniform vec3 uAccent;
        uniform vec3 uBg;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.02;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          float aspect = uResolution.x / max(uResolution.y, 1.0);
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

          // Gentle scroll and mouse curl
          vec2 pointerOffset = (uMouse - 0.5) * 0.24;
          vec2 scrollDrift = vec2(sin(uScroll * 2.2) * 0.16, -uScroll * 0.45);

          float t = uTime * 0.08;
          vec2 q = vec2(
            fbm(p * 1.45 + scrollDrift + vec2(0.0, t)),
            fbm(p * 1.45 + pointerOffset + vec2(5.2, -t * 0.8))
          );
          vec2 r = vec2(
            fbm(p * 1.9 + 1.4 * q + vec2(1.7, 9.2) + t * 0.5),
            fbm(p * 1.9 + 1.4 * q + vec2(8.3, 2.8) - t * 0.4)
          );
          float wash = fbm(p * 1.3 + r);

          // Cold-pressed cotton paper fiber micro-texture
          float grain = (noise(uv * 190.0) - 0.5) * 0.025;

          // Pigment bloom edges (characteristic watercolor drying ring)
          float bloom1 = smoothstep(0.32, 0.68, wash);
          float bloomRing = smoothstep(0.46, 0.52, wash) * (1.0 - smoothstep(0.52, 0.60, wash));
          float goldVeil = smoothstep(0.54, 0.85, fbm(p * 2.2 - q + scrollDrift * 0.6));

          vec3 col = mix(uBg, uSecondary, 0.65);
          col = mix(col, mix(uBg, uPrimary, 0.15), bloom1 * 0.85);
          col = mix(col, mix(uBg, uPrimary, 0.26), bloomRing * 0.55);
          col = mix(col, mix(uBg, uAccent, 0.20), goldVeil * 0.72);

          // Subtle luminous radial paper highlight following cursor gently
          float pointerGlow = 1.0 - smoothstep(0.0, 0.85, length(p - (uMouse - 0.5) * vec2(aspect, 1.0)));
          col += pointerGlow * 0.035;
          col += grain;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
    });
    const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    backdropMesh.position.set(0, 0, -3.5);
    scene.add(backdropMesh);

    // 2. Instanced 3D Botanical Petals & Gilded Gold-Leaf Flakes
    const PETAL_COUNT = showPetals ? 34 : 0;
    const GOLD_COUNT = 28;

    const petalGeo = createCurvedPetalGeometry();
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0.06,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });

    const petalMesh =
      PETAL_COUNT > 0 ? new THREE.InstancedMesh(petalGeo, petalMat, PETAL_COUNT) : null;

    interface ParticleMeta {
      x: number;
      y: number;
      z: number;
      rx: number;
      ry: number;
      rz: number;
      speedY: number;
      swayAmp: number;
      swayFreq: number;
      phase: number;
      scale: number;
    }

    const petalData: ParticleMeta[] = [];
    if (petalMesh) {
      petalMesh.frustumCulled = false;
      for (let i = 0; i < PETAL_COUNT; i += 1) {
        petalData.push({
          x: (Math.random() - 0.5) * 9.0,
          y: (Math.random() - 0.5) * 6.5,
          z: -1.5 + Math.random() * 3.0,
          rx: Math.random() * Math.PI * 2,
          ry: Math.random() * Math.PI * 2,
          rz: Math.random() * Math.PI * 2,
          speedY: 0.14 + Math.random() * 0.18,
          swayAmp: 0.25 + Math.random() * 0.35,
          swayFreq: 0.5 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          scale: 0.7 + Math.random() * 0.75,
        });
        _tmpColor.set(primaryColor).lerp(new THREE.Color('#FDE68A'), (i % 5) * 0.12);
        petalMesh.setColorAt(i, _tmpColor);
      }
      if (petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true;
      scene.add(petalMesh);
    }

    // Gold-leaf dust flakes
    const goldGeo = new THREE.OctahedronGeometry(0.028, 0);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.92,
      transparent: true,
      opacity: 0.65,
    });
    const goldMesh = new THREE.InstancedMesh(goldGeo, goldMat, GOLD_COUNT);
    goldMesh.frustumCulled = false;
    const goldData: ParticleMeta[] = [];
    for (let i = 0; i < GOLD_COUNT; i += 1) {
      goldData.push({
        x: (Math.random() - 0.5) * 8.5,
        y: (Math.random() - 0.5) * 6.0,
        z: -1.8 + Math.random() * 3.2,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        speedY: 0.05 + Math.random() * 0.08,
        swayAmp: 0.18 + Math.random() * 0.25,
        swayFreq: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.9,
      });
    }
    scene.add(goldMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Smooth pointer & scroll tracking
    const pointerTarget = { x: 0.5, y: 0.5 };
    const pointerCurrent = { x: 0.5, y: 0.5 };
    let scrollCurrent = 0;

    const onPointerMove = (e: PointerEvent) => {
      pointerTarget.x = e.clientX / Math.max(window.innerWidth, 1);
      pointerTarget.y = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
    };

    const getScrollProgress = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      return docHeight > 0 ? window.scrollY / docHeight : 0;
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      watercolorUniforms.uResolution.value.set(w, h);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Smoothly damp colors, pointer, scroll, and camera parallax
      const targets = colorTargetsRef.current;
      _targetPrimary.set(targets.primary);
      _targetSecondary.set(targets.secondary);
      _targetAccent.set(targets.accent);
      _targetBg.set(targets.background);

      const dampFactor = 1 - Math.exp(-3.5 * delta);
      uPrimary.lerp(_targetPrimary, dampFactor);
      uSecondary.lerp(_targetSecondary, dampFactor);
      uAccent.lerp(_targetAccent, dampFactor);
      uBg.lerp(_targetBg, dampFactor);

      pointerCurrent.x = THREE.MathUtils.damp(pointerCurrent.x, pointerTarget.x, 4.0, delta);
      pointerCurrent.y = THREE.MathUtils.damp(pointerCurrent.y, pointerTarget.y, 4.0, delta);
      scrollCurrent = THREE.MathUtils.damp(scrollCurrent, getScrollProgress(), 5.0, delta);

      watercolorUniforms.uTime.value = elapsed;
      watercolorUniforms.uScroll.value = scrollCurrent;
      watercolorUniforms.uMouse.value.set(pointerCurrent.x, pointerCurrent.y);

      camera.position.x = (pointerCurrent.x - 0.5) * 0.35;
      camera.position.y = (pointerCurrent.y - 0.5) * 0.25 - scrollCurrent * 0.55;
      camera.lookAt(0, -scrollCurrent * 0.4, 0);

      // Update floating petals
      if (petalMesh) {
        for (let i = 0; i < PETAL_COUNT; i += 1) {
          const p = petalData[i];
          p.y -= p.speedY * delta;
          if (p.y < -3.4) p.y = 3.4;
          const xPos = p.x + Math.sin(elapsed * p.swayFreq + p.phase) * p.swayAmp;
          const yPos = p.y - scrollCurrent * 0.9;
          const wrappedY = ((((yPos + 3.4) % 6.8) + 6.8) % 6.8) - 3.4;

          _dummyObj.position.set(xPos, wrappedY, p.z);
          _dummyObj.rotation.set(
            p.rx + elapsed * 0.35,
            p.ry + elapsed * 0.28,
            p.rz + Math.sin(elapsed * 0.6 + p.phase) * 0.4
          );
          _dummyObj.scale.setScalar(p.scale);
          _dummyObj.updateMatrix();
          petalMesh.setMatrixAt(i, _dummyObj.matrix);
        }
        petalMesh.instanceMatrix.needsUpdate = true;
      }

      // Update gilded gold-leaf flakes
      for (let i = 0; i < GOLD_COUNT; i += 1) {
        const g = goldData[i];
        g.y += g.speedY * delta;
        if (g.y > 3.2) g.y = -3.2;
        const xPos = g.x + Math.cos(elapsed * g.swayFreq + g.phase) * g.swayAmp;
        _dummyObj.position.set(xPos, g.y, g.z);
        _dummyObj.rotation.set(g.rx + elapsed * 0.6, g.ry + elapsed * 0.5, g.rz);
        _dummyObj.scale.set(g.scale, g.scale * 0.4, g.scale);
        _dummyObj.updateMatrix();
        goldMesh.setMatrixAt(i, _dummyObj.matrix);
      }
      goldMesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      backdropGeo.dispose();
      backdropMat.dispose();
      petalGeo.dispose();
      petalMat.dispose();
      goldGeo.dispose();
      goldMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [showPetals]);

  if (fallbackActive) {
    return (
      <div
        className={`fixed inset-0 pointer-events-none z-0 ${className}`}
        style={{
          background: `radial-gradient(circle at 20% 25%, ${secondaryColor} 0%, ${backgroundColor} 55%, ${primaryColor}14 100%)`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
};
