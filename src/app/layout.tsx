import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "./ThemeProvider";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { enUS, ptBR } from '@clerk/localizations'
import "./globals.css";

export async function generateMetadata() {
  const localization = await getTranslations('App');
  return {
      title: "AcademEase",
      description: localization("description")
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <ClerkProvider localization={locale === "en-US" ? enUS : ptBR}>
      <html lang={locale}>
        <body>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider attribute="class">{children}</ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
