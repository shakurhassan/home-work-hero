export function parseForm(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [name, value] of new URLSearchParams(body)) {
    fields[name] = value;
  }
  return fields;
}
