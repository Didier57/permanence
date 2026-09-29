import { LocaleProvider } from "@/components/locale-provider";
import { getPublicLocale } from "@/lib/locale-server";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const locale = await getPublicLocale();
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
