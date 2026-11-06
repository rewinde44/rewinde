import { writeFile } from 'node:fs/promises';
import { privacyContent } from '../public/privacy.js';
await writeFile(new URL('../public/datenschutz.html',import.meta.url),`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'"><title>Datenschutz · Rewinde</title><link rel="stylesheet" href="/privacy.css"></head><body class="privacy-document"><main class="privacy-page"><a href="/">← Zurück zu Rewinde</a><h1>Datenschutzhinweise</h1>${privacyContent}</main></body></html>`);

