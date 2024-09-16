import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async () => {
  const locale = headers().get("accept-language")?.split(',')[0];
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});