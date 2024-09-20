import { Suspense } from "react";
import { auth } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import CourseList from "@/components/CourseList";
import NavBar from "@/app/notes/NavBar";
import { getUdemyCourses } from "@/lib/udemy";
import prisma from "@/lib/db/prisma";

async function getCourses() {
  const { userId } = auth();
  if (!userId) throw Error("userId undefined");
  const userProfile = await prisma.userProfile.findUnique({
    select: { embedding: true },
    where: { userId },
  });
  
  if (!userProfile || !userProfile.embedding) {
    throw Error("No user profile found");
  }

  return await getUdemyCourses(userProfile.embedding || []);
}

export default async function CoursesPage() {
  const localization = await getTranslations('Courses');
  const courses = await getCourses();

  return (
    <>
      <NavBar />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">{localization("recommendedCourses")}</h1>
        <Suspense fallback={<div>{localization("loadingCourses")}</div>}>
          {!courses.length ? (
            <div>{localization("udemyAPIError")}</div>
          ) : (
            <CourseList courses={courses} />
          )}
        </Suspense>
      </div>
    </>
  );
}