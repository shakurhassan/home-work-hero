import { describe, expect, it } from 'vitest';
import { addReviewer, listReviewers, registerStudent, selectActor } from './people.ts';
import { seedState } from './seed.ts';
import { expectOk } from '../test-support.ts';

const ADA = { id: 'p9', name: 'Ada Byron', email: 'ada@example.com' };

describe('registerStudent', () => {
  it('AC1: registering a student adds them to the directory', () => {
    const state = expectOk(registerStudent(seedState(), ADA));

    expect(state.people).toHaveLength(5);
    expect(state.people[4]).toEqual({ ...ADA, isReviewer: false });
  });

  it('AC1: the person just registered can be selected as the actor', () => {
    const state = expectOk(registerStudent(seedState(), ADA));

    expect(selectActor(state, 'p9')).toEqual({ ok: true, value: 'p9' });
  });

  it('AC2: rejects an email already in the directory, whatever its case', () => {
    const state = seedState();

    const result = registerStudent(state, {
      id: 'p9',
      name: 'Other Maya',
      email: '  MAYA@Example.com ',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'EMAIL_TAKEN', message: 'maya@example.com is already in the directory' },
    });
    expect(state).toEqual(seedState());
  });

  it('AC3: rejects a whitespace-only name', () => {
    const state = seedState();

    const result = registerStudent(state, { id: 'p9', name: '   ', email: 'ada@example.com' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'NAME_REQUIRED', message: 'Name is required' },
    });
    expect(state.people).toHaveLength(4);
  });

  it('AC4: rejects a name of 81 characters', () => {
    const result = registerStudent(seedState(), { ...ADA, name: 'a'.repeat(81) });

    expect(result).toEqual({
      ok: false,
      error: { code: 'NAME_TOO_LONG', message: 'Name must be 80 characters or fewer' },
    });
  });

  it('AC4: accepts a name of 80 characters', () => {
    const state = expectOk(registerStudent(seedState(), { ...ADA, name: 'a'.repeat(80) }));

    expect(state.people[4]?.name).toHaveLength(80);
  });

  it('AC5: rejects an email with no dot in the domain', () => {
    const result = registerStudent(seedState(), { ...ADA, email: 'ada@example' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'INVALID_EMAIL', message: 'ada@example is not a valid email address' },
    });
  });

  it('AC5: rejects an email with no @', () => {
    const result = registerStudent(seedState(), { ...ADA, email: 'ada.example.com' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'INVALID_EMAIL', message: 'ada.example.com is not a valid email address' },
    });
  });
});

const ITO = { id: 'p9', name: 'Ms. Ito', email: 'ito@example.com' };

describe('addReviewer', () => {
  it('AC6: appends a new person with isReviewer true', () => {
    const state = expectOk(addReviewer(seedState(), ITO));

    expect(state.people).toHaveLength(5);
    expect(state.people[4]).toEqual({ ...ITO, isReviewer: true });
    expect(state.people.slice(0, 4)).toEqual(seedState().people);
  });

  it('AC7: promotes an existing person instead of duplicating them', () => {
    const state = expectOk(
      addReviewer(seedState(), { id: 'p9', name: 'Tomas A.', email: 'tomas@example.com' }),
    );

    expect(state.people).toHaveLength(4);
    const tomas = state.people.find((person) => person.id === 'p2');
    expect(tomas?.isReviewer).toBe(true);
    expect(tomas?.name).toBe('Tomas Alvarez');
  });

  it('AC8: rejects someone who is already a reviewer', () => {
    const state = seedState();

    const result = addReviewer(state, { id: 'p9', name: 'Mr. O', email: 'okafor@example.com' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'ALREADY_REVIEWER', message: 'Mr. Okafor is already a reviewer' },
    });
    expect(state).toEqual(seedState());
  });

  it('AC5: rejects a malformed reviewer email', () => {
    const result = addReviewer(seedState(), { ...ITO, email: 'ito@example' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'INVALID_EMAIL', message: 'ito@example is not a valid email address' },
    });
  });
});

describe('selectActor', () => {
  it('AC9: returns the id of a known person without touching state', () => {
    const state = seedState();

    expect(selectActor(state, 'p3')).toEqual({ ok: true, value: 'p3' });
    expect(state).toEqual(seedState());
  });

  it('AC10: rejects an unknown person id', () => {
    expect(selectActor(seedState(), 'p99')).toEqual({
      ok: false,
      error: { code: 'PERSON_NOT_FOUND', message: 'No person with id p99' },
    });
  });

  it('AC11: can act as a reviewer added this session', () => {
    const state = expectOk(addReviewer(seedState(), ITO));

    expect(selectActor(state, 'p9')).toEqual({ ok: true, value: 'p9' });
  });
});

describe('listReviewers', () => {
  it('AC12: returns only reviewers, sorted by name', () => {
    const reviewers = listReviewers(seedState());

    expect(reviewers.map((person) => person.id)).toEqual(['p3', 'p4']);
  });

  it('AC12: returns an empty array when nobody is a reviewer', () => {
    const state = seedState();
    const students = { ...state, people: state.people.map((p) => ({ ...p, isReviewer: false })) };

    expect(listReviewers(students)).toEqual([]);
  });
});

describe('immutability', () => {
  it('AC15: registerStudent does not mutate the state it is given', () => {
    const before = seedState();
    const snapshot = structuredClone(before);

    const after = expectOk(registerStudent(before, ADA));

    expect(before).toEqual(snapshot);
    expect(after).not.toBe(before);
  });
});
