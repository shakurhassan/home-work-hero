import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getState, resetStore } from '../store/store.ts';
import { clearSessions } from '../store/sessions.ts';
import { createApp } from './server.ts';

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
});

beforeEach(() => {
  resetStore();
  clearSessions();
});

// Acts as a person the way a browser would: post to /identity, keep the cookie.
async function actAs(personId: string): Promise<string> {
  const response = await fetch(`${origin}/identity`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ personId }).toString(),
    redirect: 'manual',
  });
  const cookie = response.headers.get('set-cookie');
  if (cookie === null) throw new Error('no session cookie was set');
  return cookie.split(';')[0] ?? '';
}

describe('server', () => {
  it('AC15: serves the identity page as HTML', async () => {
    const response = await fetch(`${origin}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await response.text()).toContain('Who are you?');
  });

  it('AC16: a student submits work and is redirected to it', async () => {
    const cookie = await actAs('p1');

    const response = await fetch(`${origin}/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      body: 'question=What+is+a+prime+number%3F&answer=Two+factors&reviewerId=p3',
      redirect: 'manual',
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toMatch(/^\/s\/.+/);
    expect(getState().submissions).toHaveLength(5);
  });

  it("AC17: a rejected command re-renders with the domain's own message", async () => {
    const cookie = await actAs('p1');

    const response = await fetch(`${origin}/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      body: 'question=+++&answer=Two+factors&reviewerId=p3',
      redirect: 'manual',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Question is required');
    expect(getState().submissions).toHaveLength(4);
  });

  it('AC19: a malformed decision is rejected, not crashed', async () => {
    const cookie = await actAs('p3');

    const response = await fetch(`${origin}/s/s1/reviews`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      body: 'decision=FOO&score=50&nextAction=REPEAT&comment=hi',
      redirect: 'manual',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('FOO is not a valid decision');
    expect(getState().submissions[0]?.attempts[0]?.review).toBeNull();
  });

  it('AC19: a malformed next action is rejected, not crashed', async () => {
    const cookie = await actAs('p3');

    const response = await fetch(`${origin}/s/s1/reviews`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
      body: 'decision=NOT_APPROVED&score=50&nextAction=BOGUS&comment=hi',
      redirect: 'manual',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('BOGUS is not a valid next action');
  });

  it('AC22: an unknown submission id is a 404', async () => {
    const cookie = await actAs('p1');

    const response = await fetch(`${origin}/s/s99`, { headers: { cookie } });

    expect(response.status).toBe(404);
    expect(await response.text()).toContain('No such submission');
  });

  it('AC18: an unknown path is a 404', async () => {
    const response = await fetch(`${origin}/nope`);

    expect(response.status).toBe(404);
  });
});
