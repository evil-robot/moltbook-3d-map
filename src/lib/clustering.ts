import { GraphData, GraphNode, GraphLink, Topic, Post } from "@/types";

// Color palette for topics
const TOPIC_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6366f1", // indigo
  "#06b6d4", // cyan
];

export function getTopicColor(index: number): string {
  return TOPIC_COLORS[index % TOPIC_COLORS.length];
}

// Convert topics and posts to graph data for 3D visualization
export function buildGraphData(
  topics: Topic[],
  posts: Post[],
  mode: "topics" | "posts" | "all" = "topics"
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  if (mode === "topics" || mode === "all") {
    // Add topic nodes
    topics.forEach((topic) => {
      nodes.push({
        id: topic.id,
        type: "topic",
        label: topic.name,
        color: topic.color,
        size: Math.max(1, Math.log(topic.postCount + 1) * 2), // Scale by post count
        x: topic.posX ?? (Math.random() - 0.5) * 100,
        y: topic.posY ?? (Math.random() - 0.5) * 100,
        z: topic.posZ ?? (Math.random() - 0.5) * 100,
        data: topic,
      });
    });
  }

  if (mode === "posts" || mode === "all") {
    // Add post nodes
    posts.forEach((post) => {
      const primaryTopic = post.topics?.[0];
      nodes.push({
        id: post.id,
        type: "post",
        label: post.title || post.content.slice(0, 50) + "...",
        color: primaryTopic?.color || "#94a3b8",
        size: 0.5,
        x: post.posX ?? (Math.random() - 0.5) * 50,
        y: post.posY ?? (Math.random() - 0.5) * 50,
        z: post.posZ ?? (Math.random() - 0.5) * 50,
        data: post,
      });

      // Link posts to their topics
      if (mode === "all" && post.topics) {
        post.topics.forEach((topic) => {
          links.push({
            source: post.id,
            target: topic.id,
            strength: topic.relevance,
          });
        });
      }
    });
  }

  return { nodes, links };
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple k-means clustering for embeddings
export function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations: number = 100
): { clusters: number[]; centroids: number[][] } {
  const n = embeddings.length;
  const dim = embeddings[0]?.length || 0;

  if (n === 0 || dim === 0) {
    return { clusters: [], centroids: [] };
  }

  // Initialize centroids randomly
  let centroids: number[][] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < Math.min(k, n); i++) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * n);
    } while (usedIndices.has(idx));
    usedIndices.add(idx);
    centroids.push([...embeddings[idx]]);
  }

  let clusters = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newClusters = embeddings.map((emb) => {
      let minDist = Infinity;
      let nearest = 0;
      centroids.forEach((cent, i) => {
        const sim = cosineSimilarity(emb, cent);
        const dist = 1 - sim;
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      });
      return nearest;
    });

    // Check convergence
    const changed = newClusters.some((c, i) => c !== clusters[i]);
    clusters = newClusters;

    if (!changed) break;

    // Update centroids
    centroids = centroids.map((_, ci) => {
      const clusterPoints = embeddings.filter((_, i) => clusters[i] === ci);
      if (clusterPoints.length === 0) return centroids[ci];

      const newCentroid = new Array(dim).fill(0);
      clusterPoints.forEach((point) => {
        point.forEach((val, i) => {
          newCentroid[i] += val;
        });
      });
      return newCentroid.map((val) => val / clusterPoints.length);
    });
  }

  return { clusters, centroids };
}

// Reduce embeddings to 3D for visualization using PCA-like approach
export function embedTo3D(embeddings: number[][]): { x: number; y: number; z: number }[] {
  if (embeddings.length === 0) return [];

  const dim = embeddings[0].length;

  // Use random projection for simplicity (proper PCA would be better but more complex)
  const projection = [
    Array.from({ length: dim }, () => (Math.random() - 0.5) * 2),
    Array.from({ length: dim }, () => (Math.random() - 0.5) * 2),
    Array.from({ length: dim }, () => (Math.random() - 0.5) * 2),
  ];

  return embeddings.map((emb) => {
    const x = emb.reduce((sum, val, i) => sum + val * projection[0][i], 0);
    const y = emb.reduce((sum, val, i) => sum + val * projection[1][i], 0);
    const z = emb.reduce((sum, val, i) => sum + val * projection[2][i], 0);

    // Normalize to reasonable range
    return {
      x: x * 50,
      y: y * 50,
      z: z * 50,
    };
  });
}
