// Korean academic year: 1학기 ~ Mar-Aug, 2학기 ~ Sep-Feb (Jan/Feb belong to the
// previous calendar year's 2학기). Semester values are plain "YYYY-1"/"YYYY-2"
// strings — simple to store, sort, and use as Select option values.
export function currentSemester(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 3 && month <= 8) return `${year}-1`;
  if (month >= 9) return `${year}-2`;
  return `${year - 1}-2`;
}

export function semesterLabel(semester: string): string {
  const [year, term] = semester.split("-");
  return `${year}년 ${term}학기`;
}

// Descending list of the current semester and the `count - 1` before it, for
// populating filter/select dropdowns.
export function recentSemesters(count: number = 8, from: Date = new Date()): string[] {
  const semesters: string[] = [];
  let [year, term] = currentSemester(from).split("-").map(Number);
  for (let i = 0; i < count; i++) {
    semesters.push(`${year}-${term}`);
    if (term === 2) {
      term = 1;
    } else {
      term = 2;
      year -= 1;
    }
  }
  return semesters;
}
