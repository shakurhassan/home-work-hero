import { createServer, type Server } from 'node:http';
import { handle } from './handlers.ts';

export function createApp(): Server {
  return createServer((request, response) => {
    void handle(request, response).catch((error: unknown) => {
      console.error(error);
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Something went wrong\n');
    });
  });
}
