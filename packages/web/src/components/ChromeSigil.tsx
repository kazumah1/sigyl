import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Link } from 'react-router-dom';

const SigilGeometry = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation that responds to scroll position
      groupRef.current.rotation.y += 0.005;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  // Chrome material properties
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    metalness: 1,
    roughness: 0.1,
    envMapIntensity: 1,
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central diamond */}
      <mesh position={[0, -0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.6, 0.6, 0.1]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      {/* Top vertical beam */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      {/* Angled branches - top left */}
      <mesh position={[-0.6, 0.6, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      {/* Angled branches - top right */}
      <mesh position={[0.6, 0.6, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      {/* Side branches - left */}
      <mesh position={[-0.8, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      {/* Side branches - right */}
      <mesh position={[0.8, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      {/* Bottom angled branches */}
      <mesh position={[-0.4, -0.8, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
      
      <mesh position={[0.4, -0.8, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <primitive object={chromeMaterial} />
      </mesh>
    </group>
  );
};

const ChromeSigil = () => (
  <Link to="/" className="block focus:outline-none">
    <img
      src="/favicon.png"
      alt="Sigyl Logo"
      className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-lg hover:scale-105 transition-transform duration-200"
      draggable={false}
      style={{ background: 'rgba(0,0,0,0.7)', padding: 4 }}
    />
  </Link>
);

export default ChromeSigil;
