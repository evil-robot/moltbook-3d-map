"use client";

import { useState, useEffect } from "react";
import { SearchResult, Topic } from "@/types";

interface SearchOverlayProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onResultClick: (result: SearchResult) => void;
  onTopicClick: (topicId: string) => void;
  onClear: () => void;
  hotTopics: Topic[];
}

export default function SearchOverlay({
  onSearch,
  onResultClick,
  onTopicClick,
  onClear,
  hotTopics,
}: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await onSearch(query);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onClear();
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    setIsOpen(false);
    setQuery("");
  };

  const handleTopicClick = (topic: Topic) => {
    onTopicClick(topic.id);
    setIsOpen(false);
  };

  const showHotTopics = isOpen && !query.trim() && hotTopics.length > 0;
  const showResults = isOpen && results.length > 0;
  const showNoResults = isOpen && query && !isSearching && results.length === 0;

  return (
    <div className="absolute top-4 left-4 z-50 w-96">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search topics and posts..."
          className="w-full bg-gray-900/90 backdrop-blur-sm text-white placeholder-gray-400 px-4 py-3 pr-10 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <svg
              className="w-5 h-5 text-gray-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Hot topics (when no search query) */}
      {showHotTopics && (
        <div className="mt-2 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>🔥</span> Hot Topics
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {hotTopics.slice(0, 10).map((topic, index) => (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic)}
                className="w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors border-b border-gray-800 last:border-0 flex items-center gap-3"
              >
                <span className="text-lg font-bold text-gray-600 w-6">
                  {index + 1}
                </span>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: topic.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {topic.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {topic.postCount} posts
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-800 bg-gray-800/30">
            <p className="text-xs text-gray-500 text-center">
              Click a topic or type to search
            </p>
          </div>
        </div>
      )}

      {/* Search results */}
      {showResults && (
        <div className="mt-2 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors border-b border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    result.type === "topic"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {result.type}
                </span>
                <span className="text-white font-medium truncate">
                  {result.label}
                </span>
              </div>
              {result.content && (
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                  {result.content}
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">
                  {Math.round(result.similarity * 100)}% match
                </div>
                <div className="text-xs text-blue-400 flex items-center gap-1">
                  Go to location
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showNoResults && (
        <div className="mt-2 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 px-4 py-6 text-center">
          <p className="text-gray-400">No results found for &quot;{query}&quot;</p>
          <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
