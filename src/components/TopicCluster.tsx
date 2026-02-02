"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Text } from "@react-three/drei";
import * as THREE from "three";
import { GraphNode, Topic } from "@/types";

interface TopicClusterProps {
  node: GraphNode;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export default function TopicCluster({
  node,
  isHighlighted = false,
  isSelected = false,
  onClick,
  onHover,
}: TopicClusterProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const topic = node.data as Topic;
  const baseSize = node.size;
  const color = new THREE.Color(node.color);

  // Animate the sphere
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y =
        node.y + Math.sin(state.clock.elapsedTime * 0.5 + node.x) * 0.3;

      // Pulse when highlighted or hovered
      if (isHighlighted || hovered || isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }

    // Animate glow
    if (glowRef.current) {
      const glowScale = (isHighlighted || hovered || isSelected) ? 1.5 : 1.2;
      glowRef.current.scale.setScalar(glowScale + Math.sin(state.clock.elapsedTime * 2) * 0.1);
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
      {/* Glow effect */}
      <Sphere ref={glowRef} args={[baseSize * 1.2, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlighted || hovered || isSelected ? 0.3 : 0.15}
        />
      </Sphere>

      {/* Main sphere */}
      <Sphere
        ref={meshRef}
        args={[baseSize, 32, 32]}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHighlighted || hovered || isSelected ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </Sphere>

      {/* Orbiting particles for visual effect */}
      {Array.from({ length: Math.min(topic.postCount, 8) }).map((_, i) => (
        <OrbitingParticle
          key={i}
          radius={baseSize * 1.5}
          color={color}
          index={i}
          total={Math.min(topic.postCount, 8)}
        />
      ))}

      {/* Label */}
      <Text
        position={[0, baseSize + 1.5, 0]}
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {node.label}
      </Text>

      {/* Post count badge */}
      <Text
        position={[0, -baseSize - 0.8, 0]}
        fontSize={0.6}
        color="#9ca3af"
        anchorX="center"
        anchorY="top"
      >
        {topic.postCount} posts
      </Text>
    </group>
  );
}

function OrbitingParticle({
  radius,
  color,
  index,
  total,
}: {
  radius: number;
  color: THREE.Color;
  index: number;
  total: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const angle = (index / total) * Math.PI * 2;
  const speed = 0.3 + Math.random() * 0.2;
  const tilt = Math.random() * 0.5;

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * speed + angle;
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.y = Math.sin(t * 0.7) * radius * tilt;
      ref.current.position.z = Math.sin(t) * radius;
    }
  });

  return (
    <Sphere ref={ref} args={[0.15, 8, 8]}>
      <meshBasicMaterial color={color} />
    </Sphere>
  );
}
