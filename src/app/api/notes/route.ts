import prisma from "@/lib/db/prisma";
import { getEmbedding } from "@/lib/openai";
import {
  createNoteSchema,
  deleteNoteSchema,
  updateNoteSchema,
} from "@/lib/validation/note";
import { auth } from "@clerk/nextjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parseResult = createNoteSchema.safeParse(body);

    if (!parseResult.success) {
      console.error(parseResult.error);
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { title, content, color } = parseResult.data;

    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const embedding = await getEmbeddingForNote(title, content);

    const note = await prisma.$transaction(async (pt) => {
      const note = await pt.note.create({
        data: {
          title,
          content,
          color,
          embedding,
          userId,
        },
      });

      return note;
    });

    await updateUserProfile(userId);
    return Response.json({ note }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const parseResult = updateNoteSchema.safeParse(body);

    if (!parseResult.success) {
      console.error(parseResult.error);
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { id, title, content, color } = parseResult.data;

    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 });
    }

    const { userId } = auth();

    if (!userId || userId !== note.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const embedding = await getEmbeddingForNote(title, content);

    const updatedNote = await prisma.$transaction(async (pt) => {
      const updatedNote = await pt.note.update({
        where: { id },
        data: {
          title,
          content,
          color,
          embedding,
        },
      });

      return updatedNote;
    });

    await updateUserProfile(userId);
    return Response.json({ updatedNote }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    const parseResult = deleteNoteSchema.safeParse(body);

    if (!parseResult.success) {
      console.error(parseResult.error);
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { id } = parseResult.data;

    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 });
    }

    const { userId } = auth();

    if (!userId || userId !== note.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction(async (pt) => {
      await pt.note.delete({ where: { id } });
    });

    return Response.json({ message: "Note deleted" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getEmbeddingForNote(title: string, content: string | undefined) {
  return getEmbedding(title + "\n\n" + content ?? "");
}

async function updateUserProfile(userId: string) {
  const topRelevantNotes = await prisma.note.findMany({
    where: { userId },
    select: { embedding: true },
  });

  if (topRelevantNotes.length === 0) {
    return;
  }

  const embeddings = topRelevantNotes.map((note) => note.embedding);
  const newUserEmbedding = combineEmbeddingsWithCosineSimilarity(embeddings);

  await prisma.userProfile.upsert({
    where: { userId },
    update: { embedding: newUserEmbedding },
    create: {
      userId,
      embedding: newUserEmbedding,
    },
  });
}

function combineEmbeddingsWithCosineSimilarity(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  if (embeddings.length === 1) return embeddings[0];

  const embeddingLength = embeddings[0].length;
  let result = [...embeddings[0]]; // Initialize with the first embedding

  for (let i = 1; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    
    // Calculate cosine similarity
    const dotProduct = result.reduce((sum, val, j) => sum + val * embedding[j], 0);
    const magnitudeA = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const similarity = dotProduct / (magnitudeA * magnitudeB || 1); // Avoid division by zero

    // Add weighted embedding to result
    for (let j = 0; j < embeddingLength; j++) {
      result[j] += embedding[j] * similarity;
    }
  }

  // Normalize the result
  const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
  return result.map(val => val / (magnitude || 1)); // Avoid division by zero
}