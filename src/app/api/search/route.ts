import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateEmbedding } from "@/lib/openai";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Search topics using vector similarity
    const topicResults = await prisma.$queryRaw<
      Array<{ id: string; name: string; description: string | null; similarity: number }>
    >`
      SELECT id, name, description,
             1 - (centroid_embedding <=> ${embeddingStr}::vector) as similarity
      FROM topics
      WHERE centroid_embedding IS NOT NULL
      ORDER BY centroid_embedding <=> ${embeddingStr}::vector
      LIMIT ${Math.floor(limit / 2)}
    `;

    // Search posts using vector similarity
    const postResults = await prisma.$queryRaw<
      Array<{ id: string; content: string; title: string | null; similarity: number }>
    >`
      SELECT id, content, title,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM posts
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${Math.floor(limit / 2)}
    `;

    // Combine and format results
    const results = [
      ...topicResults.map((t) => ({
        id: t.id,
        type: "topic" as const,
        label: t.name,
        content: t.description || undefined,
        similarity: t.similarity,
      })),
      ...postResults.map((p) => ({
        id: p.id,
        type: "post" as const,
        label: p.title || p.content.slice(0, 50) + "...",
        content: p.content,
        similarity: p.similarity,
      })),
    ]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
