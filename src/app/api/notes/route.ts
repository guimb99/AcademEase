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
  const userNotes = await prisma.note.findMany({
    where: { userId },
    select: { embedding: true },
  });

  if (userNotes.length === 0) {
    return;
  }

  const embeddings = userNotes.map((note) => note.embedding);
  const userEmbedding = averageEmbeddings(embeddings);

  await prisma.userProfile.upsert({
    where: { userId },
    update: { embedding: userEmbedding },
    create: {
      userId,
      embedding: userEmbedding,
    },
  });
}

function averageEmbeddings(embeddings: number[][]): number[] {
  const numEmbeddings = embeddings.length;
  const embeddingLength = embeddings[0].length;
  const averagedEmbedding = new Array(embeddingLength).fill(0);

  embeddings.forEach((embedding) => {
    for (let i = 0; i < embeddingLength; i++) {
      averagedEmbedding[i] += embedding[i] / numEmbeddings;
    }
  });

  return averagedEmbedding;
}