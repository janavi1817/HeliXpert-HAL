"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";

interface HelicopterProps {
  isTransitioning: boolean;
}

function HelicopterModel({ isTransitioning }: HelicopterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mainRotorRef = useRef<THREE.Group>(null);
  const tailRotorRef = useRef<THREE.Group>(null);
  const beaconLightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (mainRotorRef.current) {
      const rotorSpeed = isTransitioning ? 32 : 18;
      mainRotorRef.current.rotation.y += delta * rotorSpeed;
    }
    if (tailRotorRef.current) {
      const tailSpeed = isTransitioning ? 48 : 28;
      tailRotorRef.current.rotation.x += delta * tailSpeed;
    }
    if (groupRef.current) {
      if (!isTransitioning) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.25 - 0.3;
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
      } else {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.2, delta * 3);
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, -8, delta * 2);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 2.5, delta * 2);
      }
    }
    if (beaconLightRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 5);
      beaconLightRef.current.intensity = pulse > 0.6 ? 2.0 : 0.1;
    }
  });

  // Premium light silver/white material
  const bodyMat = (
    <meshStandardMaterial
      color="#d4cce8"
      metalness={0.7}
      roughness={0.28}
    />
  );

  const darkMat = (
    <meshStandardMaterial
      color="#b8b0d0"
      metalness={0.75}
      roughness={0.3}
    />
  );

  const accentMat = (
    <meshStandardMaterial
      color="#8b5cf6"
      metalness={0.8}
      roughness={0.25}
    />
  );

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* Main Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.6, 1.4, 3.2]} />
        <meshStandardMaterial color="#cdc8e8" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.1, 1.9]} rotation={[0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.85, 1.2, 16]} />
        <meshStandardMaterial color="#c4bfe0" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Cockpit Canopy Glass — soft blue tint */}
      <mesh position={[0, 0.35, 1.2]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.3, 0.8, 1.5]} />
        <meshPhysicalMaterial
          color="#a78bfa"
          transmission={0.6}
          opacity={0.75}
          transparent
          roughness={0.08}
          metalness={0.1}
          reflectivity={0.95}
        />
      </mesh>

      {/* Engine cowling */}
      <mesh position={[0, 0.85, -0.2]} castShadow>
        <boxGeometry args={[1.2, 0.6, 1.8]} />
        <meshStandardMaterial color="#b8b0d0" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Exhaust nozzles */}
      <mesh position={[-0.45, 0.85, -1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.5, 16]} />
        <meshStandardMaterial color="#9080b8" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0.45, 0.85, -1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.5, 16]} />
        <meshStandardMaterial color="#9080b8" metalness={0.9} roughness={0.35} />
      </mesh>

      {/* Tail boom */}
      <mesh position={[0, 0.2, -2.6]} rotation={[-0.05, 0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.45, 3.2, 16]} />
        <meshStandardMaterial color="#c0b8d8" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical tail fin — purple accent */}
      <mesh position={[0, 0.9, -4.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.1, 1.2, 0.8]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Horizontal stabilizer */}
      <mesh position={[0, 0.4, -3.8]}>
        <boxGeometry args={[1.6, 0.06, 0.4]} />
        <meshStandardMaterial color="#a78bfa" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Rotor mast */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color="#9080b8" metalness={0.95} roughness={0.2} />
      </mesh>

      {/* Main rotor */}
      <group ref={mainRotorRef} position={[0, 1.55, 0]}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.12, 16]} />
          <meshStandardMaterial color="#8b5cf6" metalness={0.85} roughness={0.2} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <group key={idx} rotation={[0, angle, 0]}>
            <mesh position={[2.1, 0, 0]}>
              <boxGeometry args={[3.8, 0.02, 0.22]} />
              <meshStandardMaterial color="#d4cce8" metalness={0.7} roughness={0.25} />
            </mesh>
            {/* Blade tip glow — purple */}
            <mesh position={[4.0, 0, 0]}>
              <boxGeometry args={[0.1, 0.03, 0.22]} />
              <meshBasicMaterial color="#a78bfa" />
            </mesh>
          </group>
        ))}
        {/* Rotor blur disc — soft purple */}
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 4.1, 32]} />
          <meshBasicMaterial
            color="#c4b5fd"
            transparent
            opacity={isTransitioning ? 0.22 : 0.10}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Tail rotor */}
      <group ref={tailRotorRef} position={[0.16, 1.1, -4.3]}>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.06, 1.2, 0.12]} />
          <meshStandardMaterial color="#e9e4f8" metalness={0.75} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.06, 1.2, 0.12]} />
          <meshStandardMaterial color="#e9e4f8" metalness={0.75} />
        </mesh>
      </group>

      {/* Landing skids */}
      <mesh position={[-0.8, -0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 12]} />
        <meshStandardMaterial color="#9080b8" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0.8, -0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 12]} />
        <meshStandardMaterial color="#9080b8" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Struts */}
      {[
        [-0.8, -0.45,  0.6, -0.3],
        [ 0.8, -0.45,  0.6,  0.3],
        [-0.8, -0.45, -0.6, -0.3],
        [ 0.8, -0.45, -0.6,  0.3],
      ].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />
          <meshStandardMaterial color="#9080b8" metalness={0.85} />
        </mesh>
      ))}

      {/* Navigation lights */}
      <mesh position={[-0.85, 0.1, 0.5]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0.85, 0.1, 0.5]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>

      {/* Beacon */}
      <pointLight ref={beaconLightRef} position={[0, 1.2, -0.8]} color="#ec4899" distance={5} intensity={1} />
      <mesh position={[0, 1.15, -0.8]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#ec4899" />
      </mesh>

      {/* Chin pod */}
      <mesh position={[0, -0.55, 1.8]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#b0a8cc" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.55, 1.95]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshBasicMaterial color="#a78bfa" />
      </mesh>
    </group>
  );
}

export default function HelicopterScene({ isTransitioning }: { isTransitioning: boolean }) {
  return (
    <div className="relative w-full h-[420px] md:h-[500px]">
      <Canvas
        camera={{ position: [0, 1.2, 6.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        {/* Lighting for light/pastel look */}
        <ambientLight intensity={1.2} color="#f5f0ff" />
        <directionalLight position={[8, 10, 6]}  intensity={1.6} color="#ede9fe" castShadow />
        <pointLight       position={[-6, 4,  4]}  intensity={0.8} color="#c4b5fd" />
        <pointLight       position={[6,  2, -4]}  intensity={0.6} color="#f9a8d4" />
        <pointLight       position={[0,  6,  2]}  intensity={0.5} color="#bae6fd" />

        {/* Fog to match hero gradient */}
        <fog attach="fog" args={["#ede9fe", 8, 22]} />

        {/* Pastel sparkle particles */}
        <Sparkles count={40} scale={8} size={1.8} speed={0.3} color="#c4b5fd" opacity={0.45} />

        <Float
          speed={isTransitioning ? 0.5 : 1.4}
          rotationIntensity={0.25}
          floatIntensity={isTransitioning ? 0.2 : 0.7}
        >
          <HelicopterModel isTransitioning={isTransitioning} />
        </Float>
      </Canvas>

      {/* Soft radial glow under helicopter */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full bg-purple-400/20 dark:bg-purple-500/15 blur-2xl pointer-events-none" />
    </div>
  );
}
