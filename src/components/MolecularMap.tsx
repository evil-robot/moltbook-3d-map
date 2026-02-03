"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect } from "react";
import { GraphData, GraphNode, Topic, Post } from "@/types";
import TopicCluster from "./TopicCluster";
import PostAtom from "./PostAtom";
import * as THREE from "three";

interface MolecularMapProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  highlightedIds?: string[];
  selectedTopicId?: string;
  focusTarget?: { x: number; y: number; z: number } | null;
}

// Camera controller component
function CameraController({
  focusTarget,
}: {
  focusTarget?: { x: number; y: number; z: number } | null;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);

  useEffect(() => {
    if (focusTarget) {
      targetRef.current.set(focusTarget.x, focusTarget.y, focusTarget.z);
      isAnimating.current = true;
    }
  }, [focusTarget]);

  useFrame(() => {
    if (isAnimating.current && focusTarget) {
      // Calculate target camera position (offset from focus point)
      const targetPos = new THREE.Vector3(
        focusTarget.x,
        focusTarget.y + 10,
        focusTarget.z + 40
      );

      // Smoothly interpolate camera position
      camera.position.lerp(targetPos, 0.05);

      // Check if we're close enough to stop animating
      if (camera.position.distanceTo(targetPos) < 0.5) {
        isAnimating.current = false;
      }
    }
  });

  return null;
}

function Scene({
  data,
  onNodeClick,
  highlightedIds = [],
  selectedTopicId,
  focusTarget,
}: MolecularMapProps) {
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const controlsRef = useRef<any>(null);

  const topicNodes = data.nodes.filter((n) => n.type === "topic");
  const postNodes = data.nodes.filter((n) => n.type === "post");

  // Filter posts if a topic is selected
  const visiblePosts = selectedTopicId
    ? postNodes.filter((n) => {
        const post = n.data as Post;
        return post.topics?.some((t) => t.id === selectedTopicId);
      })
    : [];

  // Update orbit controls target when focus changes
  useEffect(() => {
    if (focusTarget && controlsRef.current) {
      controlsRef.current.target.lerp(
        new THREE.Vector3(focusTarget.x, focusTarget.y, focusTarget.z),
        0.1
      );
    }
  }, [focusTarget]);

  return (
    <>
      {/* Camera controller for smooth navigation */}
      <CameraController focusTarget={focusTarget} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Background stars */}
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Topic clusters */}
      {topicNodes.map((node) => (
        <TopicCluster
          key={node.id}
          node={node}
          isHighlighted={highlightedIds.includes(node.id)}
          isSelected={selectedTopicId === node.id}
          onClick={() => onNodeClick?.(node)}
          onHover={(hovered) => setHoveredNode(hovered ? node : null)}
        />
      ))}

      {/* Post atoms (only shown when a topic is selected) */}
      {visiblePosts.map((node) => (
        <PostAtom
          key={node.id}
          node={node}
          isHighlighted={highlightedIds.includes(node.id)}
          onClick={() => onNodeClick?.(node)}
          onHover={(hovered) => setHoveredNode(hovered ? node : null)}
        />
      ))}

      {/* Connection lines for posts to their topic */}
      {selectedTopicId && visiblePosts.length > 0 && (
        <ConnectionLines
          posts={visiblePosts}
          topicNode={topicNodes.find((n) => n.id === selectedTopicId)!}
        />
      )}

      {/* Hover tooltip */}
      {hoveredNode && (
        <Html position={[hoveredNode.x, hoveredNode.y + hoveredNode.size + 1, hoveredNode.z]}>
          <div className="bg-gray-900/90 text-white px-3 py-2 rounded-lg text-sm max-w-xs pointer-events-none">
            <div className="font-medium">{hoveredNode.label}</div>
            {hoveredNode.type === "topic" && (
              <div className="text-gray-400 text-xs mt-1">
                {(hoveredNode.data as Topic).postCount} posts
              </div>
            )}
          </div>
        </Html>
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={300}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </>
  );
}

function ConnectionLines({
  posts,
  topicNode,
}: {
  posts: GraphNode[];
  topicNode: GraphNode;
}) {
  if (!topicNode) return null;

  const positions = new Float32Array(
    posts.flatMap((post) => [
      topicNode.x, topicNode.y, topicNode.z,
      post.x, post.y, post.z,
    ])
  );

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#4b5563" opacity={0.3} transparent />
    </lineSegments>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="text-white text-lg">Loading 3D Map...</div>
    </Html>
  );
}

export default function MolecularMap({
  data,
  onNodeClick,
  highlightedIds = [],
  selectedTopicId,
  focusTarget,
}: MolecularMapProps) {
  return (
    <div className="w-full h-full bg-gray-950">
      <Canvas
        camera={{ position: [0, 0, 100], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            data={data}
            onNodeClick={onNodeClick}
            highlightedIds={highlightedIds}
            selectedTopicId={selectedTopicId}
            focusTarget={focusTarget}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
