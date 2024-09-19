import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  url: string;
}

interface CourseListProps {
  courses: Course[];
}

export default function CourseList({ courses }: CourseListProps) {
  const localization = useTranslations('CourseList');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {courses.map((course) => (
        <div key={course.id} className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold">{course.title}</h2>
          <p className="mt-2">{course.description}</p>
          <Link href={course.url} target="_blank">
            <Button>
                {localization("viewCourse")}
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}