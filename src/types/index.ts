export interface Post {
  id: string;
  externalId?: string;
  content: string;
  title?: string;
  author?: string;
  authorId?: string;
  url?: string;
  createdAt: string;
  posX?: number;
  posY?: number;
  posZ?: number;
  topics?: TopicRef[];
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  color: string;
  posX?: number;
  posY?: number;
  posZ?: number;
  postCount: number;
}

export interface TopicRef {
  id: string;
  name: string;
  color: string;
  relevance: number;
}

export interface TopicWithPosts extends Topic {
  posts: Post[];
}

export interface GraphNode {
  id: string;
  type: "topic" | "post";
  label: string;
  color: string;
  size: number;
  x: number;
  y: number;
  z: number;
  data: Topic | Post;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface SearchResult {
  id: string;
  type: "topic" | "post";
  label: string;
  content?: string;
  similarity: number;
}

// Moltbook API types (adjust based on actual API)
export interface MoltbookPost {
  id: string;
  content: string;
  title?: string;
  author?: {
    id: string;
    name: string;
  };
  url?: string;
  created_at: string;
}

export interface MoltbookAPIResponse {
  posts: MoltbookPost[];
  next_cursor?: string;
  has_more: boolean;
}
