import { err, ok, type Result } from './result.ts';
import type { AppState, Person, PersonId } from './types.ts';
import { normalizeEmail, requireEmail, requireName } from './validation.ts';

export interface PersonInput {
  id: PersonId;
  name: string;
  email: string;
}

interface ValidPersonInput {
  name: string;
  email: string;
}

function validate(input: PersonInput): Result<ValidPersonInput> {
  const name = requireName(input.name);
  if (!name.ok) return name;

  const email = requireEmail(input.email);
  if (!email.ok) return email;

  return ok({ name: name.value, email: email.value });
}

function findByEmail(state: AppState, email: string): Person | undefined {
  return state.people.find((person) => normalizeEmail(person.email) === email);
}

function withPerson(state: AppState, person: Person): AppState {
  return { ...state, people: [...state.people, person] };
}

export function registerStudent(state: AppState, input: PersonInput): Result<AppState> {
  const valid = validate(input);
  if (!valid.ok) return valid;

  if (findByEmail(state, valid.value.email) !== undefined) {
    return err('EMAIL_TAKEN', `${valid.value.email} is already in the directory`);
  }

  return ok(withPerson(state, { id: input.id, ...valid.value, isReviewer: false }));
}

export function addReviewer(state: AppState, input: PersonInput): Result<AppState> {
  const valid = validate(input);
  if (!valid.ok) return valid;

  const existing = findByEmail(state, valid.value.email);
  if (existing === undefined) {
    return ok(withPerson(state, { id: input.id, ...valid.value, isReviewer: true }));
  }

  if (existing.isReviewer) {
    return err('ALREADY_REVIEWER', `${existing.name} is already a reviewer`);
  }

  return ok({
    ...state,
    people: state.people.map((person) =>
      person.id === existing.id ? { ...person, isReviewer: true } : person,
    ),
  });
}

export function selectActor(state: AppState, personId: PersonId): Result<PersonId> {
  const person = state.people.find((candidate) => candidate.id === personId);
  if (person === undefined) return err('PERSON_NOT_FOUND', `No person with id ${personId}`);
  return ok(person.id);
}

export function listReviewers(state: AppState): Person[] {
  return state.people
    .filter((person) => person.isReviewer)
    .sort((a, b) => a.name.localeCompare(b.name));
}
