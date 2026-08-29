import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { Quiz, toQuizPublicView, toQuizAdminView } from '../../src/modules/quiz/quiz.model';

/**
 * Regression guard: the convert-facing quiz view must NEVER leak the
 * correct answer. If someone refactors toQuizPublicView and accidentally
 * includes correctLabel, this test fails loudly.
 */
describe('toQuizPublicView', () => {
  const quiz = new Quiz({
    lessonId: new Types.ObjectId(),
    courseId: new Types.ObjectId(),
    title: 'Salvation Basics',
    description: 'Check understanding',
    passingScore: 70,
    maxAttempts: 0,
    questions: [
      {
        questionText: 'Who is the Way, the Truth and the Life?',
        options: [
          { label: 'A', text: 'Jesus' },
          { label: 'B', text: 'Paul' },
        ],
        correctLabel: 'A',
        sortOrder: 1,
      },
    ],
  });

  it('does not expose correctLabel on the quiz or any question', () => {
    const view = toQuizPublicView(quiz);
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain('correctLabel');
    for (const q of view.questions) {
      expect(q).not.toHaveProperty('correctLabel');
    }
    // sanity: options are still present so converts can answer
    expect(view.questions[0].options).toHaveLength(2);
  });

  it('still exposes correctLabel to the admin view', () => {
    const view = toQuizAdminView(quiz);
    expect(view.questions[0]).toHaveProperty('correctLabel', 'A');
  });
});
