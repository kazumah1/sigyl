import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface PieceProps {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  position: [number, number, number];
}

interface SquareProps {
  isLight: boolean;
  isHighlighted: boolean;
  position: [number, number, number];
}

const ChessBoard3D = () => {
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const squaresRef = useRef<THREE.Mesh[][]>([]);

  useEffect(() => {
    if (!boardRef.current) return;

    const handleResize = () => {
      if (!cameraRef.current || !boardRef.current) return;
      cameraRef.current.aspect = boardRef.current.clientWidth / boardRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!boardRef.current) return;

    // Fix Vector2 constructor issue
    const rect = boardRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.current.intersectObjects(sceneRef.current?.children || []);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;

      if (intersectedObject.name.startsWith('square')) {
        const [_, rowStr, colStr] = intersectedObject.name.split('-');
        const row = parseInt(rowStr);
        const col = parseInt(colStr);
        highlightSquare(row, col);
      } else {
        clearHighlight();
      }
    } else {
      clearHighlight();
    }
  }, []);

  useEffect(() => {
    if (!boardRef.current) return;

    boardRef.current.addEventListener('mousemove', handleMouseMove);

    return () => {
      boardRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  const highlightSquare = (row: number, col: number) => {
    setSelectedSquare([row, col]);
  };

  const clearHighlight = () => {
    setSelectedSquare(null);
  };

  const themeColors = {
    light: "#f0d9b5",
    dark: "#b58863"
  };

  const Square = ({ isLight, isHighlighted, position }: SquareProps) => {
    const material = getSquareMaterial(isLight, isHighlighted);
    const squareRef = useRef<THREE.Mesh>(null);

    return (
      <mesh position={position} material={material} ref={squareRef}>
        <boxGeometry args={[1, 0.1, 1]} />
      </mesh>
    );
  };

  const getSquareMaterial = (isLight: boolean, isHighlighted: boolean) => {
    const baseColor = isLight ? themeColors.light : themeColors.dark;
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: isHighlighted ? "#ffff00" : "#000000",
      emissiveIntensity: isHighlighted ? 0.3 : 0,
      roughness: 0.8,
      metalness: 0.1,
    });
  };

  const Piece = ({ type, color, position }: PieceProps) => {
    const pieceRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
      if (pieceRef.current) {
        // Placeholder for loading 3D models
        // pieceRef.current.geometry = new THREE.SphereGeometry(0.5, 32, 32);
        pieceRef.current.material = new THREE.MeshStandardMaterial({ color: color === 'white' ? 'white' : 'black' });
      }
    }, [color, type]);

    return (
      <mesh position={position} ref={pieceRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
      </mesh>
    );
  };

  const Board = () => {
    useEffect(() => {
      squaresRef.current = Array(8).fill(null).map(() => Array(8).fill(null));
    }, []);

    return (
      <>
        {Array(8).fill(null).map((_, row) =>
          Array(8).fill(null).map((_, col) => {
            const isLight = (row + col) % 2 === 0;
            const isHighlighted = selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col;
            const position: [number, number, number] = [col - 3.5, 0, row - 3.5];

            return (
              <mesh
                key={`${row}-${col}`}
                position={position}
                receiveShadow
                name={`square-${row}-${col}`}
                ref={(el) => {
                  if (el) {
                    if (!squaresRef.current[row]) {
                      squaresRef.current[row] = [];
                    }
                    squaresRef.current[row][col] = el;
                  }
                }}
              >
                <boxGeometry args={[1, 0.1, 1]} />
                <meshStandardMaterial color={isLight ? themeColors.light : themeColors.dark} emissive={isHighlighted ? "#ffff00" : "#000000"} emissiveIntensity={isHighlighted ? 0.3 : 0} roughness={0.8} metalness={0.1} />
              </mesh>
            );
          })
        )}
      </>
    );
  };

  return (
    <div ref={boardRef} style={{ width: '100%', height: '100vh' }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 5, 10] }}
        style={{ width: '100%', height: '100%' }}
      >
        <PerspectiveCamera makeDefault position={[0, 5, 10]} ref={cameraRef} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} castShadow />
        <OrbitControls />
        <Board />
      </Canvas>
    </div>
  );
};

export default ChessBoard3D;
