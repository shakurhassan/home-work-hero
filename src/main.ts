import { createApp } from './web/server.ts';

const PORT = Number(process.env['PORT'] ?? 3000);

createApp().listen(PORT, () => {
  console.log(`home-work-hero listening on http://localhost:${PORT}`);
});
