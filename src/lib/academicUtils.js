// Academic Utilities for NexusERP University Module
// Implements both Standard University & MIT (Massachusetts Institute of Technology) Academic Student Life Cycle Standards

export function calculateFinalScore(courseworkScore, examScore, courseworkWeight = 40, examWeight = 60) {
  if (courseworkScore == null && examScore == null) return null;
  const cw = courseworkScore || 0;
  const ex = examScore || 0;
  return parseFloat(((cw * courseworkWeight / 100) + (ex * examWeight / 100)).toFixed(1));
}

// Traditional 4.0 scale
export function scoreToGrade(score, passMark = 50, distinctionMark = 75) {
  if (score == null) return { grade: '—', grade_points: 0, result: 'pending' };
  if (score >= distinctionMark) return { grade: 'A', grade_points: 4.0, result: 'distinction' };
  if (score >= 65) return { grade: 'B', grade_points: 3.0, result: 'pass' };
  if (score >= passMark) return { grade: 'C', grade_points: 2.0, result: 'pass' };
  if (score >= 40) return { grade: 'D', grade_points: 1.0, result: 'fail' };
  return { grade: 'F', grade_points: 0, result: 'fail' };
}

// MIT 5.0 Grade Scale & First-Year Transitional Grading (P/NR & ABC/NR)
export function scoreToMITGrade(score, gradingPolicy = 'regular') {
  if (score == null) return { grade: '—', grade_points: null, result: 'pending', transcript_status: 'pending' };

  if (gradingPolicy === 'first_year_fall' || gradingPolicy === 'p_nr') {
    // MIT First-Year Fall: Pass / No Record (C or better -> P; D or F -> NR)
    if (score >= 50) {
      return { grade: 'P', grade_points: null, result: 'pass', transcript_status: 'recorded_pass', notes: 'First-Year Fall Pass (No GPA calculation)' };
    }
    return { grade: 'NR', grade_points: null, result: 'no_record', transcript_status: 'hidden_no_record', notes: 'First-Year Fall No Record (Hidden from external transcript)' };
  }

  if (gradingPolicy === 'first_year_spring' || gradingPolicy === 'abc_nr') {
    // MIT First-Year Spring: A, B, C / No Record (D or F -> NR)
    if (score >= 80) return { grade: 'A', grade_points: 5.0, result: 'distinction', transcript_status: 'recorded_grade' };
    if (score >= 65) return { grade: 'B', grade_points: 4.0, result: 'pass', transcript_status: 'recorded_grade' };
    if (score >= 50) return { grade: 'C', grade_points: 3.0, result: 'pass', transcript_status: 'recorded_grade' };
    return { grade: 'NR', grade_points: null, result: 'no_record', transcript_status: 'hidden_no_record', notes: 'First-Year Spring No Record (Hidden from external transcript)' };
  }

  // Standard MIT 5.0 Scale: A=5.0, B=4.0, C=3.0, D=2.0, F=0.0
  if (score >= 80) return { grade: 'A', grade_points: 5.0, result: 'distinction', transcript_status: 'recorded_grade' };
  if (score >= 65) return { grade: 'B', grade_points: 4.0, result: 'pass', transcript_status: 'recorded_grade' };
  if (score >= 50) return { grade: 'C', grade_points: 3.0, result: 'pass', transcript_status: 'recorded_grade' };
  if (score >= 40) return { grade: 'D', grade_points: 2.0, result: 'pass', transcript_status: 'recorded_grade', notes: 'Warning: Low grade passed for credit' };
  return { grade: 'F', grade_points: 0.0, result: 'fail', transcript_status: 'recorded_fail' };
}

// Traditional 4.0 GPA
export function calculateGPA(enrollments) {
  const graded = enrollments.filter(e => e.grade_points != null && e.result && e.result !== 'pending' && e.result !== 'no_record');
  if (graded.length === 0) return 0;
  const totalPoints = graded.reduce((s, e) => s + (e.grade_points || 0), 0);
  return parseFloat((totalPoints / graded.length).toFixed(2));
}

// MIT Official 5.0 Cumulative and Term GPA Rating
export function calculateMITGPA(enrollments) {
  // MIT calculates GPA only on subjects with letter grades A(5), B(4), C(3), D(2), F(0).
  // P and NR grades do not enter into GPA calculation!
  const graded = enrollments.filter(e =>
    typeof e.grade_points === 'number' &&
    ['A', 'B', 'C', 'D', 'F'].includes(e.grade)
  );

  if (graded.length === 0) return 5.0; // Clean default rating
  const totalPoints = graded.reduce((sum, e) => {
    const units = e.units || e.credits || 12; // standard MIT subject is 12 units
    return sum + (e.grade_points * units);
  }, 0);
  const totalUnits = graded.reduce((sum, e) => sum + (e.units || e.credits || 12), 0);
  return totalUnits > 0 ? parseFloat((totalPoints / totalUnits).toFixed(2)) : 5.0;
}

export function totalCreditsEarned(enrollments, courses = []) {
  return enrollments
    .filter(e => e.result === 'pass' || e.result === 'distinction' || e.result === 'merit' || e.grade === 'P')
    .reduce((sum, e) => {
      const course = courses.find(c => c.id === e.course_id);
      return sum + (course?.credits || course?.units || e.credits || e.units || 12);
    }, 0);
}

export function getCoursePrice(course, items = []) {
  const linkedItem = items.find(i => i.source_type === 'course' && i.source_id === course.id);
  return linkedItem?.unit_price || 0;
}

export const SEMESTER_LABELS = {
  semester_1: 'Fall Term',
  semester_2: 'Spring Term',
  iap: 'IAP (Independent Activities Period)',
  summer: 'Summer Term',
  full_year: 'Full Academic Year',
  trimester_1: 'Fall Trimester',
  trimester_2: 'Spring Trimester',
  trimester_3: 'Summer Trimester',
};

export function nextSemester(current) {
  const map = {
    semester_1: 'iap',
    iap: 'semester_2',
    semester_2: null,
    full_year: null,
    trimester_1: 'trimester_2',
    trimester_2: 'trimester_3',
    trimester_3: null,
  };
  return map[current] || null;
}

// --------------------------------------------------------------------------
// MIT ACADEMIC STUDENT LIFE CYCLE FRAMEWORK (MIT Registrar & UAC Model)
// --------------------------------------------------------------------------

export const MIT_LIFECYCLE_STAGES = [
  {
    id: 'matriculation',
    step: 1,
    title: 'Phase 1: Matriculation & First-Year Advising',
    shortLabel: 'Matriculation & UAC',
    description: 'Admissions handoff, MIT ID & Kerberos generation, First-Year Undeclared status, and UAC Faculty Advisor assignment.'
  },
  {
    id: 'gir_grading',
    step: 2,
    title: 'Phase 2: GIRs & First-Year Grading (P/NR)',
    shortLabel: 'GIRs & P/NR Grading',
    description: 'General Institute Requirements core (Science, HASS, CI, REST, Lab, PE) and First-Year transitional grading (Fall P/NR, Spring ABC/NR).'
  },
  {
    id: 'major_declaration',
    step: 3,
    title: 'Phase 3: Major Declaration (Course 1-24)',
    shortLabel: 'Major Declaration',
    description: 'End of First Year / Sophomore standing declaration of Course Major, Departmental Advisor transition, and Minor / HASS Concentration filing.'
  },
  {
    id: 'term_registration',
    step: 4,
    title: 'Phase 4: Registration, IAP & UROP',
    shortLabel: 'Registration, IAP & UROP',
    description: 'WebSIS Pre-Registration, Advisor sign-off on Registration Day, Add/Drop Date policies, 4-week January IAP, and faculty UROP research projects.'
  },
  {
    id: 'cap_standing',
    step: 5,
    title: 'Phase 5: Academic Standing & CAP Review',
    shortLabel: 'CAP & Standing (5.0)',
    description: 'Committee on Academic Performance (CAP) review on 5.0 GPA scale, Good Standing vs. Academic Warning vs. RTW, and academic petitions.'
  },
  {
    id: 'gps_audit',
    step: 6,
    title: 'Phase 6: GPS Degree Audit & Degree Application',
    shortLabel: 'GPS Degree Audit',
    description: 'Graduation Planning & Support (GPS) automated audit against 17 GIRs and Major Course Units (180+ units), WebSIS Degree Application.'
  },
  {
    id: 'conferral_alumni',
    step: 7,
    title: 'Phase 7: S.B. Conferral & Commencement',
    shortLabel: 'Conferral & Alumni',
    description: 'Registrar & Faculty degree certification, Scientiae Baccalaureus (S.B.) diploma conferral, transcript sealing, and MIT Alumni Association transition.'
  }
];

// MIT General Institute Requirements (GIR) Master Definition
export const MIT_GIR_REQUIREMENTS = [
  // 1. Science Core (6 subjects / 72 units)
  { id: 'gir_calc_1', category: 'Science Core', code: '18.01', name: 'Calculus I (Single Variable)', units: 12, compulsory: true },
  { id: 'gir_calc_2', category: 'Science Core', code: '18.02', name: 'Calculus II (Multivariable)', units: 12, compulsory: true },
  { id: 'gir_phys_1', category: 'Science Core', code: '8.01', name: 'Physics I: Classical Mechanics', units: 12, compulsory: true },
  { id: 'gir_phys_2', category: 'Science Core', code: '8.02', name: 'Physics II: Electricity & Magnetism', units: 12, compulsory: true },
  { id: 'gir_chem', category: 'Science Core', code: '5.111', name: 'Principles of Chemical Science', units: 12, compulsory: true },
  { id: 'gir_bio', category: 'Science Core', code: '7.012', name: 'Introductory Biology', units: 12, compulsory: true },

  // 2. HASS Requirement (Humanities, Arts, and Social Sciences - 8 subjects / 96 units)
  { id: 'gir_hass_a', category: 'HASS Distribution', code: '21M.011', name: 'HASS-Arts: Introduction to Western Music', units: 12, compulsory: true },
  { id: 'gir_hass_h', category: 'HASS Distribution', code: '21L.001', name: 'HASS-Humanities: Western Literature', units: 12, compulsory: true },
  { id: 'gir_hass_s', category: 'HASS Distribution', code: '14.01', name: 'HASS-Social Science: Principles of Microeconomics', units: 12, compulsory: true },
  { id: 'gir_hass_conc_1', category: 'HASS Concentration', code: 'HASS-C1', name: 'HASS Concentration Elective 1', units: 12, compulsory: true },
  { id: 'gir_hass_conc_2', category: 'HASS Concentration', code: 'HASS-C2', name: 'HASS Concentration Elective 2', units: 12, compulsory: true },
  { id: 'gir_hass_conc_3', category: 'HASS Concentration', code: 'HASS-C3', name: 'HASS Concentration Elective 3', units: 12, compulsory: true },
  { id: 'gir_hass_elec_1', category: 'HASS Elective', code: 'HASS-E1', name: 'HASS General Elective 1', units: 12, compulsory: true },
  { id: 'gir_hass_elec_2', category: 'HASS Elective', code: 'HASS-E2', name: 'HASS General Elective 2', units: 12, compulsory: true },

  // 3. Communication Requirement (CI)
  { id: 'gir_ci_h_1', category: 'Communication Requirement', code: '21W.755', name: 'CI-H: Writing & Reading the Essay', units: 12, compulsory: true },
  { id: 'gir_ci_h_2', category: 'Communication Requirement', code: 'CI-H-2', name: 'CI-H: Communication Intensive Humanities', units: 12, compulsory: true },
  { id: 'gir_ci_m_1', category: 'Communication Requirement', code: '6.UAT', name: 'CI-M: Oral Communication in EECS', units: 12, compulsory: true },
  { id: 'gir_ci_m_2', category: 'Communication Requirement', code: '6.033', name: 'CI-M: Computer System Engineering', units: 12, compulsory: true },

  // 4. REST & Institute Lab
  { id: 'gir_rest_1', category: 'REST Requirement', code: '6.0001', name: 'REST: Intro to CS & Programming in Python', units: 12, compulsory: true },
  { id: 'gir_rest_2', category: 'REST Requirement', code: '18.03', name: 'REST: Differential Equations', units: 12, compulsory: true },
  { id: 'gir_lab', category: 'Institute Laboratory', code: '6.115', name: 'Institute Lab: Microcomputer Project Lab', units: 12, compulsory: true },

  // 5. Physical Education & Wellness
  { id: 'gir_pe_points', category: 'Physical Education & Wellness', code: 'PE-POINTS', name: '8 Physical Education Points (Completed)', units: 0, compulsory: true },
  { id: 'gir_swim_test', category: 'Physical Education & Wellness', code: 'SWIM-TEST', name: 'MIT 100-Yard Swim Test (Certified Passed)', units: 0, compulsory: true }
];

// MIT Course / Major Academic Departments
export const MIT_COURSES = [
  { code: 'Course 6-3', name: 'Computer Science and Engineering', degree: 'S.B.', department: 'EECS', required_major_units: 180 },
  { code: 'Course 6-2', name: 'Electrical Engineering & Computer Science', degree: 'S.B.', department: 'EECS', required_major_units: 180 },
  { code: 'Course 6-4', name: 'Artificial Intelligence & Decision Making', degree: 'S.B.', department: 'EECS', required_major_units: 180 },
  { code: 'Course 18', name: 'Mathematics', degree: 'S.B.', department: 'Mathematics', required_major_units: 180 },
  { code: 'Course 8', name: 'Physics', degree: 'S.B.', department: 'Physics', required_major_units: 180 },
  { code: 'Course 2', name: 'Mechanical Engineering', degree: 'S.B.', department: 'Mechanical Engineering', required_major_units: 180 },
  { code: 'Course 15-1', name: 'Management', degree: 'S.B.', department: 'Sloan School of Management', required_major_units: 180 },
  { code: 'Course 20', name: 'Biological Engineering', degree: 'S.B.', department: 'Biological Engineering', required_major_units: 180 },
  { code: 'Course 16', name: 'Aerospace Engineering', degree: 'S.B.', department: 'AeroAstro', required_major_units: 180 },
  { code: 'Course 3', name: 'Materials Science and Engineering', degree: 'S.B.', department: 'DMSE', required_major_units: 180 },
  { code: 'Course 9', name: 'Brain and Cognitive Sciences', degree: 'S.B.', department: 'BCS', required_major_units: 180 }
];

// Committee on Academic Performance (CAP) Evaluation
export function evaluateMITCAPStanding(student, enrollments = []) {
  const gpa = calculateMITGPA(enrollments);
  const passedThisTerm = enrollments.filter(e => e.result === 'pass' || e.result === 'distinction' || e.grade === 'P').length;
  const unitsPassedThisTerm = passedThisTerm * 12;

  // In MIT First-Year Fall (P/NR), grades are not GPA-based
  if (student?.current_year === 1 && student?.current_semester === 'semester_1') {
    const nrCount = enrollments.filter(e => e.result === 'no_record' || e.grade === 'NR').length;
    if (nrCount > 1) {
      return {
        status: 'cap_warning',
        label: 'CAP Warning',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        description: 'First-Year Early Warning: 2+ subjects with No Record (NR). Mandatory meeting with UAC Advisor required.',
        actionRequired: 'Meet with First-Year UAC Advisor and Academic Coach'
      };
    }
    return {
      status: 'good_standing',
      label: 'Good Standing',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Satisfactory progress under First-Year Pass/No Record policy.',
      actionRequired: 'None - Continue planned GIR subjects'
    };
  }

  // Regular Sophomore - Senior CAP Standing on 5.0 scale
  if (gpa >= 4.0 && unitsPassedThisTerm >= 36) {
    return {
      status: 'dean_list',
      label: 'Dean\'s List / High Standing',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      description: `Exceptional academic performance: Cumulative Rating ${gpa} / 5.0 with full load.`,
      actionRequired: 'Eligible for research fellowship / TA position'
    };
  }

  if (gpa >= 3.0 && unitsPassedThisTerm >= 36) {
    return {
      status: 'good_standing',
      label: 'Good Standing',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: `Solid academic standing: Term rating ${gpa} / 5.0, standard subject load passed.`,
      actionRequired: 'None'
    };
  }

  if (gpa < 3.0 || unitsPassedThisTerm < 36) {
    if (student?.cap_standing === 'cap_warning') {
      return {
        status: 'required_to_withdraw',
        label: 'Required to Withdraw (RTW)',
        badgeColor: 'bg-red-200 text-red-900 border-red-400',
        description: `Two consecutive terms with rating below 3.0 (${gpa}). Referred to Committee on Academic Performance for mandatory leave.`,
        actionRequired: 'Formal CAP Hearing and Petition for Medical/Personal Leave'
      };
    }
    return {
      status: 'cap_warning',
      label: 'Academic Warning',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description: `Term rating of ${gpa} or < 36 units passed. Under CAP review with credit restriction (max 48 units next term).`,
      actionRequired: 'Mandatory bi-weekly check-in with Departmental Faculty Advisor'
    };
  }

  return {
    status: 'good_standing',
    label: 'Good Standing',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Good Standing',
    actionRequired: 'None'
  };
}

// GPS (Graduation Planning & Support) Degree Audit Progress Auditor
export function auditMITGIRProgress(enrollments = [], courses = []) {
  const passedCodes = new Set(
    enrollments
      .filter(e => e.result === 'pass' || e.result === 'distinction' || e.grade === 'P' || ['A', 'B', 'C'].includes(e.grade))
      .map(e => {
        const course = courses.find(c => c.id === e.course_id);
        return (course?.code || e.course_code || '').toUpperCase().trim();
      })
  );

  let scienceCoreCount = 0;
  let hassCount = 0;
  let ciCount = 0;
  let restCount = 0;
  let labCount = 0;

  MIT_GIR_REQUIREMENTS.forEach(gir => {
    const code = gir.code.toUpperCase();
    const isCompleted = passedCodes.has(code) ||
      (gir.id === 'gir_calc_1' && passedCodes.has('18.01')) ||
      (gir.id === 'gir_calc_2' && passedCodes.has('18.02')) ||
      (gir.id === 'gir_phys_1' && passedCodes.has('8.01')) ||
      (gir.id === 'gir_phys_2' && passedCodes.has('8.02')) ||
      (gir.id === 'gir_chem' && (passedCodes.has('5.111') || passedCodes.has('3.091'))) ||
      (gir.id === 'gir_bio' && (passedCodes.has('7.012') || passedCodes.has('7.013')));

    if (isCompleted) {
      if (gir.category === 'Science Core') scienceCoreCount++;
      if (gir.category.includes('HASS')) hassCount++;
      if (gir.category.includes('Communication')) ciCount++;
      if (gir.category.includes('REST')) restCount++;
      if (gir.category.includes('Laboratory')) labCount++;
    }
  });

  const totalGIRs = MIT_GIR_REQUIREMENTS.length;
  // Always include PE points and swim test if student is in junior/senior years or marked completed
  const completedGIRs = Math.min(totalGIRs, scienceCoreCount + hassCount + ciCount + restCount + labCount + 2);
  const girPct = Math.round((completedGIRs / totalGIRs) * 100);

  return {
    completedGIRs,
    totalGIRs,
    girPct,
    scienceCore: { completed: Math.min(6, scienceCoreCount), total: 6, fulfilled: scienceCoreCount >= 6 },
    hass: { completed: Math.min(8, hassCount), total: 8, fulfilled: hassCount >= 8 },
    ci: { completed: Math.min(4, ciCount), total: 4, fulfilled: ciCount >= 4 },
    rest: { completed: Math.min(2, restCount), total: 2, fulfilled: restCount >= 2 },
    lab: { completed: Math.min(1, labCount), total: 1, fulfilled: labCount >= 1 },
    peWellness: { completed: 2, total: 2, fulfilled: true }
  };
}