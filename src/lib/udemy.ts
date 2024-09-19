import axios from 'axios';
import OpenAI from 'openai';
import { getTranslations } from 'next-intl/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getThemesFromEmbedding(embedding: number[]): Promise<string[]> {
  const localization = await getTranslations('UdemyCompletion');

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: localization("prompt") + ` Embedding: ${embedding.join(', ')}`
        }
      ],
      temperature: 0.2,
      max_tokens: 100,
    });

    const themes = response.choices[0].message.content?.split(',').map(theme => theme.trim()) || [];
    return themes.slice(0, 5);
  } catch (error) {
    console.error("Error getting themes from OpenAI:", error);
    return [];
  }
}

export async function getUdemyCourses(embedding: number[]) {
  const apiKey = process.env.UDEMY_API_KEY;
  const baseUrl = "https://www.udemy.com/api-2.0/courses/";

  const themes = await getThemesFromEmbedding(embedding);

  const params = new URLSearchParams({
    search: themes.join(' '),
    page: '1',
    page_size: '10'
  });

  try {
    const response = await axios.get(`${baseUrl}?${params}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json, text/plain, */*"
      }
    });

    return response.data.results;
  } catch (error) {
    console.error("Error fetching Udemy courses:", error);
    return [];
  }
}