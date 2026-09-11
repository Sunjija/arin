/** Explicit seed scope. Cross-unit cards require every listed lesson to be learned. */
export const CARD_LESSON_SCOPE: Record<string, string[]> = Object.fromEntries(
  [
    ['lesson-01', [14, 15, 16, 43, 44, 45]],
    ['lesson-02', [8, 9, 12, 13, 47, 48, 49, 50, 51, 54]],
    ['lesson-13', [10, 11, 52, 53]],
    ['lesson-03', [17, 55, 56, 59, 60, 61]],
    ['lesson-15', [18, 19, 20, 57, 58]],
    ['lesson-04', [1, 2, 3, 4, 5, 41, 42]],
    ['lesson-05', [6, 7, 65]],
    ['lesson-12', [62, 63, 64, 66]],
    ['lesson-06', [21, 22, 23, 24, 25, 67, 68, 69, 70, 71]],
    ['lesson-07', [26, 28, 77]],
    ['lesson-14', [27, 72, 73, 74, 75, 76, 78]],
    ['lesson-08', [29, 30, 31, 81, 82]],
    ['lesson-16', [79, 80]],
    ['lesson-09', [32, 33, 34, 35, 83, 85, 86]],
    ['lesson-17', [84, 87]],
    ['lesson-10', [36, 88, 90]],
    ['lesson-18', [37, 89, 91]],
    ['lesson-11', [38, 39, 40, 92, 93, 94, 95]],
  ].flatMap(([lessonId, numbers]) =>
    (numbers as number[]).map((n) => [`c-${String(n).padStart(2, '0')}`, [lessonId as string]]),
  ),
)

// c-46 (several early states) has no complete lesson yet; keep it out of automatic review.
CARD_LESSON_SCOPE['c-28'] = ['lesson-07', 'lesson-14']
CARD_LESSON_SCOPE['c-81'] = ['lesson-08', 'lesson-16']
CARD_LESSON_SCOPE['c-36'] = ['lesson-10', 'lesson-18']
