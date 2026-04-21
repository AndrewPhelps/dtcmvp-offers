'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import * as THREE from 'three';

// Simplex noise GLSL code
const noiseGLSL = `
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
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

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

interface MoleculeLoaderProps {
  width?: number;
  height?: number;
  className?: string;
  onParticlesReady?: () => void;
  isCollapsing?: boolean;
  onCollapseComplete?: () => void;
}

export default function MoleculeLoader({
  width = 200,
  height = 200,
  className = '',
  onParticlesReady,
  isCollapsing = false,
  onCollapseComplete
}: MoleculeLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [animationPhase, setAnimationPhase] = useState<'logo' | 'particles' | 'complete'>('logo');
  const startTimeRef = useRef<number>(0);

  // Handle collapse completion callback
  useEffect(() => {
    if (isCollapsing) {
      // Wait for CSS transition to complete, then call callback
      const timer = setTimeout(() => {
        onCollapseComplete?.();
      }, 250); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isCollapsing, onCollapseComplete]);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const container = containerRef.current;

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Create dot texture with brand green color
    const createDotTexture = (size = 32, color = '#7bed9f') => {
      const sizeH = size * 0.5;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const circle = new Path2D();
      circle.arc(sizeH, sizeH, sizeH, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill(circle);

      return new THREE.CanvasTexture(canvas);
    };

    // Create geometry and material (detail level controls particle density)
    const geometry = new THREE.IcosahedronGeometry(1, 14);
    const material = new THREE.PointsMaterial({
      map: createDotTexture(32, '#7bed9f'),
      blending: THREE.NormalBlending,
      color: 0x7bed9f, // Brand green
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });

    // Shader configuration
    const targetRadius = 1.5;
    const particleSizeMin = 0.01;
    const particleSizeMax = 0.08;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.radius = { value: 0 }; // Start at 0 for expansion animation
      shader.uniforms.particleSizeMin = { value: particleSizeMin };
      shader.uniforms.particleSizeMax = { value: particleSizeMax };

      shader.vertexShader =
        'uniform float particleSizeMax;\n' +
        'uniform float particleSizeMin;\n' +
        'uniform float radius;\n' +
        'uniform float time;\n' +
        noiseGLSL + '\n' +
        shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          vec3 p = position;
          float n = snoise(vec3(p.x * 0.6 + time * 0.2, p.y * 0.4 + time * 0.3, p.z * 0.2 + time * 0.2));
          p += n * 0.4;

          // Constrain to sphere radius
          float l = radius / length(p);
          p *= l;
          float s = mix(particleSizeMin, particleSizeMax, n);
          vec3 transformed = vec3(p.x, p.y, p.z);
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        'gl_PointSize = s;'
      );

      material.userData.shader = shader;
    };

    // Create mesh
    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);

    // Animation timing - tuned so text appears around 750ms (well before first message change at 2000ms)
    const logoAnimDuration = 300; // ms for logo to animate up
    const delayAfterLogo = 100; // pause before particles start
    const particleExpandDuration = 350; // ms for particles to expand
    const delayAfterParticles = 0; // no pause - text appears immediately after particles
    let particlesStarted = false;
    let particlesComplete = false;

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const time = now * 0.001;

      // Initialize start time on first frame
      if (startTimeRef.current === 0) {
        startTimeRef.current = now;
      }

      const elapsed = now - startTimeRef.current;

      // Phase 1: Logo animates up (handled by CSS)
      // Phase 2: After logo animation + delay, expand particles
      const particleStartTime = logoAnimDuration + delayAfterLogo;
      if (elapsed > particleStartTime && !particlesStarted) {
        particlesStarted = true;
        setAnimationPhase('particles');
      }

      // Animate particle radius expansion
      if (material.userData.shader) {
        if (elapsed > particleStartTime) {
          const particleElapsed = elapsed - particleStartTime;
          const expandProgress = Math.min(particleElapsed / particleExpandDuration, 1);
          // Ease out cubic for smooth deceleration
          const eased = 1 - Math.pow(1 - expandProgress, 3);
          material.userData.shader.uniforms.radius.value = targetRadius * eased;

          // Signal when particles are fully expanded + delay
          if (expandProgress >= 1 && !particlesComplete) {
            const delayElapsed = particleElapsed - particleExpandDuration;
            if (delayElapsed >= delayAfterParticles) {
              particlesComplete = true;
              setAnimationPhase('complete');
              onParticlesReady?.();
            }
          }
        }

        material.userData.shader.uniforms.time.value = time;
      }

      mesh.rotation.set(0, time * 0.2, 0);
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      initializedRef.current = false;
    };
  }, [width, height]);

  const logoSize = Math.min(width, height) * 0.42;

  // Simple visibility: show when animationPhase is not 'logo' AND not collapsing
  const showContent = animationPhase !== 'logo' && !isCollapsing;

  return (
    <div
      className={`relative ${className} transition-all ease-out ${
        isCollapsing ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
      }`}
      style={{ width, height, transitionDuration: '250ms' }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out ${
          showContent
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-90'
        }`}
      >
        <div className="animate-pulse-glow">
          <Image
            src="/dtcmvp-logo.svg"
            alt="DTC MVP"
            width={logoSize}
            height={logoSize}
          />
        </div>
      </div>
    </div>
  );
}
