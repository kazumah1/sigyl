
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Route {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  color: string;
}

const FlowLines = ({ routes }: { routes: Route[] }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material && 'emissive' in mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          const intensity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.2;
          material.emissive = new THREE.Color(0xff6600).multiplyScalar(intensity);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {routes.map((route, index) => {
        const start = new THREE.Vector3(route.start.x, route.start.y, route.start.z);
        const end = new THREE.Vector3(route.end.x, route.end.y, route.end.z);
        const mid = start.clone().lerp(end, 0.5);
        mid.y += 2;

        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <mesh key={index}>
            <tubeGeometry args={[curve, 64, 0.1, 8, false]} />
            <meshStandardMaterial
              color={route.color}
              emissive={route.color}
              emissiveIntensity={0.5}
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const AgentHighway = ({ searchBarRef }: { searchBarRef?: React.RefObject<HTMLDivElement> }) => {
  const routes: Route[] = [
    {
      start: { x: -5, y: 1, z: -5 },
      end: { x: 5, y: 1, z: 5 },
      color: '#ff6600',
    },
    {
      start: { x: 5, y: 1, z: -5 },
      end: { x: -5, y: 1, z: 5 },
      color: '#ff6600',
    },
    {
      start: { x: 0, y: 1, z: -7 },
      end: { x: 0, y: 1, z: 7 },
      color: '#ff6600',
    },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <Canvas style={{ background: 'transparent' }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <FlowLines routes={routes} />
      </Canvas>
    </div>
  );
};

export default AgentHighway;
export { AgentHighway };
