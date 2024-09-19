import { Suspense } from "react";
import { auth } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { getUdemyCourses } from "@/lib/udemy";
import CourseList from "@/components/CourseList";
import NavBar from "@/app/notes/NavBar";
import prisma from "@/lib/db/prisma";

async function getCourses() {
  const { userId } = auth();
  if (!userId) throw Error("userId undefined");
  const userProfile = await prisma.userProfile.findUnique({
    select: { embedding: true },
    where: { userId },
  });

  if (!userProfile || !userProfile.embedding.length) {
    throw Error("No user profile found")
  }

  // Adjust this after Udemy approves API Clients key
  const testData = require('./test.json');
  return testData.results.map((course: any) => ({
    id: course.id.toString(),
    title: course.title,
    description: course.visible_instructors.map((instructor: any) => instructor.display_name).join(', '),
    url: `https://www.udemy.com${course.url}`
  }));
  // return await getUdemyCourses(userProfile.embedding || []);
}

export default async function CoursesPage() {
  const courses = await getCourses();
  const localization = await getTranslations('Courses');

  return (
    <>
      <NavBar />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">{localization("recommendedCourses")}</h1>
        <Suspense fallback={<div>{localization("loadingCourses")}</div>}>
          <CourseList courses={courses} />
        </Suspense>
      </div>
    </>
  );
}