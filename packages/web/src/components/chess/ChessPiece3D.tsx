import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ChessPiece3DProps {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  position: [number, number, number];
  theme?: string;
}

const pieceModelMap: Record<string, string> = {
  king_white: '/models/chess/king_white.glb',
  queen_white: '/models/chess/queen_white.glb',
  rook_white: '/models/chess/rook_white.glb',
  bishop_white: '/models/chess/bishop_white.glb',
  knight_white: '/models/chess/knight_white.glb',
  pawn_white: '/models/chess/pawn_white.glb',
  king_black: '/models/chess/king_black.glb',
  queen_black: '/models/chess/queen_black.glb',
  rook_black: '/models/chess/rook_black.glb',
  bishop_black: '/models/chess/bishop_black.glb',
  knight_black: '/models/chess/knight_black.glb',
  pawn_black: '/models/chess/pawn_black.glb',
};

function PieceGLTF({ type, color }: { type: string; color: string }) {
  const modelPath = pieceModelMap[`${type}_${color}`];
  try {
    // Try to load the model
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene} scale={0.5} />;
  } catch {
    // Fallback: simple geometry
    return (
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.4, 16]} />
        <meshStandardMaterial color={color === 'white' ? '#fff' : '#222'} />
      </mesh>
    );
  }
}

export const ChessPiece3D = ({ type, color, position }: ChessPiece3DProps) => {
  const pieceRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (pieceRef.current) {
      pieceRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0] + position[2]) * 0.05;
      pieceRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + position[0] + position[2]) * 0.1;
    }
  });

  return (
    <group ref={pieceRef} position={position}>
      <Suspense fallback={null}>
        <PieceGLTF type={type} color={color} />
      </Suspense>
    </group>
  );
}; 