import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useTranslations } from 'next-intl';

export default function Home() {
  const { userId } = auth();
  if (userId) redirect("/notes");

  const localization = useTranslations('Home');

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-4">
        <Image src={logo} alt="AcademEase logo" width={100} height={100} />
        <span className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          AcademEase
        </span>
      </div>
      <p className="max-w-prose text-center">
        {localization('description')}
      </p>
      <Button size="lg" asChild>
        <Link href="/notes">{localization('start')}</Link>
      </Button>
    </main>
  );
}
