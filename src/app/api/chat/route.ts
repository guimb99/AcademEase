import prisma from "@/lib/db/prisma";
import openai, { getEmbedding } from "@/lib/openai";
import { auth } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";
import { ChatCompletionMessage, ChatCompletionMessageParam } from "openai/resources/index.mjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: ChatCompletionMessage[] = body.messages;
    const localization = await getTranslations('ChatAPI');

    const messagesTruncated = messages.slice(-6);

    const embedding = await getEmbedding(
      messagesTruncated.map((message) => message.content).join("\n"),
    );

    const { userId } = auth();
    if (!userId) return;
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      return Response.json(
        { error: localization("createNotesFirst")},
        { status: 500 }
      );
    }

    const userEmbedding = userProfile.embedding;

    const similarUsers: any = await prisma.userProfile.aggregateRaw({
      pipeline: [
        {
          $vectorSearch: {
            index: "user-profiles",
            queryVector: userEmbedding,
            path: "embedding",
            numCandidates: 100,
            limit: 5,
          },
        },
        {
          $match: {
            userId: { $ne: userId },
          },
        },
        {
          $project: {
            userId: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ],
    });

    const similarUserIds = similarUsers.map((user: any) => user.userId);

    const relevantNotes: any = await prisma.note.aggregateRaw({
      pipeline: [
        {
          $vectorSearch: {
            index: "relevant-notes",
            queryVector: embedding,
            path: "embedding",
            numCandidates: 100,
            limit: 5,
          },
        },
        {
          $match: {
            userId: { $in: [userId] },
          },
        },
        {
          $project: {
            _id: 0,
            title: 1,
            content: 1,
            userId: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ],
    });

    const contextRelevantNotes: any = (similarUserIds.length) ? await prisma.note.aggregateRaw({
      pipeline: [
        {
          $vectorSearch: {
            index: "relevant-notes",
            queryVector: embedding,
            path: "embedding",
            numCandidates: 100,
            limit: 5,
          },
        },
        {
          $match: {
            userId: { $in: [...similarUserIds] },
          },
        },
        {
          $project: {
            _id: 0,
            title: 1,
            content: 1,
            userId: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ],
    }) : [];

    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content:
        localization("prompt") +
        localization("relevantNotes") +
        (relevantNotes
          ? relevantNotes
              .map(
                (note: any) =>
                  `Title: ${note.title}\nContent:${note.content}`,
              )
              .join("\n")
          : localization("noRelevantNotes")) +
        (contextRelevantNotes
          ? "\n\n" + localization("contextNotes") + contextRelevantNotes
              .map(
                (note: any) =>
                  `Title: ${note.title}\nContent:${note.content}`,
              )
              .join("\n")
          : "")
    };

    const completion = await openai.beta.chat.completions.stream({
      model: "gpt-4",
      messages: [systemMessage, ...messagesTruncated],
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller: any) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const text = encoder.encode(content);
              controller.enqueue(text);
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}