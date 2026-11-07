// DocuMind AI - backend test runner (Part 2, 3 and 4)
//
// Usage (from the backend folder, with `npm run start:dev` running in another terminal):
//   node run-tests.mjs              -> runs everything (uses your OpenRouter credits)
//   node run-tests.mjs --skip-ai    -> skips every test that calls the AI model
//
// Optional: API_URL=http://localhost:4000/api node run-tests.mjs
//
// It creates two throw-away users, uploads the files from ./test-files,
// and deletes the documents it created at the end.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const SKIP_AI = process.argv.includes('--skip-ai');
const FILES = join(dirname(fileURLToPath(import.meta.url)), 'test-files');
const PASSWORD = 'Test12345';
const RUN_ID = Date.now();

// ---------------------------------------------------------------- helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
let failed = 0;
const failures = [];

function short(value, max = 500) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s && s.length > max ? `${s.slice(0, max)}...` : s;
}

function check(name, ok, info = '') {
  if (ok) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  [FAIL] ${name}${info ? `\n         -> ${info}` : ''}`);
  }
  return ok;
}

const section = (title) => console.log(`\n=== ${title} ===`);
const note = (text) => console.log(`  ...    ${text}`);

class Client {
  constructor(label) {
    this.label = label;
    this.cookie = '';
  }

  async request(method, path, body) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(this.cookie ? { cookie: this.cookie } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      for (const c of res.headers.getSetCookie()) {
        const pair = c.split(';')[0];
        if (pair.startsWith('documind_token=')) {
          this.cookie = pair === 'documind_token=' ? '' : pair;
        }
      }

      if (res.status === 429 && attempt < 2) {
        note(`rate limited on ${method} ${path}, waiting 62s and retrying`);
        await sleep(62_000);
        continue;
      }

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: res.status, body: json };
    }
  }

  get(path) {
    return this.request('GET', path);
  }
  post(path, body = {}) {
    return this.request('POST', path, body);
  }
  patch(path, body) {
    return this.request('PATCH', path, body);
  }
  del(path) {
    return this.request('DELETE', path);
  }
}

/** Same steps the browser will use: signature -> direct Cloudinary upload -> confirm. */
async function upload(client, fileName, buffer, declaredSize = buffer.length) {
  const sig = await client.post('/documents/upload-signature', {
    fileName,
    fileSize: declaredSize,
  });
  if (sig.status !== 200) return { stage: 'signature', res: sig };

  const s = sig.body;
  const form = new FormData();
  form.append('file', new Blob([buffer]), fileName);
  form.append('api_key', s.apiKey);
  form.append('timestamp', String(s.timestamp));
  form.append('signature', s.signature);
  form.append('public_id', s.publicId);

  const up = await fetch(s.uploadUrl, { method: 'POST', body: form });
  if (!up.ok) {
    return { stage: 'cloudinary', res: { status: up.status, body: await up.text() } };
  }

  const res = await client.post('/documents/confirm', {
    publicId: s.publicId,
    originalName: fileName,
  });
  return { stage: 'confirm', res, publicId: s.publicId };
}

async function expectUpload(client, label, fileName, buffer, expectedType) {
  const r = await upload(client, fileName, buffer);
  const ok = r.stage === 'confirm' && r.res.status === 201;
  check(
    `${label}: upload + confirm returns 201`,
    ok,
    `stage=${r.stage} status=${r.res.status} ${short(r.res.body)}`,
  );
  if (!ok) {
    if (/PDF and ZIP/i.test(short(r.res.body, 2000))) {
      note('HINT: Cloudinary -> Settings -> Security -> enable "PDF and ZIP files delivery"');
    }
    return null;
  }
  const doc = r.res.body.document;
  check(`${label}: fileType is ${expectedType}`, doc.fileType === expectedType, doc.fileType);
  check(`${label}: wordCount > 0`, doc.wordCount > 0, String(doc.wordCount));
  check(
    `${label}: no warnings`,
    Array.isArray(r.res.body.warnings) && r.res.body.warnings.length === 0,
    short(r.res.body.warnings),
  );
  return { ...doc, publicId: r.publicId };
}

async function expectReject(client, label, fileName, buffer, declaredSize, pattern) {
  const r = await upload(client, fileName, buffer, declaredSize);
  const text = short(r.res.body, 1000);
  check(
    `${label}: rejected with 400`,
    r.stage === 'confirm' && r.res.status === 400,
    `stage=${r.stage} status=${r.res.status} ${text}`,
  );
  check(`${label}: message matches ${pattern}`, pattern.test(text), text);
  note(`server said: ${short(r.res.body?.message ?? r.res.body, 160)}`);
}

// ---------------------------------------------------------------- run

const A = new Client('A');
const B = new Client('B');
const created = []; // documents created by user A (for cleanup)
const analysisIds = [];

try {
  // ------------------------------------------------------------ 1. auth gate
  section('1. Auth and access control');

  const health = await new Client('anon').get('/health');
  check('GET /health is public and DB is up', health.status === 200 && health.body.database === 'up', short(health.body));

  const anon = new Client('anon');
  check('GET /documents without login -> 401', (await anon.get('/documents')).status === 401);
  check('GET /analyses without login -> 401', (await anon.get('/analyses')).status === 401);
  check('POST analyze without login -> 401', (await anon.post('/documents/x/analyze', { instruction: 'hello' })).status === 401);

  const emailA = `tester.a+${RUN_ID}@example.com`;
  const emailB = `tester.b+${RUN_ID}@example.com`;
  const regA = await A.post('/auth/register', { name: 'Tester A', email: emailA, password: PASSWORD });
  check('register user A -> 201 and cookie set', regA.status === 201 && A.cookie !== '', short(regA.body));
  check('register response has no password field', !JSON.stringify(regA.body).includes('password'));
  const regB = await B.post('/auth/register', { name: 'Tester B', email: emailB, password: PASSWORD });
  check('register user B -> 201', regB.status === 201, short(regB.body));

  const me = await A.get('/auth/me');
  check('GET /auth/me -> 200', me.status === 200 && me.body.user?.email === emailA, short(me.body));
  const badLogin = await new Client('x').post('/auth/login', { email: emailA, password: 'WrongPass1' });
  check('wrong password -> 401', badLogin.status === 401, short(badLogin.body));
  const dup = await new Client('x').post('/auth/register', { name: 'Dup', email: emailA, password: PASSWORD });
  check('duplicate email -> 409', dup.status === 409, short(dup.body));
  const weak = await new Client('x').post('/auth/register', { name: 'A', email: 'bad', password: '123' });
  check('weak input -> 400 with errors list', weak.status === 400 && Array.isArray(weak.body.errors), short(weak.body));

  const userIdA = regA.body.user?.id;
  note(`user A id: ${userIdA} (its Cloudinary files live under documind/${userIdA}/)`);

  // ------------------------------------------------------------ 2. signature validation
  section('2. Upload signature validation');

  const png = await A.post('/documents/upload-signature', { fileName: 'photo.png', fileSize: 1000 });
  check('.png rejected -> 400', png.status === 400, short(png.body));
  const oldDoc = await A.post('/documents/upload-signature', { fileName: 'old.doc', fileSize: 1000 });
  check('.doc rejected -> 400', oldDoc.status === 400, short(oldDoc.body));
  const bigSig = await A.post('/documents/upload-signature', { fileName: 'big.pdf', fileSize: 6 * 1024 * 1024 });
  check('6 MB declared size rejected -> 400', bigSig.status === 400, short(bigSig.body));
  const okSig = await A.post('/documents/upload-signature', { fileName: 'ok.txt', fileSize: 100 });
  check(
    'valid request returns signature + publicId',
    okSig.status === 200 && okSig.body.signature && okSig.body.publicId?.startsWith('documind/') && okSig.body.publicId.endsWith('.txt'),
    short(okSig.body),
  );
  check('API secret is not leaked in the signature response', !JSON.stringify(okSig.body).toLowerCase().includes('secret'));

  // ------------------------------------------------------------ 3. positive uploads
  section('3. Upload valid files (txt, pdf, docx, Bangla txt)');

  const txtBuf = await readFile(join(FILES, 'sample.txt'));
  const pdfBuf = await readFile(join(FILES, 'sample.pdf'));
  const docxBuf = await readFile(join(FILES, 'sample.docx'));
  const bnBuf = await readFile(join(FILES, 'bangla-sample.txt'));

  const docTxt = await expectUpload(A, 'sample.txt', 'sample.txt', txtBuf, 'TXT');
  const docPdf = await expectUpload(A, 'sample.pdf', 'sample.pdf', pdfBuf, 'PDF');
  const docDocx = await expectUpload(A, 'sample.docx', 'sample.docx', docxBuf, 'DOCX');
  const docBn = await expectUpload(A, 'bangla-sample.txt', 'bangla-sample.txt', bnBuf, 'TXT');
  for (const d of [docTxt, docPdf, docDocx, docBn]) if (d) created.push(d);

  if (!docTxt) throw new Error('sample.txt upload failed, cannot continue (see failures above).');

  // ------------------------------------------------------------ 4. rejected uploads
  section('4. Files that must be rejected at confirm');

  const scanned = await readFile(join(FILES, 'scanned.pdf'));
  await expectReject(A, 'scanned.pdf (image only)', 'scanned.pdf', scanned, scanned.length, /No readable text/i);

  const locked = await readFile(join(FILES, 'locked.pdf'));
  await expectReject(A, 'locked.pdf (password protected)', 'locked.pdf', locked, locked.length, /password/i);

  const fake = Buffer.from('This is plain text pretending to be a PDF file.\n'.repeat(5));
  await expectReject(A, 'fake.pdf (text renamed to .pdf)', 'fake.pdf', fake, fake.length, /does not match/i);

  const big = Buffer.from('This line makes the file bigger than five megabytes. '.repeat(120_000));
  note(`big file is ${(big.length / 1024 / 1024).toFixed(1)} MB, but we claim it is 1 KB`);
  await expectReject(A, 'oversized file with a lying size', 'liar.txt', big, 1000, /5 MB/i);

  const sigA = await A.post('/documents/upload-signature', { fileName: 'steal.txt', fileSize: 50 });
  const steal = await B.post('/documents/confirm', { publicId: sigA.body.publicId, originalName: 'steal.txt' });
  check("user B cannot confirm user A's upload reference -> 400", steal.status === 400, short(steal.body));
  const forged = await A.post('/documents/confirm', { publicId: 'documind/someone-else/00000000-0000-0000-0000-000000000000.txt', originalName: 'x.txt' });
  check('forged publicId -> 400', forged.status === 400, short(forged.body));
  const again = await A.post('/documents/confirm', { publicId: docTxt.publicId, originalName: 'sample.txt' });
  check('confirming the same upload twice -> 409', again.status === 409, short(again.body));

  // ------------------------------------------------------------ 5. document management
  section('5. List, search, filter, details');

  const list = await A.get('/documents');
  check(`list returns all ${created.length} documents`, list.status === 200 && list.body.total === created.length, `total=${list.body?.total}`);
  check('list does not include extractedText', !JSON.stringify(list.body).includes('Kickoff'));

  const pdfOnly = await A.get('/documents?type=PDF');
  check('type=PDF filter', pdfOnly.body.items.length >= 1 && pdfOnly.body.items.every((d) => d.fileType === 'PDF'), short(pdfOnly.body));
  const bnSearch = await A.get('/documents?search=BANGLA');
  check('search is case-insensitive', bnSearch.body.items.length === 1 && bnSearch.body.items[0].originalName === 'bangla-sample.txt', short(bnSearch.body));
  const none = await A.get('/documents?search=zzzz-nothing');
  check('search with no match returns empty list', none.body.items.length === 0 && none.body.total === 0);
  const page2 = await A.get('/documents?limit=2&page=2');
  check('pagination: page 2 of limit 2', page2.body.page === 2 && page2.body.items.length === 2 && page2.body.totalPages === 2, short(page2.body));
  check('limit=500 rejected -> 400', (await A.get('/documents?limit=500')).status === 400);

  for (const [label, doc] of [['TXT', docTxt], ['PDF', docPdf], ['DOCX', docDocx]]) {
    if (!doc) continue;
    const d = await A.get(`/documents/${doc.id}`);
    const preview = d.body.document?.textPreview ?? '';
    check(`${label} detail: text extracted correctly`, d.status === 200 && preview.includes('Project Aurora') && preview.includes('BrightPath'), short(preview, 200));
    check(`${label} detail: no PDF page markers in text`, !/-- \d+ of \d+ --/.test(preview));
  }
  if (docBn) {
    const d = await A.get(`/documents/${docBn.id}`);
    const preview = d.body.document?.textPreview ?? '';
    check('Bangla detail: Bangla text preserved', preview.includes('প্রকল্প') && preview.includes('অরোরা'), short(preview, 200));
  }

  section('6. Rename, download, ownership');

  const renamed = await A.patch(`/documents/${docTxt.id}`, { name: 'Aurora Minutes (renamed)' });
  check('rename -> 200', renamed.status === 200 && renamed.body.document?.originalName === 'Aurora Minutes (renamed)', short(renamed.body));
  check('rename with slash -> 400', (await A.patch(`/documents/${docTxt.id}`, { name: 'a/b' })).status === 400);
  check('rename with empty name -> 400', (await A.patch(`/documents/${docTxt.id}`, { name: '   ' })).status === 400);

  const dl = await A.get(`/documents/${docTxt.id}/download`);
  check('download returns url + file name with .txt extension', dl.status === 200 && dl.body.fileName === 'Aurora Minutes (renamed).txt' && dl.body.url?.startsWith('https://'), short(dl.body));

  for (const [label, doc] of [['TXT', docTxt], ['PDF', docPdf], ['DOCX', docDocx]]) {
    if (!doc) continue;
    const info = await A.get(`/documents/${doc.id}/download`);
    const fileRes = await fetch(info.body.url);
    const size = (await fileRes.arrayBuffer()).byteLength;
    check(`${label}: Cloudinary URL is reachable from a plain request`, fileRes.status === 200 && size > 0, `status=${fileRes.status} bytes=${size}`);
  }

  const aList = await A.get('/documents');
  check('user A sees own documents', aList.body.total === created.length);
  const bList = await B.get('/documents');
  check('user B sees 0 documents', bList.status === 200 && bList.body.total === 0, short(bList.body));
  check("B cannot read A's document -> 404", (await B.get(`/documents/${docTxt.id}`)).status === 404);
  check("B cannot rename A's document -> 404", (await B.patch(`/documents/${docTxt.id}`, { name: 'hacked' })).status === 404);
  check("B cannot download A's document -> 404", (await B.get(`/documents/${docTxt.id}/download`)).status === 404);
  check("B cannot delete A's document -> 404", (await B.del(`/documents/${docTxt.id}`)).status === 404);
  check("B cannot analyze A's document -> 404", (await B.post(`/documents/${docTxt.id}/analyze`, { instruction: 'Summarize this document' })).status === 404);
  check("B cannot run detect-task on A's document -> 404", (await B.post(`/documents/${docTxt.id}/detect-task`, { instruction: 'Summarize this document' })).status === 404);
  check('analyze: too short instruction -> 400', (await A.post(`/documents/${docTxt.id}/analyze`, { instruction: 'hi' })).status === 400);
  check('analyze: unknown task name -> 400', (await A.post(`/documents/${docTxt.id}/analyze`, { instruction: 'Summarize', tasks: ['HACK'] })).status === 400);

  // ------------------------------------------------------------ 7. AI
  if (SKIP_AI) {
    section('7-9. AI tests skipped (--skip-ai)');
  } else {
    section('7. AI task detection');

    const detect = async (instruction) => A.post(`/documents/${docTxt.id}/detect-task`, { instruction });

    const d1 = await detect('Give me a short summary and list all important dates');
    check(
      'summary + dates -> SUMMARIZE and EXTRACT_DATA, no fallback',
      d1.status === 200 && d1.body.tasks?.includes('SUMMARIZE') && d1.body.tasks?.includes('EXTRACT_DATA') && d1.body.usedFallback === false,
      `${short(d1.body)} (model-dependent)`,
    );
    const d2 = await detect('Translate this into Bangla');
    check(
      'translate -> TRANSLATE with a Bengali target language',
      d2.status === 200 && d2.body.tasks?.includes('TRANSLATE') && /beng|bangla/i.test(d2.body.targetLanguage ?? ''),
      `${short(d2.body)} (model-dependent)`,
    );
    const d3 = await detect('asdf hmm what');
    check(
      'unclear instruction -> fallback DOCUMENT_QA',
      d3.status === 200 && d3.body.usedFallback === true && d3.body.tasks?.[0] === 'DOCUMENT_QA',
      `${short(d3.body)} (model-dependent)`,
    );

    section('8. AI analysis (all 7 workflows on sample.txt)');

    const runAnalysis = async (label, docId, instruction, expectTask, verify) => {
      const res = await A.post(`/documents/${docId}/analyze`, { instruction });
      const ok = res.status === 201;
      check(`${label}: analyze returns 201`, ok, `status=${res.status} ${short(res.body)}`);
      if (!ok) return null;
      const a = res.body.analysis;
      analysisIds.push(a.id);
      note(`instruction "${instruction}" -> tasks: ${a.detectedTasks.join(', ')}${a.usedFallback ? ' (fallback)' : ''}`);
      if (expectTask) {
        check(`${label}: detected ${expectTask}`, a.detectedTasks.includes(expectTask), `got ${a.detectedTasks.join(', ')} (model-dependent)`);
      }
      const sec = a.result.sections.find((s) => s.task === expectTask) ?? a.result.sections[0];
      if (verify && sec) {
        let good = false;
        try {
          good = !sec.error && Boolean(verify(sec.data, a));
        } catch {
          good = false;
        }
        check(`${label}: result has the expected shape and content`, good, short(sec, 700));
      }
      return a;
    };

    await runAnalysis('SUMMARIZE', docTxt.id, 'Summarize this document.', 'SUMMARIZE', (d) => typeof d.overview === 'string' && d.overview.length > 20);
    await runAnalysis('KEY POINTS', docTxt.id, 'Find the important points.', 'EXTRACT_KEY_POINTS', (d) => d.points.length >= 3);
    await runAnalysis('Q&A (answer exists)', docTxt.id, 'Who is responsible for setting up the CI pipeline?', 'DOCUMENT_QA', (d) => d.found === true && /nusrat/i.test(d.answer));
    await runAnalysis('Q&A (answer missing)', docTxt.id, "What is the CEO's favorite color according to this document?", 'DOCUMENT_QA', (d) => d.found === false);
    await runAnalysis('EXTRACT DATA', docTxt.id, 'Extract all dates and names.', 'EXTRACT_DATA', (d) => d.dates.length >= 5 && d.people.some((p) => /rahim/i.test(p)));
    await runAnalysis('SIMPLIFY', docTxt.id, 'Explain this in simple English.', 'SIMPLIFY', (d) => typeof d.simplified === 'string' && d.simplified.length > 40);
    await runAnalysis('TRANSLATE (Bangla)', docTxt.id, 'Translate this into Bangla.', 'TRANSLATE', (d) => /[\u0980-\u09FF]/.test(d.translation));
    await runAnalysis('ACTION ITEMS', docTxt.id, 'Find the action items.', 'EXTRACT_ACTION_ITEMS', (d) => d.items.length >= 4 && d.items.some((i) => /nusrat/i.test(i.responsible ?? '') && /19 March/i.test(i.deadline ?? '')));

    const multi = await runAnalysis('MULTI-TASK', docTxt.id, 'Give me a short summary and list all important dates', null, null);
    if (multi) check('MULTI-TASK: result has 2 or more sections', multi.result.sections.length >= 2, short(multi.result));

    const fb = await runAnalysis('FALLBACK', docTxt.id, 'asdf hmm what', null, null);
    if (fb) {
      check('FALLBACK: usedFallback is true and a notice is attached', fb.usedFallback === true && fb.result.notes.length >= 1, short(fb));
    }

    section('8b. AI on other file types');

    if (docPdf) await runAnalysis('PDF', docPdf.id, 'Summarize this document.', 'SUMMARIZE', (d) => /aurora/i.test(JSON.stringify(d)));
    if (docDocx) await runAnalysis('DOCX', docDocx.id, 'Summarize this document.', 'SUMMARIZE', (d) => /aurora/i.test(JSON.stringify(d)));
    if (docBn) {
      await runAnalysis('BANGLA doc -> English summary', docBn.id, 'Summarize this document in English.', 'SUMMARIZE', (d) => /aurora/i.test(JSON.stringify(d)));
      await runAnalysis('BANGLA doc -> translate to English', docBn.id, 'Translate this into English.', 'TRANSLATE', (d) => /aurora/i.test(d.translation) && /[A-Za-z]{4}/.test(d.translation));
    }

    section('9. Analysis history');

    const hist = await A.get('/analyses');
    check('history lists all analyses', hist.status === 200 && hist.body.total >= analysisIds.length, `total=${hist.body?.total} expected>=${analysisIds.length}`);
    check('history items have instruction, tasks, document name and no result', hist.body.items?.length > 0 && hist.body.items.every((i) => i.originalInstruction && Array.isArray(i.detectedTasks) && i.document?.originalName && !('result' in i)), short(hist.body.items?.[0]));
    const byDoc = await A.get(`/analyses?documentId=${docTxt.id}`);
    check('history filtered by document', byDoc.body.items.length > 0 && byDoc.body.items.every((i) => i.documentId === docTxt.id));
    const detail = await A.get(`/documents/${docTxt.id}`);
    check('document detail shows analysis count', detail.body.document?._count?.analyses >= 1, short(detail.body.document?._count));

    const firstId = analysisIds[0];
    if (firstId) {
      const one = await A.get(`/analyses/${firstId}`);
      check('open one analysis -> has result.sections', one.status === 200 && Array.isArray(one.body.analysis?.result?.sections), short(one.body));
      check("B cannot open A's analysis -> 404", (await B.get(`/analyses/${firstId}`)).status === 404);
      check("B cannot delete A's analysis -> 404", (await B.del(`/analyses/${firstId}`)).status === 404);
      check('A deletes the analysis -> 200', (await A.del(`/analyses/${firstId}`)).status === 200);
      check('deleted analysis is gone -> 404', (await A.get(`/analyses/${firstId}`)).status === 404);
    }
    const bHist = await B.get('/analyses');
    check('user B history is empty', bHist.status === 200 && bHist.body.total === 0, short(bHist.body));
  }

  // ------------------------------------------------------------ 10. cleanup
  section('10. Cleanup and logout');

  for (const doc of created) {
    const del = await A.del(`/documents/${doc.id}`);
    check(`delete ${doc.originalName} -> 200`, del.status === 200, short(del.body));
    const gone = await A.get(`/documents/${doc.id}`);
    check(`${doc.originalName} is gone -> 404`, gone.status === 404);
  }
  const finalList = await A.get('/documents');
  check('document list is empty after cleanup', finalList.body.total === 0, short(finalList.body));
  const finalHist = await A.get('/analyses');
  check('analyses were removed together with their documents', finalHist.body.total === 0, short(finalHist.body));

  check('logout -> 200', (await A.post('/auth/logout')).status === 200);
  check('after logout /auth/me -> 401', (await A.get('/auth/me')).status === 401);
} catch (err) {
  failed++;
  failures.push('Script stopped early');
  console.log(`\n  [FAIL] Script stopped early: ${err instanceof Error ? err.message : err}`);
}

// ---------------------------------------------------------------- summary

console.log('\n==============================');
console.log(`PASSED: ${passed}   FAILED: ${failed}`);
if (failures.length) {
  console.log('\nFailed checks:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log('\nManual checks still needed:');
console.log('  1. Cloudinary -> Media Library: search "documind". After this run there should be NO leftover files');
console.log('     from this run (rejected files and deleted documents are removed from storage).');
console.log('  2. Neon -> Tables: Document, DocumentChunk and Analysis rows from this run should be gone.');
console.log('==============================');
process.exit(failed ? 1 : 0);
