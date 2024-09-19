"use client";

import logo from "@/assets/logo.png";
import AIChatButton from "@/components/AIChatButton";
import AddEditNoteDialog from "@/components/AddEditNoteDialog";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Plus, Tv2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function NavBar() {
  const { theme } = useTheme();
  const localization = useTranslations('NavBar');
  const [showAddEditNoteDialog, setShowAddEditNoteDialog] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-background shadow">
        <div className="p-4">
          <div className="m-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <Link href="/notes" className="flex items-center gap-1">
              <Image src={logo} alt="AcademEase logo" width={40} height={40} />
              <span className="font-bold">AcademEase</span>
            </Link>
            <div className="flex items-center gap-2 justify-end ml-auto">
              <ThemeToggleButton />
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  baseTheme: theme === "dark" ? dark : undefined,
                  elements: { avatarBox: { width: "2.5rem", height: "2.5rem" } },
                }}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button onClick={() => setShowAddEditNoteDialog(true)} className="w-full sm:w-auto">
                <Plus size={20} className="mr-2" />
                {localization("createNote")}
              </Button>
              <AIChatButton />
              <Link href="/courses" className="w-full sm:w-auto">
                <Button className="w-full">
                  <Tv2 size={20} className="mr-2" />
                  {localization("courses")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[120px] md:h-[80px]"></div>
      <AddEditNoteDialog
        open={showAddEditNoteDialog}
        setOpen={setShowAddEditNoteDialog}
      />
    </>
  );
}
