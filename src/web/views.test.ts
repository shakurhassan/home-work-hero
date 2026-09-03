import { describe, expect, it } from 'vitest';
import { seedState } from '../domain/seed.ts';
import { homePage, identityPage, submissionPage } from './views.ts';

describe('submissionPage', () => {
  it('AC12: shows every attempt and verdict, oldest first', () => {
    const html = submissionPage(seedState(), 'p2', 's3');

    expect(html.indexOf('x = 5')).toBeGreaterThan(-1);
    expect(html.indexOf('x = 5')).toBeLessThan(html.indexOf('3x = 15'));
    expect(html).toContain('52 / 100');
    expect(html).toContain('78 / 100');
    expect(html).toContain('CORRECT');
    expect(html).toContain('CONTINUE');
  });

  it('AC13: shows the review form to the assigned reviewer', () => {
    const html = submissionPage(seedState(), 'p3', 's1');

    expect(html).toContain('name="score"');
    expect(html).toContain('name="nextAction"');
  });

  it('AC13: shows no review form to anyone else', () => {
    const html = submissionPage(seedState(), 'p4', 's1');

    expect(html).not.toContain('name="score"');
  });

  it('AC13: shows an answer box to the student when a revision is needed', () => {
    const html = submissionPage(seedState(), 'p1', 's2');

    expect(html).toContain('name="answer"');
  });

  it('AC21: offers an answer box on a submission closed with CONTINUE', () => {
    const html = submissionPage(seedState(), 'p2', 's3');

    expect(html).toContain('name="answer"');
  });

  it('AC21: offers no answer box once a submission is locked with DONE', () => {
    const seed = seedState();
    const state = {
      ...seed,
      submissions: seed.submissions.map((submission) =>
        submission.id === 's3'
          ? {
              ...submission,
              attempts: submission.attempts.map((attempt, index) =>
                index === submission.attempts.length - 1 && attempt.review !== null
                  ? { ...attempt, review: { ...attempt.review, nextAction: 'DONE' as const } }
                  : attempt,
              ),
            }
          : submission,
      ),
    };

    expect(submissionPage(state, 'p2', 's3')).not.toContain('name="answer"');
  });

  it('AC20: a rejected review keeps what the reviewer typed', () => {
    const html = submissionPage(seedState(), 'p3', 's1', 'Score must be a whole number', {
      score: '78.5',
      comment: 'Nearly there',
    });

    expect(html).toContain('value="78.5"');
    expect(html).toContain('Nearly there');
  });

  it('AC14: escapes rendered content', () => {
    const seed = seedState();
    const state = {
      ...seed,
      submissions: seed.submissions.map((submission) =>
        submission.id === 's1' ? { ...submission, question: '<script>x</script>' } : submission,
      ),
    };

    const html = submissionPage(state, 'p1', 's1');

    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>x</script>');
  });
});

describe('homePage', () => {
  it('AC10: a student sees what is waiting on them and no review queue', () => {
    const html = homePage(seedState(), 'p1');

    expect(html).toContain('Waiting on you');
    expect(html).toContain('Explain photosynthesis in your own words.');
    expect(html).toContain('needs revision');
    expect(html).not.toContain('To review');
  });

  it('AC11: a reviewer sees their queue', () => {
    const html = homePage(seedState(), 'p3');

    expect(html).toContain('To review');
    expect(html).toContain('Why does ice float on water?');
  });
});

describe('identityPage', () => {
  it('AC9: lists everyone and offers the register form', () => {
    const html = identityPage(seedState());

    expect(html).toContain('Who are you?');
    expect(html).toContain('Maya Chen');
    expect(html).toContain('Tomas Alvarez');
    expect(html).toContain('Mr. Okafor');
    expect(html).toContain('Sam Chen');
    expect(html).toContain('name="personId" value="p3"');
    expect(html).toContain('action="/register"');
  });
});
