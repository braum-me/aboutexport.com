/**
 * Minimaler SMTP-Empfänger für E2E-Tests (kein TLS, keine Auth).
 * SMTP auf Port 2525, empfangene Mails als JSON unter http://127.0.0.1:2526/messages.
 */
import http from 'node:http';
import net from 'node:net';

const messages = [];

net
  .createServer((socket) => {
    let buffer = '';
    let inData = false;
    let current = { from: '', to: [], data: '' };
    const reply = (line) => socket.write(`${line}\r\n`);
    reply('220 smtp-sink ready');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let idx;
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            messages.push({ ...current, receivedAt: Date.now() });
            current = { from: '', to: [], data: '' };
            reply('250 OK queued');
          } else {
            current.data += (line.startsWith('..') ? line.slice(1) : line) + '\n';
          }
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') reply('250-smtp-sink\r\n250 8BITMIME');
        else if (cmd === 'MAIL') {
          current.from = line.slice(10).trim();
          reply('250 OK');
        } else if (cmd === 'RCPT') {
          current.to.push(line.slice(8).trim());
          reply('250 OK');
        } else if (cmd === 'DATA') {
          inData = true;
          reply('354 End data with <CR><LF>.<CR><LF>');
        } else if (cmd === 'QUIT') {
          reply('221 Bye');
          socket.end();
        } else if (cmd === 'RSET' || cmd === 'NOOP') reply('250 OK');
        else reply('502 Command not implemented');
      }
    });
    socket.on('error', () => {});
  })
  .listen(2525, '127.0.0.1');

http
  .createServer((req, res) => {
    if (req.url === '/messages' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(messages));
    } else if (req.url === '/messages' && req.method === 'DELETE') {
      messages.length = 0;
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(200);
      res.end('ok');
    }
  })
  .listen(2526, '127.0.0.1');
