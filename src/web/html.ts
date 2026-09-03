const STYLE = `
  :root { --ink:#1a1a1a; --paper:#fff; --muted:#666; --line:#e3e3e3;
          --accent:#2f5bd7; --card:#f6f6f7; --verdict:#eef3ff; }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#e9e9e9; --paper:#16171a; --muted:#9a9a9a; --line:#2c2e33;
            --accent:#7fa0ff; --card:#1e2025; --verdict:#1b2438; }
  }
  * { box-sizing:border-box }
  body { margin:0; background:var(--paper); color:var(--ink); line-height:1.55;
         font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif }
  main { max-width:40rem; margin:0 auto; padding:1.5rem 1.25rem 4rem }
  header { border-bottom:1px solid var(--line); padding:.75rem 1.25rem;
           display:flex; justify-content:space-between; gap:1rem; align-items:baseline }
  header a { color:var(--accent) }
  h1 { font-size:1.4rem; margin:1.25rem 0 .5rem }
  h2 { font-size:1.05rem; margin:2rem 0 .5rem; color:var(--muted);
       text-transform:uppercase; letter-spacing:.06em }
  ul { list-style:none; padding:0; margin:0 }
  li { border:1px solid var(--line); border-radius:.5rem; padding:.75rem .9rem;
       margin:.5rem 0; background:var(--card) }
  a { color:inherit }
  .chip { display:inline-block; font-size:.75rem; padding:.1rem .5rem; border-radius:1rem;
          background:var(--paper); border:1px solid var(--line); color:var(--muted) }
  .muted { color:var(--muted); font-size:.9rem }
  .attempt { border:1px solid var(--line); border-radius:.5rem; padding:.9rem;
             margin:.75rem 0; background:var(--card) }
  .verdict { background:var(--verdict); border-radius:.4rem; padding:.6rem .8rem; margin-top:.6rem }
  .score { font-weight:700 }
  .error { border:1px solid #d33; background:#fdecec; color:#a11; padding:.7rem .9rem;
           border-radius:.5rem; margin:1rem 0 }
  @media (prefers-color-scheme: dark) { .error { background:#3a1d1d; color:#ffb4b4 } }
  label { display:block; margin:.75rem 0 .25rem; font-weight:600; font-size:.95rem }
  input[type=text], input[type=email], input[type=number], textarea, select {
    width:100%; padding:.5rem .6rem; border:1px solid var(--line); border-radius:.4rem;
    background:var(--paper); color:var(--ink); font:inherit }
  textarea { min-height:6rem }
  button { font:inherit; padding:.5rem .9rem; border-radius:.4rem; border:1px solid var(--accent);
           background:var(--accent); color:#fff; cursor:pointer; margin-top:.75rem }
  button.secondary { background:transparent; color:var(--accent) }
  fieldset { border:1px solid var(--line); border-radius:.5rem; margin:1rem 0 }
`;

export function layout(title: string, header: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Home Work Hero</title>
<style>${STYLE}</style></head>
<body><header>${header}</header><main>${body}</main></body></html>`;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}
