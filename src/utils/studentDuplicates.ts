import { Course, Student } from '../types';

export interface DuplicateStudentMatch {
  student: Student;
  courseTitle: string;
  courseId: string;
  matchType: 'same_course' | 'other_course';
  matchedBy: 'phone' | 'parentPhone' | 'name';
  matchDescription: string;
}

/**
 * Normalizes Arabic text for flexible name matching
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove tashkeel/diacritics
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes phone numbers (removes spaces, dashes, etc.)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

const PLACEHOLDER_PHONES = new Set(['0550000000', '0660000000', '0770000000', '055000000', '0000000000']);

/**
 * Searches across all courses for duplicate or existing students
 */
export function findDuplicateStudents(
  courses: Course[],
  currentCourseId: string | undefined,
  inputName: string,
  inputPhone: string,
  inputParentPhone?: string
): DuplicateStudentMatch[] {
  const normName = normalizeArabicText(inputName);
  const normPhone = normalizePhone(inputPhone);
  const normParentPhone = normalizePhone(inputParentPhone || '');

  const hasValidName = normName.length >= 3;
  const hasValidPhone = normPhone.length >= 8 && !PLACEHOLDER_PHONES.has(normPhone);
  const hasValidParent = normParentPhone.length >= 8 && !PLACEHOLDER_PHONES.has(normParentPhone);

  if (!hasValidName && !hasValidPhone && !hasValidParent) {
    return [];
  }

  const matches: DuplicateStudentMatch[] = [];
  const seenStudentIds = new Set<string>();

  for (const course of courses) {
    const list = course.enrolledList || [];
    for (const std of list) {
      if (!std || !std.id || seenStudentIds.has(std.id)) continue;

      const stdNormName = normalizeArabicText(std.fullName || '');
      const stdNormPhone = normalizePhone(std.phone || '');
      const stdNormParent = normalizePhone(std.parentPhone || '');

      let matchedBy: 'phone' | 'parentPhone' | 'name' | null = null;
      let matchDescription = '';

      // 1. Phone match
      if (hasValidPhone && (stdNormPhone === normPhone || stdNormParent === normPhone)) {
        matchedBy = 'phone';
        matchDescription = `تطابق رقم الهاتف: ${std.phone || inputPhone}`;
      }
      // 2. Parent phone match
      else if (hasValidParent && (stdNormPhone === normParentPhone || stdNormParent === normParentPhone)) {
        matchedBy = 'parentPhone';
        matchDescription = `تطابق رقم هاتف ولي الأمر: ${std.parentPhone || inputParentPhone}`;
      }
      // 3. Name match
      else if (hasValidName && (stdNormName === normName || (stdNormName.length >= 4 && (stdNormName.includes(normName) || normName.includes(stdNormName))))) {
        matchedBy = 'name';
        matchDescription = `تطابق في الاسم: "${std.fullName}"`;
      }

      if (matchedBy) {
        seenStudentIds.add(std.id);
        const matchType = (currentCourseId && course.id === currentCourseId) ? 'same_course' : 'other_course';
        matches.push({
          student: std,
          courseTitle: course.title,
          courseId: course.id,
          matchType,
          matchedBy,
          matchDescription,
        });
      }
    }
  }

  return matches;
}
