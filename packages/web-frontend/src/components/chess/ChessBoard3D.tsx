import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ChessPiece3D } from './ChessPiece3D';
import * as THREE from 'three';

interface ChessBoard3DProps {
  theme?: string;
  scrollY?: number;
}

interface ChessPiece {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  position: [number, number, number];
  hasMoved?: boolean;
}

interface ChessGame {
  pieces: ChessPiece[];
  selectedPiece: ChessPiece | null;
  currentTurn: 'white' | 'black';
  gameOver: boolean;
  winner: 'white' | 'black' | null;
}

const initialPieces: ChessPiece[] = [
  // White pieces
  { type: 'rook', color: 'white', position: [-3.5, 0.2, -3.5] },
  { type: 'knight', color: 'white', position: [-2.5, 0.2, -3.5] },
  { type: 'bishop', color: 'white', position: [-1.5, 0.2, -3.5] },
  { type: 'queen', color: 'white', position: [-0.5, 0.2, -3.5] },
  { type: 'king', color: 'white', position: [0.5, 0.2, -3.5] },
  { type: 'bishop', color: 'white', position: [1.5, 0.2, -3.5] },
  { type: 'knight', color: 'white', position: [2.5, 0.2, -3.5] },
  { type: 'rook', color: 'white', position: [3.5, 0.2, -3.5] },
  // White pawns
  { type: 'pawn', color: 'white', position: [-3.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [-2.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [-1.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [-0.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [0.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [1.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [2.5, 0.2, -2.5] },
  { type: 'pawn', color: 'white', position: [3.5, 0.2, -2.5] },

  // Black pieces
  { type: 'rook', color: 'black', position: [-3.5, 0.2, 3.5] },
  { type: 'knight', color: 'black', position: [-2.5, 0.2, 3.5] },
  { type: 'bishop', color: 'black', position: [-1.5, 0.2, 3.5] },
  { type: 'queen', color: 'black', position: [-0.5, 0.2, 3.5] },
  { type: 'king', color: 'black', position: [0.5, 0.2, 3.5] },
  { type: 'bishop', color: 'black', position: [1.5, 0.2, 3.5] },
  { type: 'knight', color: 'black', position: [2.5, 0.2, 3.5] },
  { type: 'rook', color: 'black', position: [3.5, 0.2, 3.5] },
  // Black pawns
  { type: 'pawn', color: 'black', position: [-3.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [-2.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [-1.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [-0.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [0.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [1.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [2.5, 0.2, 2.5] },
  { type: 'pawn', color: 'black', position: [3.5, 0.2, 2.5] },
];

const SimpleChessBoard = ({ theme = 'vibrant', scrollY = 0, onGameStateChange }: ChessBoard3DProps & { onGameStateChange?: (gameState: ChessGame) => void }) => {
  const boardRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [gameState, setGameState] = useState<ChessGame>({
    pieces: initialPieces,
    selectedPiece: null,
    currentTurn: 'white',
    gameOver: false,
    winner: null
  });

  const themeColors = {
    vibrant: { 
      light: '#F3E8FF', 
      dark: '#7C3AED'
    },
    sunset: { 
      light: '#FEF3C7', 
      dark: '#F59E0B'
    },
    ocean: { 
      light: '#DBEAFE', 
      dark: '#0EA5E9'
    },
    forest: { 
      light: '#D1FAE5', 
      dark: '#10B981'
    }
  };

  const currentTheme = themeColors[theme as keyof typeof themeColors] || themeColors.vibrant;

  // Traditional chess board colors
  const boardColors = {
    light: '#F0D9B5',  // Light wood color
    dark: '#B58863'    // Dark wood color
  };

  useFrame((state) => {
    if (boardRef.current) {
      // Gentle rotation based on scroll
      boardRef.current.rotation.y = scrollY * 0.001;
    }
  });

  const getSquarePosition = (row: number, col: number): [number, number, number] => {
    return [col - 3.5, 0, row - 3.5];
  };

  const getPieceAtPosition = (position: [number, number, number]): ChessPiece | null => {
    return gameState.pieces.find(piece => 
      piece.position[0] === position[0] && 
      piece.position[2] === position[2]
    ) || null;
  };

  const isValidMove = (piece: ChessPiece, targetPosition: [number, number, number]): boolean => {
    const targetPiece = getPieceAtPosition(targetPosition);
    
    // Can't capture own piece
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    const [fromX, fromY, fromZ] = piece.position;
    const [toX, toY, toZ] = targetPosition;
    const deltaX = Math.abs(toX - fromX);
    const deltaZ = Math.abs(toZ - fromZ);

    switch (piece.type) {
      case 'pawn':
        const direction = piece.color === 'white' ? 1 : -1;
        const startRow = piece.color === 'white' ? -2.5 : 2.5;
        
        // Forward move
        if (deltaX === 0 && toZ === fromZ + direction) {
          return !targetPiece;
        }
        
        // Initial two-square move
        if (deltaX === 0 && fromZ === startRow && toZ === fromZ + 2 * direction) {
          const middlePos: [number, number, number] = [fromX, fromY, fromZ + direction];
          return !targetPiece && !getPieceAtPosition(middlePos);
        }
        
        // Diagonal capture
        if (deltaX === 1 && toZ === fromZ + direction) {
          return !!targetPiece;
        }
        return false;

      case 'rook':
        return (deltaX === 0 || deltaZ === 0) && !isPathBlocked(piece.position, targetPosition);

      case 'bishop':
        return deltaX === deltaZ && !isPathBlocked(piece.position, targetPosition);

      case 'queen':
        return (deltaX === 0 || deltaZ === 0 || deltaX === deltaZ) && !isPathBlocked(piece.position, targetPosition);

      case 'king':
        return deltaX <= 1 && deltaZ <= 1;

      case 'knight':
        return (deltaX === 2 && deltaZ === 1) || (deltaX === 1 && deltaZ === 2);

      default:
        return false;
    }
  };

  const isPathBlocked = (from: [number, number, number], to: [number, number, number]): boolean => {
    const [fromX, fromY, fromZ] = from;
    const [toX, toY, toZ] = to;
    
    const deltaX = toX - fromX;
    const deltaZ = toZ - fromZ;
    const steps = Math.max(Math.abs(deltaX), Math.abs(deltaZ));
    
    for (let i = 1; i < steps; i++) {
      const checkX = fromX + (deltaX / steps) * i;
      const checkZ = fromZ + (deltaZ / steps) * i;
      const checkPosition: [number, number, number] = [checkX, fromY, checkZ];
      
      if (getPieceAtPosition(checkPosition)) {
        return true;
      }
    }
    return false;
  };

  const handleSquareClick = (position: [number, number, number]) => {
    if (gameState.gameOver) return;

    const pieceAtPosition = getPieceAtPosition(position);

    if (gameState.selectedPiece) {
      // Moving a piece
      if (isValidMove(gameState.selectedPiece, position)) {
        const newPieces = gameState.pieces.map(p => {
          if (p === gameState.selectedPiece) {
            return { ...p, position, hasMoved: true };
          }
          // Remove captured piece
          if (p.position[0] === position[0] && p.position[2] === position[2]) {
            return null;
          }
          return p;
        }).filter(Boolean) as ChessPiece[];

        setGameState(prev => ({
          ...prev,
          pieces: newPieces,
          selectedPiece: null,
          currentTurn: prev.currentTurn === 'white' ? 'black' : 'white'
        }));
      } else {
        // Invalid move, deselect
        setGameState(prev => ({ ...prev, selectedPiece: null }));
      }
    } else if (pieceAtPosition && pieceAtPosition.color === gameState.currentTurn) {
      // Selecting a piece
      setGameState(prev => ({ ...prev, selectedPiece: pieceAtPosition }));
    }
  };

  const handleCanvasClick = (event: any) => {
    event.preventDefault();
    
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, camera);
    
    if (boardRef.current) {
      const intersects = raycaster.intersectObjects(boardRef.current.children, true);
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const position = clickedObject.position.toArray() as [number, number, number];
        handleSquareClick(position);
      }
    }
  };

  // Add click handler to the canvas
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('click', handleCanvasClick);
    return () => canvas.removeEventListener('click', handleCanvasClick);
  }, [gameState, camera, gl]);

  // Notify parent component of game state changes
  useEffect(() => {
    onGameStateChange?.(gameState);
  }, [gameState, onGameStateChange]);

  return (
    <group ref={boardRef} position={[0, 0, 0]}>
      {/* Chess board squares */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const isLight = (row + col) % 2 === 0;
          // Use vibrant theme colors
          const color = isLight ? currentTheme.primary : currentTheme.secondary;
          const position: [number, number, number] = getSquarePosition(row, col);
          const pieceAtPosition = getPieceAtPosition(position);
          const isSelected = gameState.selectedPiece === pieceAtPosition;
          // Only show valid move highlight if a piece is selected
          const isValidMoveSquare = !!gameState.selectedPiece && isValidMove(gameState.selectedPiece, position);
          let squareColor = color;
          if (isSelected) squareColor = '#4ADE80';
          else if (isValidMoveSquare) squareColor = '#90EE90';
          // If no piece is selected, do not show any highlight
          if (!gameState.selectedPiece) squareColor = color;
          return (
            <mesh 
              key={`${row}-${col}`}
              position={position}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[1, 0.1, 1]} />
              <meshStandardMaterial 
                color={squareColor}
                roughness={0.7}
                metalness={0.2}
              />
            </mesh>
          );
        })
      )}

      {/* Chess pieces */}
      {gameState.pieces.map((piece, index) => (
        <ChessPiece3D
          key={`${piece.type}-${piece.color}-${index}`}
          type={piece.type}
          color={piece.color}
          position={piece.position}
          theme={theme}
        />
      ))}

      {/* Board border for premium look */}
      <mesh position={[0, -0.11, 0]}>
        <boxGeometry args={[8.9, 0.18, 8.9]} />
        <meshStandardMaterial color={currentTheme.accent} metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
};

export const ChessBoard3D = ({ theme = 'vibrant', scrollY = 0 }: ChessBoard3DProps) => {
  const [gameState, setGameState] = useState<ChessGame>({
    pieces: initialPieces,
    selectedPiece: null,
    currentTurn: 'white',
    gameOver: false,
    winner: null
  });

  return (
    <div className="w-full h-96 relative">
      <Canvas
        shadows
        camera={{ position: [0, 8, 8], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Chess board */}
        <SimpleChessBoard 
          theme={theme} 
          scrollY={scrollY} 
          onGameStateChange={setGameState}
        />

        {/* Camera controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
      
      {/* Game status overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
        <div className="bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
          <p className="text-sm font-medium">
            Current Turn: <span className="capitalize">{gameState.currentTurn}</span>
          </p>
        </div>
      </div>
      
      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Click pieces to select • Click squares to move
        </p>
      </div>
    </div>
  );
}; 