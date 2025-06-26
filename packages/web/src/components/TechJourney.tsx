
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Text, useGLTF, Sphere, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// Realistic Motherboard Component
const RealisticMotherboard = ({ progress }: { progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const circuitRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
    
    // Subtle LED animation on circuits
    circuitRefs.current.forEach((circuit, i) => {
      if (circuit && circuit.material) {
        const material = circuit.material as THREE.MeshStandardMaterial;
        const intensity = 0.2 + Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.1;
        material.emissive = new THREE.Color(0x00ff88).multiplyScalar(intensity);
      }
    });
  });

  return (
    <group ref={groupRef} scale={[3, 3, 3]} visible={progress < 0.3}>
      {/* PCB Base - Dark Green */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[12, 0.3, 9]} />
        <meshStandardMaterial 
          color="#1a4a1a" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* CPU Socket - Realistic Black Plastic */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[3, 0.4, 3]} />
        <meshStandardMaterial 
          color="#0a0a0a" 
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* CPU - Metallic with Heat Spreader */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2.8, 0.2, 2.8]} />
        <meshStandardMaterial 
          color="#c0c0c0" 
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      
      {/* RAM Slots - Black Plastic */}
      {[...Array(4)].map((_, i) => (
        <group key={i}>
          <mesh position={[-4.5 + i * 2.5, 0.15, 3]}>
            <boxGeometry args={[1.2, 0.4, 0.3]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* RAM Modules */}
          <mesh position={[-4.5 + i * 2.5, 0.5, 3]}>
            <boxGeometry args={[1.1, 1.2, 0.2]} />
            <meshStandardMaterial 
              color="#0066ff" 
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>
        </group>
      ))}
      
      {/* Realistic Circuit Traces */}
      {[...Array(30)].map((_, i) => (
        <mesh 
          key={i} 
          ref={(el) => { if (el) circuitRefs.current[i] = el; }}
          position={[
            (Math.random() - 0.5) * 10,
            0.16,
            (Math.random() - 0.5) * 7
          ]}
        >
          <boxGeometry args={[Math.random() * 3 + 1, 0.02, 0.08]} />
          <meshStandardMaterial 
            color="#00cc66" 
            emissive="#00cc66"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
      
      {/* Capacitors - Various Sizes */}
      {[...Array(20)].map((_, i) => (
        <mesh key={i} position={[
          (Math.random() - 0.5) * 9,
          0.4,
          (Math.random() - 0.5) * 6
        ]}>
          <cylinderGeometry args={[0.15, 0.15, 0.6]} />
          <meshStandardMaterial 
            color={Math.random() > 0.5 ? "#2a4d8a" : "#8a2a2a"} 
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}
      
      {/* Resistors */}
      {[...Array(15)].map((_, i) => (
        <mesh key={i} position={[
          (Math.random() - 0.5) * 9,
          0.25,
          (Math.random() - 0.5) * 6
        ]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#d4af37" />
        </mesh>
      ))}
    </group>
  );
};

// Professional Cable Management
const ProfessionalCables = ({ progress }: { progress: number }) => {
  const cableGroupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (cableGroupRef.current) {
      cableGroupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const createCable = (start: THREE.Vector3, end: THREE.Vector3, color: string, index: number) => {
    const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
    midPoint.y += Math.sin(index) * 2;
    
    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    
    return (
      <mesh key={index}>
        <tubeGeometry args={[curve, 32, 0.12, 8, false]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    );
  };

  return (
    <group ref={cableGroupRef} visible={progress >= 0.3 && progress < 0.6}>
      {/* Power Cables */}
      {createCable(
        new THREE.Vector3(-8, 2, -4),
        new THREE.Vector3(8, 6, 4),
        "#ff4444",
        0
      )}
      {createCable(
        new THREE.Vector3(6, 3, -5),
        new THREE.Vector3(-6, 8, 3),
        "#4444ff",
        1
      )}
      {createCable(
        new THREE.Vector3(-4, 4, 6),
        new THREE.Vector3(4, 10, -2),
        "#44ff44",
        2
      )}
      
      {/* Data Cables */}
      {[...Array(6)].map((_, i) => 
        createCable(
          new THREE.Vector3(
            Math.sin(i) * 6,
            2 + i,
            Math.cos(i) * 6
          ),
          new THREE.Vector3(
            Math.sin(i + Math.PI) * 8,
            8 + i * 2,
            Math.cos(i + Math.PI) * 8
          ),
          i % 2 === 0 ? "#333333" : "#666666",
          i + 3
        )
      )}
    </group>
  );
};

// Hyperrealistic Data Center
const HyperrealisticDataCenter = ({ progress }: { progress: number }) => {
  const datacenterRef = useRef<THREE.Group>(null);
  const serverRefs = useRef<THREE.Group[]>([]);
  
  useFrame((state) => {
    if (datacenterRef.current) {
      datacenterRef.current.position.y = 15 + Math.sin(state.clock.elapsedTime * 0.1) * 0.5;
    }
    
    // Subtle server vibration
    serverRefs.current.forEach((server, i) => {
      if (server) {
        server.position.y = Math.sin(state.clock.elapsedTime * 2 + i * 0.5) * 0.02;
      }
    });
  });

  return (
    <group ref={datacenterRef} visible={progress >= 0.6} position={[0, 15, -10]}>
      {/* Data Center Floor */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[40, 0.5, 30]} />
        <meshStandardMaterial 
          color="#e0e0e0" 
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      
      {/* Server Racks - More Realistic */}
      {[...Array(8)].map((_, i) => (
        <group 
          key={i}
          ref={(el) => { if (el) serverRefs.current[i] = el; }}
          position={[(i - 3.5) * 4.5, 0, -8]}
        >
          {/* Rack Frame - Aluminum */}
          <mesh>
            <boxGeometry args={[3.5, 12, 2.5]} />
            <meshStandardMaterial 
              color="#d0d0d0" 
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
          
          {/* Individual Server Units */}
          {[...Array(12)].map((_, j) => (
            <group key={j}>
              <mesh position={[0, -5 + j * 0.9, 1.1]}>
                <boxGeometry args={[3.3, 0.7, 0.4]} />
                <meshStandardMaterial 
                  color="#1a1a1a" 
                  roughness={0.3}
                  metalness={0.7}
                />
              </mesh>
              
              {/* Server LED Indicators */}
              <mesh position={[-1.4, -5 + j * 0.9, 1.3]}>
                <sphereGeometry args={[0.03]} />
                <meshStandardMaterial 
                  color="#00ff00" 
                  emissive="#00ff00"
                  emissiveIntensity={0.5}
                />
              </mesh>
              <mesh position={[-1.2, -5 + j * 0.9, 1.3]}>
                <sphereGeometry args={[0.03]} />
                <meshStandardMaterial 
                  color={Math.random() > 0.7 ? "#ff0000" : "#0000ff"} 
                  emissive={Math.random() > 0.7 ? "#ff0000" : "#0000ff"}
                  emissiveIntensity={0.3}
                />
              </mesh>
            </group>
          ))}
          
          {/* Cooling Fans */}
          {[...Array(4)].map((_, k) => (
            <mesh key={k} position={[0, 4, 1.3]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.1]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* Overhead Cable Trays */}
      <mesh position={[0, 8, -8]}>
        <boxGeometry args={[35, 0.2, 2]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      
      {/* Professional Lighting */}
      <pointLight position={[0, 10, -8]} intensity={2} color="#ffffff" />
      <pointLight position={[-15, 8, -8]} intensity={1.5} color="#f0f0ff" />
      <pointLight position={[15, 8, -8]} intensity={1.5} color="#f0f0ff" />
    </group>
  );
};

// Realistic Robots
const ProfessionalRobot = ({ position, progress }: { position: [number, number, number]; progress: number }) => {
  const robotRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (robotRef.current && progress > 0.8) {
      robotRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      robotRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  return (
    <group ref={robotRef} position={position} visible={progress > 0.8}>
      {/* Robot Base - Professional White */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 2.5]} />
        <meshStandardMaterial 
          color="#f8f8f8" 
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      
      {/* Robot Body - Sleek Design */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1, 1.2, 1.5]} />
        <meshStandardMaterial 
          color="#e0e0e0" 
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      
      {/* Robot Head - Minimalist */}
      <mesh position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.8]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.05}
          metalness={0.95}
        />
      </mesh>
      
      {/* Professional Camera Eyes */}
      <mesh position={[-0.3, 2.8, 0.7]}>
        <sphereGeometry args={[0.12]} />
        <meshStandardMaterial 
          color="#000080" 
          emissive="#0040ff"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0.3, 2.8, 0.7]}>
        <sphereGeometry args={[0.12]} />
        <meshStandardMaterial 
          color="#000080" 
          emissive="#0040ff"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Articulated Arms */}
      <mesh position={[-1.5, 1.5, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.15, 0.15, 2]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>
      <mesh position={[1.5, 1.5, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.15, 0.15, 2]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>
      
      {/* Status LED */}
      <mesh position={[0, 2, 0.8]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#00ff00" 
          emissive="#00ff00"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
};

// Main Scene with Smooth Transitions
const Scene = ({ progress }: { progress: number }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useFrame(() => {
    if (cameraRef.current) {
      // Smooth camera transitions
      if (progress < 0.2) {
        // Close-up motherboard inspection
        cameraRef.current.position.lerp(new THREE.Vector3(3, 4, 6), 0.015);
        cameraRef.current.lookAt(0, 0, 0);
      } else if (progress < 0.35) {
        // Pull back to see full motherboard
        cameraRef.current.position.lerp(new THREE.Vector3(0, 8, 12), 0.015);
        cameraRef.current.lookAt(0, 0, 0);
      } else if (progress < 0.6) {
        // Follow cables upward
        cameraRef.current.position.lerp(new THREE.Vector3(5, 12, 8), 0.015);
        cameraRef.current.lookAt(0, 8, 0);
      } else if (progress < 0.75) {
        // Approach data center
        cameraRef.current.position.lerp(new THREE.Vector3(0, 18, 5), 0.015);
        cameraRef.current.lookAt(0, 15, -8);
      } else {
        // Final overview with robots
        cameraRef.current.position.lerp(new THREE.Vector3(-10, 20, 10), 0.015);
        cameraRef.current.lookAt(0, 15, -5);
      }
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[3, 4, 6]} fov={60} />
      
      {/* Professional Lighting Setup */}
      <ambientLight intensity={0.4} color="#f0f0ff" />
      <directionalLight 
        position={[20, 20, 10]} 
        intensity={1.2} 
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 10, 5]} intensity={0.8} color="#4080ff" />
      <spotLight 
        position={[10, 15, 10]} 
        intensity={1} 
        angle={0.3} 
        penumbra={0.5}
        color="#ffffff"
      />
      
      <RealisticMotherboard progress={progress} />
      <ProfessionalCables progress={progress} />
      <HyperrealisticDataCenter progress={progress} />
      
      {/* Multiple Professional Robots */}
      <ProfessionalRobot progress={progress} position={[-8, 15, -6]} />
      <ProfessionalRobot progress={progress} position={[8, 15, -6]} />
      <ProfessionalRobot progress={progress} position={[0, 15, -12]} />
      
      {/* Subtle "AI Infrastructure" text at the end */}
      {progress > 0.9 && (
        <Text
          position={[0, 25, -8]}
          fontSize={1.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          AI Infrastructure
        </Text>
      )}
    </>
  );
};

export const TechJourney = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / (docHeight * 0.8), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      <Canvas 
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        camera={{ position: [3, 4, 6], fov: 60 }}
      >
        <Scene progress={scrollProgress} />
        <Environment preset="studio" />
      </Canvas>
      
      {/* Minimal Progress Indicator */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
