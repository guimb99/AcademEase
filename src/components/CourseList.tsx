import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  url: string;
  price: string;
}

interface CourseListProps {
  courses: Course[];
}

export default function CourseList({ courses }: CourseListProps) {
  const localization = useTranslations('CourseList');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {courses.map((course) => (
        <div key={course.id} className="border rounded-lg p-4 flex flex-col">
          <h2 className="text-lg font-semibold">{course.title}</h2>
          <p className="mt-2 flex-grow">{course.description}</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-bold">{course.price}</span>
            <Link href={course.url} target="_blank" rel="noopener noreferrer">
              <Button>
                {localization("viewCourse")}
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}