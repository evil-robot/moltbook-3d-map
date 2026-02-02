import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topicId = searchParams.get("topicId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause = topicId
      ? {
          topics: {
            some: {
              topicId: topicId,
            },
          },
        }
      : {};

    const posts = await prisma.post.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        topics: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        externalId: p.externalId,
        content: p.content,
        title: p.title,
        author: p.author,
        authorId: p.authorId,
        url: p.url,
        createdAt: p.createdAt.toISOString(),
        posX: p.posX,
        posY: p.posY,
        posZ: p.posZ,
        topics: p.topics.map((pt) => ({
          id: pt.topic.id,
          name: pt.topic.name,
          color: pt.topic.color,
          relevance: pt.relevance,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
