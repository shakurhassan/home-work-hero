import { listReviewers } from '../domain/people.ts';
import { assignmentsFor, draftAnswerFor, isLocked, queueForReviewer } from '../domain/queries.ts';
import type {
  AppState,
  Attempt,
  PersonId,
  Submission,
  SubmissionStatus,
} from '../domain/types.ts';
import { escapeHtml, layout } from './html.ts';

export function identityPage(state: AppState, error?: string): string {
  const people = state.people
    .map(
      (person) => `<li>
      <form method="post" action="/identity">
        <input type="hidden" name="personId" value="${escapeHtml(person.id)}">
        <strong>${escapeHtml(person.name)}</strong>
        ${person.isReviewer ? '<span class="chip">reviewer</span>' : ''}
        <div class="muted">${escapeHtml(person.email)}</div>
        <button>Act as ${escapeHtml(person.name)}</button>
      </form>
    </li>`,
    )
    .join('');

  return layout(
    'Who are you?',
    '<strong>Home Work Hero</strong>',
    `<h1>Who are you?</h1>
    <p class="muted">Pick someone to act as. Nothing here is a real account.</p>
    ${error === undefined ? '' : `<p class="error">${escapeHtml(error)}</p>`}
    <ul>${people}</ul>
    <h2>Someone else</h2>
    <form method="post" action="/register">
      <label for="name">Name</label>
      <input type="text" id="name" name="name" required>
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
      <button>Register and continue</button>
    </form>`,
  );
}

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  ASSIGNED: 'assigned',
  AWAITING_REVIEW: 'awaiting review',
  NEEDS_REVISION: 'needs revision',
  CLOSED: 'closed',
};

function personName(state: AppState, id: PersonId): string {
  return state.people.find((person) => person.id === id)?.name ?? id;
}

function actorHeader(state: AppState, actorId: PersonId): string {
  return `<span>Acting as <strong>${escapeHtml(personName(state, actorId))}</strong></span>
    <a href="/">switch</a>`;
}

function submissionRow(submission: Submission, note: string): string {
  return `<li>
    <a href="/s/${escapeHtml(submission.id)}">${escapeHtml(submission.question)}</a>
    <div class="muted">
      <span class="chip">${STATUS_LABEL[submission.status]}</span> ${escapeHtml(note)}
    </div>
  </li>`;
}

function lastScore(submission: Submission): string {
  const review = submission.attempts.at(-1)?.review;
  return review === null || review === undefined ? '' : ` — score ${review.score} / 100`;
}

export function homePage(state: AppState, actorId: PersonId): string {
  const actor = state.people.find((person) => person.id === actorId);
  const waiting = assignmentsFor(state, actorId);
  const queue = actor?.isReviewer === true ? queueForReviewer(state, actorId) : [];
  const mine = state.submissions.filter(
    (submission) => submission.studentId === actorId || submission.reviewerId === actorId,
  );

  const waitingList =
    waiting.length === 0
      ? '<p class="muted">Nothing waiting on you.</p>'
      : `<ul>${waiting
          .map((submission) =>
            submissionRow(
              submission,
              `for ${personName(state, submission.reviewerId)}${lastScore(submission)}`,
            ),
          )
          .join('')}</ul>`;

  const queueSection =
    actor?.isReviewer === true
      ? `<h2>To review</h2>
      ${
        queue.length === 0
          ? '<p class="muted">Your review queue is empty.</p>'
          : `<ul>${queue
              .map((submission) =>
                submissionRow(
                  submission,
                  `from ${personName(state, submission.studentId)} — attempt ${submission.attempts.length}`,
                ),
              )
              .join('')}</ul>`
      }`
      : '';

  return layout(
    'Home',
    actorHeader(state, actorId),
    `<h1>Home</h1>
    <p>
      <a href="/new"><button>Ask for a review</button></a>
      ${actor?.isReviewer === true ? '<a href="/assign"><button class="secondary">Assign work</button></a>' : ''}
    </p>
    <h2>Waiting on you</h2>
    ${waitingList}
    ${queueSection}
    <h2>All my work</h2>
    <ul>${mine
      .map((submission) =>
        submissionRow(submission, `${personName(state, submission.studentId)} → ${personName(state, submission.reviewerId)}`),
      )
      .join('')}</ul>`,
  );
}

export function newSubmissionPage(
  state: AppState,
  actorId: PersonId,
  error?: string,
  values: Record<string, string> = {},
): string {
  const options = listReviewers(state)
    .filter((person) => person.id !== actorId)
    .map(
      (person) =>
        `<option value="${escapeHtml(person.id)}"${values['reviewerId'] === person.id ? ' selected' : ''}>${escapeHtml(person.name)}</option>`,
    )
    .join('');

  return layout(
    'Ask for a review',
    actorHeader(state, actorId),
    `<p><a href="/home">← Home</a></p>
    <h1>Ask for a review</h1>
    ${error === undefined ? '' : `<p class="error">${escapeHtml(error)}</p>`}
    <form method="post" action="/submissions">
      <label for="question">Question</label>
      <textarea id="question" name="question" required>${escapeHtml(values['question'] ?? '')}</textarea>
      <label for="answer">Your answer</label>
      <textarea id="answer" name="answer" required>${escapeHtml(values['answer'] ?? '')}</textarea>
      <label for="reviewerId">Reviewer</label>
      <select id="reviewerId" name="reviewerId" required>${options}</select>
      <button>Ask for a review</button>
    </form>
    <details>
      <summary>Reviewer not listed?</summary>
      <form method="post" action="/reviewers">
        <label for="rname">Name</label>
        <input type="text" id="rname" name="name" required>
        <label for="remail">Email</label>
        <input type="email" id="remail" name="email" required>
        <button class="secondary">Add reviewer</button>
      </form>
    </details>`,
  );
}

export function assignPage(
  state: AppState,
  actorId: PersonId,
  error?: string,
  values: Record<string, string> = {},
): string {
  const students = state.people
    .filter((person) => person.id !== actorId)
    .map(
      (person) =>
        `<option value="${escapeHtml(person.id)}"${values['studentId'] === person.id ? ' selected' : ''}>${escapeHtml(person.name)}</option>`,
    )
    .join('');

  return layout(
    'Assign work',
    actorHeader(state, actorId),
    `<p><a href="/home">← Home</a></p>
    <h1>Assign work</h1>
    ${error === undefined ? '' : `<p class="error">${escapeHtml(error)}</p>`}
    <form method="post" action="/assignments">
      <label for="studentId">Student</label>
      <select id="studentId" name="studentId" required>${students}</select>
      <label for="question">Question</label>
      <textarea id="question" name="question" required>${escapeHtml(values['question'] ?? '')}</textarea>
      <button>Assign</button>
    </form>`,
  );
}

function attemptCard(state: AppState, attempt: Attempt, index: number): string {
  const review = attempt.review;
  const verdict =
    review === null
      ? '<p class="muted">Waiting for a review.</p>'
      : `<div class="verdict">
        <div><span class="score">${review.score} / 100</span> ·
          ${escapeHtml(review.decision)} · next action: <strong>${escapeHtml(review.nextAction)}</strong></div>
        <div>${escapeHtml(review.comment)}</div>
        <div class="muted">${escapeHtml(personName(state, review.reviewerId))} ·
          ${escapeHtml(review.reviewedAt.slice(0, 10))}</div>
      </div>`;

  return `<div class="attempt">
    <div class="muted">Attempt ${index + 1} · ${escapeHtml(attempt.submittedAt.slice(0, 10))}</div>
    <p>${escapeHtml(attempt.answer)}</p>
    ${verdict}
  </div>`;
}

function answerPanel(submission: Submission, draft: string): string {
  return `<h2>Your answer</h2>
    <form method="post" action="/s/${escapeHtml(submission.id)}/attempts">
      <label for="answer">Answer</label>
      <textarea id="answer" name="answer" required>${escapeHtml(draft)}</textarea>
      <button>Send for review</button>
    </form>`;
}

// A rejected command re-renders this form, so it keeps what was typed.
function reviewPanel(submission: Submission, values: Record<string, string>): string {
  const checked = (name: string, value: string): string =>
    values[name] === value ? ' checked' : '';

  const actions = ['CONTINUE', 'REPEAT', 'CORRECT', 'DONE']
    .map(
      (action) =>
        `<label><input type="radio" name="nextAction" value="${action}"${checked('nextAction', action)} required> ${action}</label>`,
    )
    .join('');

  return `<h2>Your review</h2>
    <form method="post" action="/s/${escapeHtml(submission.id)}/reviews">
      <fieldset>
        <label><input type="radio" name="decision" value="APPROVED"${checked('decision', 'APPROVED')} required> Approved</label>
        <label><input type="radio" name="decision" value="NOT_APPROVED"${checked('decision', 'NOT_APPROVED')} required> Not approved</label>
      </fieldset>
      <label for="score">Score (0–100)</label>
      <input type="number" id="score" name="score" min="0" max="100" step="1" value="${escapeHtml(values['score'] ?? '')}" required>
      <fieldset>${actions}</fieldset>
      <label for="comment">Comment</label>
      <textarea id="comment" name="comment" required>${escapeHtml(values['comment'] ?? '')}</textarea>
      <button>Send review</button>
    </form>`;
}

export function submissionPage(
  state: AppState,
  actorId: PersonId,
  submissionId: string,
  error?: string,
  values: Record<string, string> = {},
): string {
  const submission = state.submissions.find((candidate) => candidate.id === submissionId);
  if (submission === undefined) {
    return layout('Not found', actorHeader(state, actorId), '<h1>No such submission</h1>');
  }

  const isStudent = submission.studentId === actorId;
  const isReviewer = submission.reviewerId === actorId;

  // A submission closed with CONTINUE is accepted but not locked, so the
  // student may still improve it (review-loop AC7, ui-ux panel table).
  const studentMayAnswer =
    submission.status === 'ASSIGNED' ||
    submission.status === 'NEEDS_REVISION' ||
    (submission.status === 'CLOSED' && !isLocked(submission));

  let panel = '';
  if (isStudent && studentMayAnswer) {
    panel = answerPanel(submission, values['answer'] ?? draftAnswerFor(state, submission.id));
  } else if (isReviewer && submission.status === 'AWAITING_REVIEW') {
    panel = reviewPanel(submission, values);
  } else if (submission.status === 'CLOSED' && isLocked(submission)) {
    panel = '<p class="muted">Closed — no further attempts.</p>';
  }

  return layout(
    'Submission',
    actorHeader(state, actorId),
    `<p><a href="/home">← Home</a></p>
    <h1>${escapeHtml(submission.question)}</h1>
    <p class="muted">
      <span class="chip">${STATUS_LABEL[submission.status]}</span>
      ${escapeHtml(personName(state, submission.studentId))} →
      ${escapeHtml(personName(state, submission.reviewerId))}
    </p>
    ${error === undefined ? '' : `<p class="error">${escapeHtml(error)}</p>`}
    <h2>Attempts</h2>
    ${submission.attempts.map((attempt, index) => attemptCard(state, attempt, index)).join('')}
    ${submission.attempts.length === 0 ? '<p class="muted">No answer yet.</p>' : ''}
    ${panel}`,
  );
}
