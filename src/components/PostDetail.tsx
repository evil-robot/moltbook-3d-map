"use client";

import { Post, Topic, GraphNode } from "@/types";

interface PostDetailProps {
  node: GraphNode | null;
  onClose: () => void;
  onTopicClick?: (topicId: string) => void;
}

export default function PostDetail({ node, onClose, onTopicClick }: PostDetailProps) {
  if (!node) return null;

  const isPost = node.type === "post";
  const post = isPost ? (node.data as Post) : null;
  const topic = !isPost ? (node.data as Topic) : null;

  return (
    <div className="absolute right-4 top-4 bottom-4 w-96 z-50">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full`}
              style={{ backgroundColor: node.color }}
            />
            <span className="text-gray-400 text-sm">
              {isPost ? "Post" : "Topic"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isPost && post ? (
            <>
              {/* Post title */}
              {post.title && (
                <h2 className="text-white text-lg font-semibold mb-3">
                  {post.title}
                </h2>
              )}

              {/* Post content */}
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>

              {/* Author & date */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                {post.author && (
                  <div className="text-sm text-gray-400 mb-1">
                    By {post.author}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Topics */}
              {post.topics && post.topics.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Topics
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.topics.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onTopicClick?.(t.id)}
                        className="px-3 py-1 rounded-full text-sm transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: `${t.color}20`,
                          color: t.color,
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to original */}
              {post.url && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    View original post
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </>
          ) : topic ? (
            <>
              {/* Topic name */}
              <h2 className="text-white text-xl font-semibold mb-2">
                {topic.name}
              </h2>

              {/* Topic description */}
              {topic.description && (
                <p className="text-gray-300 leading-relaxed mb-4">
                  {topic.description}
                </p>
              )}

              {/* Stats */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">
                  {topic.postCount}
                </div>
                <div className="text-sm text-gray-400">
                  posts in this topic
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-blue-400 text-sm">
                  Click on this topic in the 3D view to see all related posts
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
