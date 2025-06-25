import { Canvas } from '@react-three/fiber';

export const TestChess = () => (
  <div style={{ width: '100%', height: 400 }}>
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  </div>
); 