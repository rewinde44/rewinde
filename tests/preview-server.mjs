// Separate browser origin for disposable QA data. No server-side storage.
import { createApp } from '../server.mjs';
const server = await createApp();
server.listen(4174,'127.0.0.1',()=>console.log('Isolierter Browsertest: http://127.0.0.1:4174'));
