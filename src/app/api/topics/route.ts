import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const [topics, totalPosts] = await Promise.all([
      prisma.topic.findMany({
        orderBy: { postCount: "desc" },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      prisma.post.count(),
    ]);

    return NextResponse.json({
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        posX: t.posX,
        posY: t.posY,
        posZ: t.posZ,
        postCount: t.postCount,
      })),
      totalTopics: topics.length,
      totalPosts: totalPosts,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
