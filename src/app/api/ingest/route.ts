import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateEmbeddings, generateClusterLabel } from "@/lib/openai";
import { kMeansClustering, embedTo3D, getTopicColor } from "@/lib/clustering";

const BATCH_SIZE = 100; // Process embeddings in batches
const MOLTBOOK_PAGE_SIZE = 100; // Posts per API call
const MAX_OFFSET = 800; // Moltbook API fails above ~1000 offset
const REQUEST_DELAY = 500; // ms between API calls
const MAX_RETRIES = 3; // Retry failed requests

// Endpoint to trigger data ingestion from Moltbook API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { moltbookApiUrl, apiKey, limit = 100 } = body;

    if (!moltbookApiUrl) {
      return NextResponse.json(
        { error: "moltbookApiUrl is required" },
        { status: 400 }
      );
    }

    // Create ingestion job
    const job = await prisma.ingestionJob.create({
      data: {
        status: "running",
        startedAt: new Date(),
        totalItems: limit,
      },
    });

    // Start async ingestion
    ingestDataFast(job.id, moltbookApiUrl, apiKey, limit).catch(console.error);

    return NextResponse.json({
      message: "Ingestion started",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: "Failed to start ingestion" },
      { status: 500 }
    );
  }
}

// Get ingestion job status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const job = await prisma.ingestionJob.findUnique({
        where: { id: jobId },
      });
      return NextResponse.json({ job });
    }

    // Return latest job
    const latestJob = await prisma.ingestionJob.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ job: latestJob });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}

interface MoltbookPost {
  id: string;
  title: string | null;
  content: string;
  url: string | null;
  created_at: string;
  author: { id: string; name: string };
  submolt: { id: string; name: string; display_name: string };
}

async function fetchWithRetry(
  url: string,
  apiKey: string,
  retries: number = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      // Check for API-level errors in response
      if (response.ok) {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data.success === false) {
          throw new Error(data.error || 'API returned success: false');
        }
        // Return original response for further processing
        return response;
      }

      if (response.status >= 500 && attempt < retries) {
        console.log(`   ⚠️ Server error (${response.status}), retrying in ${attempt * 2}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt < retries) {
        console.log(`   ⚠️ Request failed, retrying in ${attempt * 2}s... (${error})`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function fetchAllPosts(
  baseUrl: string,
  apiKey: string,
  totalLimit: number
): Promise<MoltbookPost[]> {
  const allPosts: MoltbookPost[] = [];
  let offset = 0;

  // Cap the limit based on API's offset restrictions
  const effectiveLimit = Math.min(totalLimit, MAX_OFFSET + MOLTBOOK_PAGE_SIZE);

  console.log(`📥 Fetching up to ${effectiveLimit} posts from Moltbook (API offset limit: ${MAX_OFFSET})...`);
  if (totalLimit > effectiveLimit) {
    console.log(`   ⚠️ Requested ${totalLimit} but API only supports ~${effectiveLimit} via offset pagination`);
  }

  while (allPosts.length < effectiveLimit && offset <= MAX_OFFSET) {
    const remaining = effectiveLimit - allPosts.length;
    const fetchLimit = Math.min(MOLTBOOK_PAGE_SIZE, remaining);

    // Use offset-based pagination
    const url = `${baseUrl}?sort=new&limit=${fetchLimit}&offset=${offset}`;

    console.log(`   📡 Requesting: offset=${offset}, limit=${fetchLimit}`);

    try {
      const response = await fetchWithRetry(url, apiKey);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ API Error ${response.status}: ${errorText}`);
        // Stop pagination on error rather than failing completely
        console.log(`   ⚠️ Stopping pagination due to API error`);
        break;
      }

      const data = await response.json();
      const posts = data.posts || data.data || [];

      console.log(`   📦 Got ${posts.length} posts at offset ${offset}`);

      if (posts.length === 0) {
        console.log(`   ⚠️ No more posts returned, stopping pagination`);
        break;
      }

      // Filter duplicates by ID
      const existingIds = new Set(allPosts.map(p => p.id));
      const newPosts = posts.filter((p: MoltbookPost) => !existingIds.has(p.id));

      if (newPosts.length === 0) {
        console.log(`   ⚠️ All posts were duplicates, stopping pagination`);
        break;
      }

      allPosts.push(...newPosts);
      offset += posts.length;

      console.log(`   ✅ Total: ${allPosts.length}/${effectiveLimit} posts`);

      // Longer delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));

    } catch (error) {
      console.error(`   ❌ Fetch error at offset ${offset}:`, error);
      // Stop pagination on error rather than failing completely
      console.log(`   ⚠️ Stopping pagination, will process ${allPosts.length} posts collected so far`);
      break;
    }
  }

  console.log(`✅ Fetched ${allPosts.length} posts total`);
  return allPosts;
}

async function ingestDataFast(
  jobId: string,
  apiUrl: string,
  apiKey: string,
  limit: number
) {
  let processed = 0;
  let errors = 0;

  try {
    // 1. Fetch all posts from Moltbook (paginated)
    const posts = await fetchAllPosts(apiUrl, apiKey, limit);

    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { totalItems: posts.length },
    });

    console.log(`\n🔄 Processing ${posts.length} posts in batches of ${BATCH_SIZE}...`);

    const allEmbeddings: number[][] = [];
    const allPostIds: string[] = [];

    // 2. Process in batches
    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(posts.length / BATCH_SIZE);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} posts)`);

      try {
        // Prepare texts for batch embedding
        const texts = batch.map((post) =>
          post.title ? `${post.title}\n${post.content}` : post.content
        );

        // Generate embeddings in one API call (much faster!)
        console.log(`   🧠 Generating ${batch.length} embeddings...`);
        const embeddings = await generateEmbeddings(texts);

        // Save posts to database
        console.log(`   💾 Saving to database...`);
        for (let j = 0; j < batch.length; j++) {
          const post = batch[j];
          const embedding = embeddings[j];

          try {
            const savedPost = await prisma.post.upsert({
              where: { externalId: post.id },
              create: {
                externalId: post.id,
                content: post.content,
                title: post.title,
                author: post.author?.name || null,
                authorId: post.author?.id || null,
                url: post.url,
              },
              update: {
                content: post.content,
                title: post.title,
                author: post.author?.name || null,
                authorId: post.author?.id || null,
                url: post.url,
              },
            });

            // Store embedding
            await prisma.$executeRaw`
              UPDATE posts
              SET embedding = ${`[${embedding.join(",")}]`}::vector
              WHERE id = ${savedPost.id}
            `;

            allEmbeddings.push(embedding);
            allPostIds.push(savedPost.id);
            processed++;
          } catch (err) {
            console.error(`   ❌ Error saving post ${post.id}:`, err);
            errors++;
          }
        }

        // Update progress
        await prisma.ingestionJob.update({
          where: { id: jobId },
          data: { processed, errors },
        });

        console.log(`   ✅ Batch complete (${processed}/${posts.length} total)`);
      } catch (err) {
        console.error(`❌ Batch ${batchNum} failed:`, err);
        errors += batch.length;
      }
    }

    // 3. Cluster all posts into topics
    if (allEmbeddings.length > 0) {
      console.log(`\n🎯 Clustering ${allEmbeddings.length} posts into topics...`);

      // More topics for larger datasets
      const numClusters = Math.min(
        Math.max(Math.ceil(allEmbeddings.length / 20), 5),
        50
      );

      console.log(`   Creating ${numClusters} topic clusters...`);
      const { clusters, centroids } = kMeansClustering(allEmbeddings, numClusters);

      // Calculate 3D positions
      console.log(`   📍 Calculating 3D positions...`);
      const positions = embedTo3D(allEmbeddings);
      const centroidPositions = embedTo3D(centroids);

      // Update post positions (batch update)
      console.log(`   💾 Updating post positions...`);
      for (let i = 0; i < allPostIds.length; i++) {
        await prisma.post.update({
          where: { id: allPostIds[i] },
          data: {
            posX: positions[i].x,
            posY: positions[i].y,
            posZ: positions[i].z,
          },
        });
      }

      // Group posts by cluster
      const clusterPostsMap: Map<number, string[]> = new Map();
      clusters.forEach((clusterIdx, postIdx) => {
        if (!clusterPostsMap.has(clusterIdx)) {
          clusterPostsMap.set(clusterIdx, []);
        }
        clusterPostsMap.get(clusterIdx)!.push(allPostIds[postIdx]);
      });

      // Create topics
      console.log(`   🏷️  Generating topic labels with AI...`);
      let topicNum = 0;
      for (const [clusterIdx, clusterPostIds] of clusterPostsMap) {
        topicNum++;
        console.log(`      Topic ${topicNum}/${clusterPostsMap.size} (${clusterPostIds.length} posts)`);

        // Get sample posts for labeling
        const samplePosts = await prisma.post.findMany({
          where: { id: { in: clusterPostIds.slice(0, 10) } },
          select: { content: true, title: true },
        });

        const { name, description } = await generateClusterLabel(
          samplePosts.map((p) => p.title ? `${p.title}: ${p.content}` : p.content)
        );

        // Create topic
        const topic = await prisma.topic.create({
          data: {
            name,
            description,
            color: getTopicColor(clusterIdx),
            posX: centroidPositions[clusterIdx]?.x || 0,
            posY: centroidPositions[clusterIdx]?.y || 0,
            posZ: centroidPositions[clusterIdx]?.z || 0,
            postCount: clusterPostIds.length,
          },
        });

        // Store centroid embedding
        await prisma.$executeRaw`
          UPDATE topics
          SET centroid_embedding = ${`[${centroids[clusterIdx].join(",")}]`}::vector
          WHERE id = ${topic.id}
        `;

        // Link posts to topic
        await prisma.postTopic.createMany({
          data: clusterPostIds.map((postId) => ({
            postId,
            topicId: topic.id,
            relevance: 1.0,
          })),
        });
      }
    }

    // 4. Mark complete
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        processed,
        errors,
      },
    });

    console.log(`\n🎉 Ingestion complete!`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ❌ Errors: ${errors}`);

  } catch (error) {
    console.error("❌ Ingestion failed:", error);
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        completedAt: new Date(),
        processed,
        errors,
        errorLog: String(error),
      },
    });
  }
}
