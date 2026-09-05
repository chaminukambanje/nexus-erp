export function calculateFinalScore(courseworkScore, examScore, courseworkWeight = 40, examWeight = 60) {
  if (courseworkScore == null && examScore == null) return null;
  const cw = courseworkScore || 0;
  const ex = examScore || 0;
  return parseFloat(((cw * courseworkWeight / 100) + (ex * examWeight / 100)).toFixed(1));
}

export function scoreToGrade(score, passMark = 50, distinctionMark = 75) {
  if (score == null) return { grade: '—', grade_points: 0, result: 'pending' };
  if (score >= distinctionMark) return { grade: 'A', grade_points: 4.0, result: 'distinction' };
  if (score >= 65) return { grade: 'B', grade_points: 3.0, result: 'pass' };
  if (score >= passMark) return { grade: 'C', grade_points: 2.0, result: 'pass' };
  if (score >= 40) return { grade: 'D', grade_points: 1.0, result: 'fail' };
  return { grade: 'F', grade_points: 0, result: 'fail' };
}

export function calculateGPA(enrollments) {
  const graded = enrollments.filter(e => e.grade_points != null && e.result && e.result !== 'pending');
  if (graded.length === 0) return 0;
  const totalPoints = graded.reduce((s, e) => s + (e.grade_points || 0), 0);
  return parseFloat((totalPoints / graded.length).toFixed(2));
}

export function totalCreditsEarned(enrollments, courses = []) {
  return enrollments
    .filter(e => e.result === 'pass' || e.result === 'distinction' || e.result === 'merit')
    .reduce((sum, e) => {
      const course = courses.find(c => c.id === e.course_id);
      return sum + (course?.credits || 0);
    }, 0);
}

export function getCoursePrice(course, items = []) {
  const linkedItem = items.find(i => i.source_type === 'course' && i.source_id === course.id);
  return linkedItem?.unit_price || 0;
}

export const SEMESTER_LABELS = {
  semester_1: 'Semester 1',
  semester_2: 'Semester 2',
  full_year: 'Full Year',
  trimester_1: 'Trimester 1',
  trimester_2: 'Trimester 2',
  trimester_3: 'Trimester 3',
};

export function nextSemester(current) {
  const map = {
    semester_1: 'semester_2',
    semester_2: null,
    full_year: null,
    trimester_1: 'trimester_2',
    trimester_2: 'trimester_3',
    trimester_3: null,
  };
  return map[current] || null;
}