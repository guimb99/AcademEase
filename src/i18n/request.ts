import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async () => {
  const headerLocale = headers().get("accept-language")?.split(',')[0];
  const supportedLanguages = ['en-US', 'pt-BR'];
  const locale = supportedLanguages.includes(headerLocale!) ? headerLocale : 'en-US';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});