import axios from 'axios';
import OpenAI from 'openai';
import { getTranslations } from 'next-intl/server';
import prisma from './db/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getThemesFromEmbedding(embedding: number[]): Promise<string[]> {
  const localization = await getTranslations('UdemyCompletion');

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
        $project: {
          _id: 0,
          title: 1,
          content: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ],
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: localization("prompt") +
          (relevantNotes
            ? relevantNotes
                .map(
                  (note: any) =>
                    `Title: ${note.title}\n\nContent:\n${note.content}`,
                )
                .join("\n\n")
            : localization("noRelevantNotes")),
        }
      ],
      temperature: 0.2
    });

    const themes = response.choices[0].message.content?.split(',').map(theme => theme.trim()) || [];
    return themes.slice(0, 5);
  } catch (error) {
    console.error("Error getting themes from OpenAI:", error);
    return [];
  }
}

export async function getUdemyCourses(embedding: number[]) {
  const clientId = process.env.UDEMY_CLIENT_ID;
  const clientSecret = process.env.UDEMY_CLIENT_SECRET;
  const baseUrl = "https://www.udemy.com/api-2.0/courses/";

  if (!clientId || !clientSecret) {
    throw new Error("Udemy API credentials are not set");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const themes = await getThemesFromEmbedding(embedding);
  console.log(themes);

  const params = new URLSearchParams({
    search: themes.join(' '),
    page: '1',
    page_size: '10',
    ordering: 'price-low-to-high'
  });

  try {
    const response = await axios.get(`${baseUrl}?${params}`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json, text/plain, */*"
      }
    });

    return response.data.results;
  } catch (error) {
    console.error("Error getting courses from Udemy:", error);
    return [];
  }
}