"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Topic, Post, GraphData, GraphNode, SearchResult } from "@/types";
import { buildGraphData } from "@/lib/clustering";
import SearchOverlay from "@/components/SearchOverlay";
import PostDetail from "@/components/PostDetail";

// Dynamic import for 3D component (no SSR)
const MolecularMap = dynamic(() => import("@/components/MolecularMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-950 flex items-center justify-center">
      <div className="text-white text-lg">Loading 3D visualization...</div>
    </div>
  ),
});

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [focusTarget, setFocusTarget] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCounts, setTotalCounts] = useState({ topics: 0, posts: 0 });

  // Hot topics sorted by post count
  const hotTopics = [...topics].sort((a, b) => b.postCount - a.postCount);

  // Fetch data function
  const fetchData = useCallback(async (initial = false) => {
    try {
      const [topicsRes, postsRes] = await Promise.all([
        fetch("/api/topics"),
        fetch("/api/posts"),
      ]);

      if (!topicsRes.ok || !postsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const topicsData = await topicsRes.json();
      const postsData = await postsRes.json();

      setTopics(topicsData.topics || []);
      setPosts(postsData.posts || []);
      setTotalCounts({
        topics: topicsData.totalTopics || topicsData.topics?.length || 0,
        posts: topicsData.totalPosts || 0,
      });

      // Only rebuild graph on initial load or if not viewing a specific topic
      if (initial || !selectedTopicId) {
        const graph = buildGraphData(
          topicsData.topics || [],
          postsData.posts || [],
          "topics"
        );
        setGraphData(graph);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      if (initial) {
        setError("Failed to load data. Make sure the database is set up.");
      }
    } finally {
      if (initial) {
        setIsLoading(false);
      }
    }
  }, [selectedTopicId]);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, []);

  // Auto-refresh counts every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setHighlightedIds([node.id]);
    setFocusTarget({ x: node.x, y: node.y, z: node.z });

    if (node.type === "topic") {
      // Toggle topic selection
      setSelectedTopicId((prev) => (prev === node.id ? null : node.id));

      // Fetch posts for this topic if selecting
      if (selectedTopicId !== node.id) {
        fetch(`/api/posts?topicId=${node.id}`)
          .then((res) => res.json())
          .then((data) => {
            const topicPosts = data.posts || [];
            // Update graph to show this topic's posts
            const topicNode = topics.find((t) => t.id === node.id);
            if (topicNode) {
              const newGraph = buildGraphData([topicNode], topicPosts, "all");
              setGraphData(newGraph);
            }
          })
          .catch(console.error);
      } else {
        // Reset to topic view
        const graph = buildGraphData(topics, [], "topics");
        setGraphData(graph);
      }
    }
  }, [selectedTopicId, topics]);

  // Navigate to topic by ID (from search or hot topics)
  const navigateToTopic = useCallback((topicId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    if (topic) {
      // Find or create the node
      const node = graphData.nodes.find((n) => n.id === topicId);
      if (node) {
        handleNodeClick(node);
      } else {
        // Topic not in current graph, set focus and highlight
        setHighlightedIds([topicId]);
        setFocusTarget({
          x: topic.posX || 0,
          y: topic.posY || 0,
          z: topic.posZ || 0,
        });
        setSelectedTopicId(topicId);

        // Fetch posts for this topic
        fetch(`/api/posts?topicId=${topicId}`)
          .then((res) => res.json())
          .then((data) => {
            const topicPosts = data.posts || [];
            const newGraph = buildGraphData([topic], topicPosts, "all");
            setGraphData(newGraph);
          })
          .catch(console.error);
      }
    }
  }, [topics, graphData.nodes, handleNodeClick]);

  // Handle search
  const handleSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  }, []);

  // Handle search result click - navigate to location
  const handleSearchResultClick = useCallback((result: SearchResult) => {
    setHighlightedIds([result.id]);

    if (result.type === "topic") {
      navigateToTopic(result.id);
    } else {
      // For posts, find the post and navigate to it
      const node = graphData.nodes.find((n) => n.id === result.id);
      if (node) {
        setFocusTarget({ x: node.x, y: node.y, z: node.z });
        setSelectedNode(node);
      } else {
        // Post not in current view - fetch its topic and navigate there
        fetch(`/api/posts?limit=1`)
          .then((res) => res.json())
          .then((data) => {
            const post = data.posts?.find((p: Post) => p.id === result.id);
            if (post?.topics?.[0]) {
              navigateToTopic(post.topics[0].id);
            }
          })
          .catch(console.error);
      }
    }
  }, [graphData.nodes, navigateToTopic]);

  // Handle topic click from search overlay
  const handleSearchTopicClick = useCallback((topicId: string) => {
    navigateToTopic(topicId);
  }, [navigateToTopic]);

  // Clear search highlights
  const handleClearSearch = useCallback(() => {
    setHighlightedIds([]);
    setFocusTarget(null);
  }, []);

  // Handle topic click from detail panel
  const handleDetailTopicClick = useCallback((topicId: string) => {
    navigateToTopic(topicId);
  }, [navigateToTopic]);

  // Reset view
  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setSelectedTopicId(null);
    setHighlightedIds([]);
    setFocusTarget(null);
    const graph = buildGraphData(topics, [], "topics");
    setGraphData(graph);
  }, [topics]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white text-lg">Loading Moltbook Topics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
          <p className="text-gray-400 text-sm mb-6">
            This app needs a PostgreSQL database with pgvector extension. Check
            your DATABASE_URL environment variable and run Prisma migrations.
          </p>
          <a
            href="/api/ingest"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Check API Status
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen relative overflow-hidden">
      {/* 3D Visualization */}
      <MolecularMap
        data={graphData}
        onNodeClick={handleNodeClick}
        highlightedIds={highlightedIds}
        selectedTopicId={selectedTopicId || undefined}
        focusTarget={focusTarget}
      />

      {/* Search Overlay */}
      <SearchOverlay
        onSearch={handleSearch}
        onResultClick={handleSearchResultClick}
        onTopicClick={handleSearchTopicClick}
        onClear={handleClearSearch}
        hotTopics={hotTopics}
      />

      {/* Post/Topic Detail Panel */}
      <PostDetail
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onTopicClick={handleDetailTopicClick}
      />

      {/* Controls */}
      <div className="absolute bottom-4 left-4 z-50 flex gap-2">
        {selectedTopicId && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-lg backdrop-blur-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Topics
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="absolute bottom-10 right-4 z-50 flex items-center gap-2">
        <span className="text-gray-500 text-sm">
          {totalCounts.topics.toLocaleString()} topics · {totalCounts.posts.toLocaleString()} posts
        </span>
        <button
          onClick={() => fetchData(false)}
          className="text-gray-500 hover:text-white transition-colors p-1"
          title="Refresh data"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Copyright */}
      <div className="absolute bottom-2 left-0 right-0 z-50 text-center text-gray-600 text-xs">
        COPYRIGHT 2026 | ALL RIGHTS RESERVED | Jason Alan Snyder | Artists &amp; Robots | jas@artistsandrobots.com
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-40 bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-800">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
          Navigation
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          <div>🖱️ Click + drag to rotate</div>
          <div>🔍 Scroll to zoom</div>
          <div>⭕ Click topic to explore</div>
        </div>
      </div>
    </main>
  );
}
