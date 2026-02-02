"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { GraphNode, Post } from "@/types";

interface PostAtomProps {
  node: GraphNode;
  isHighlighted?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export default function PostAtom({
  node,
  isHighlighted = false,
  onClick,
  onHover,
}: PostAtomProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = new THREE.Color(node.color);
  const size = isHighlighted || hovered ? 0.6 : 0.4;

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y =
        node.y + Math.sin(state.clock.elapsedTime + node.x * 0.1) * 0.1;

      // Glow when highlighted
      if (isHighlighted || hovered) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(false);
    document.body.style.cursor = "default";
  };

  return (
    <group position={[node.x, node.y, node.z]}>
      {/* Glow ring when highlighted */}
      {(isHighlighted || hovered) && (
        <Sphere args={[size * 1.5, 16, 16]}>
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </Sphere>
      )}

      {/* Main atom */}
      <Sphere
        ref={meshRef}
        args={[size, 16, 16]}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHighlighted || hovered ? 0.6 : 0.3}
          roughness={0.4}
          metalness={0.6}
        />
      </Sphere>
    </group>
  );
}
