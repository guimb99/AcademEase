import prisma from "@/lib/db/prisma";
import openai, { getEmbedding } from "@/lib/openai";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { ChatCompletionMessage, ChatCompletionMessageParam } from "openai/resources/index.mjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: ChatCompletionMessage[] = body.messages;

    const messagesTruncated = messages.slice(-6);

    const embedding = await getEmbedding(
      messagesTruncated.map((message) => message.content).join("\n"),
    );

    const { userId } = auth();
  
    const relevantNotes: any = await prisma.note.aggregateRaw({
      pipeline: [
        {
          $vectorSearch: {
            index: "relevant-notes",
            queryVector: embedding,
            path: "embedding",
            numCandidates: 150,
            limit: 4
          }
        },
        {
          $match: { userId: userId }
        },
        {
          $project: {
            _id: 0,
            title: 1,
            content: 1,
            userId: 1,
            score: {
              $meta: "vectorSearchScore"
            }
          }
        }
      ]
    });

    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `
        You are a note-taking career guidance assistant app, responsible for answering user questions ONLY about career oriented questions, if asked otherwise refuse.
        You answer the user's question based on their existing notes and documentation about career guidance.
        If you can't come up with career suggestions or lack informations, advise the user to add notes to the board, not to type in chat.
        If the user asks a question unrelated to career guidance, respond with: "Thanks for your question! It seems unrelated to career guidance. If you need career advice, feel free to ask!"
        The relevant notes for this query are:\n` +
        (relevantNotes
          ? relevantNotes.map((note: any) => `Title: ${note.title}\n\nContent:\n${note.content}`).join("\n\n")
          : "No relevant notes found.")
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
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}