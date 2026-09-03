import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies.ts';
import { parseForm } from './form.ts';
import { escapeHtml } from './html.ts';

describe('parseForm', () => {
  it('AC7: decodes the fields of a form body', () => {
    expect(parseForm('question=Why+ice%3F&answer=Less+dense&reviewerId=p3')).toEqual({
      question: 'Why ice?',
      answer: 'Less dense',
      reviewerId: 'p3',
    });
  });

  it('AC7: returns no fields for an empty body', () => {
    expect(parseForm('')).toEqual({});
  });
});

describe('escapeHtml', () => {
  it('AC8: escapes the five HTML special characters', () => {
    expect(escapeHtml('<b>"Tom" & \'Jo\'</b>')).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jo&#39;&lt;/b&gt;',
    );
  });
});

describe('readCookie', () => {
  it('AC3: finds the named cookie', () => {
    expect(readCookie('hwh_sid=abc123; theme=dark', 'hwh_sid')).toBe('abc123');
  });

  it('AC3: returns null when the cookie is absent', () => {
    expect(readCookie('theme=dark', 'hwh_sid')).toBeNull();
  });

  it('AC3: returns null when there is no header', () => {
    expect(readCookie(undefined, 'hwh_sid')).toBeNull();
  });
});
