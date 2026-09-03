import { describe, expect, it } from 'vitest';
import { matchRoute } from './router.ts';

describe('matchRoute', () => {
  it('AC5: captures a submission id', () => {
    expect(matchRoute('GET', '/s/s1')).toEqual({ name: 'submission', id: 's1' });
  });

  it('AC5: captures a review post', () => {
    expect(matchRoute('POST', '/s/s1/reviews')).toEqual({ name: 'addReview', id: 's1' });
  });

  it('AC6: does not match an unknown path', () => {
    expect(matchRoute('GET', '/nope')).toBeNull();
  });

  it('AC6: does not match a wrong method', () => {
    expect(matchRoute('DELETE', '/')).toBeNull();
  });
});
