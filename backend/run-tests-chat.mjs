// DocuMind AI - backend tests for Part 5 (search + chat) and Part 6 (dashboard)
//
// Usage (from the backend folder, server running):
//   node run-tests-chat.mjs --skip-ai     -> search, conversations, dashboard (no AI credits used)
//   node run-tests-chat.mjs               -> also tests streaming chat (about 7 AI requests)
//
// Against a deployed backend:
//   API_URL=https://your-backend.vercel.app/api node run-tests-chat.mjs --skip-ai
//
// Needs the ./test-files folder from the earlier test kit (sample.txt, bangla-sample.txt).

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
  constructor() {
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
  del(path) {
    return this.request('DELETE', path);
  }
}

async function uploadDoc(client, fileName, buffer) {
  const sig = await client.post('/documents/upload-signature', { fileName, fileSize: buffer.length });
  if (sig.status !== 200) throw new Error(`signature failed for ${fileName}: ${short(sig.body)}`);
  const s = sig.body;
  const form = new FormData();
  form.append('file', new Blob([buffer]), fileName);
  form.append('api_key', s.apiKey);
  form.append('timestamp', String(s.timestamp));
  form.append('signature', s.signature);
  form.append('public_id', s.publicId);

  let up;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      up = await fetch(s.uploadUrl, { method: 'POST', body: form });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      note(`network error talking to Cloudinary, retry ${attempt}/2`);
      await sleep(2000);
    }
  }
  if (!up.ok) throw new Error(`Cloudinary upload failed for ${fileName}: ${await up.text()}`);

  const conf = await client.post('/documents/confirm', { publicId: s.publicId, originalName: fileName });
  if (conf.status !== 201) throw new Error(`confirm failed for ${fileName}: ${short(conf.body)}`);
  return conf.body.document;
}

/** A long document with one hidden fact, so we can test chunk retrieval. */
function makeLongDocument() {
  const topics = ['water supply', 'power backup', 'fire safety', 'visitor parking', 'waste handling', 'network upgrades', 'elevator checks', 'cleaning rota'];
  const paragraphs = [];
  for (let i = 1; i <= 70; i++) {
    const topic = topics[i % topics.length];
    paragraphs.push(
      `Section ${i}. This section describes the routine ${topic} procedure for building block ${i}. Inspectors record readings every ${(i % 6) + 2} weeks and file a short report with the facilities office. Any deviation above ${((i * 3) % 17) + 5} percent must be escalated to the block supervisor, who then schedules a follow-up visit within ${(i % 4) + 1} working days. Reports are stored in the shared archive under reference code F-${1000 + i}.`,
    );
    if (i === 41) {
      paragraphs.push('Special note: the vault access code for Project Zephyr is 7391-ALPHA, and only the security lead may share it.');
    }
  }
  return Buffer.from(paragraphs.join('\n\n'), 'utf8');
}

/** Reads the server-sent events of POST /conversations/:id/messages. */
async function streamMessage(client, conversationId, content, { abortAfterTokens } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const res = await fetch(`${API}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: client.cookie },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    if (res.status === 429 && attempt === 0) {
      note('rate limited on chat message, waiting 62s and retrying');
      await sleep(62_000);
      continue;
    }

    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('text/event-stream')) {
      return { status: res.status, type, events: [], body: await res.text() };
    }

    const events = [];
    const tokenTimes = [];
    const started = Date.now();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (!frame.startsWith('data:')) continue;
          const event = JSON.parse(frame.slice(5).trim());
          events.push(event);
          if (event.type === 'token') tokenTimes.push(Date.now() - started);
          if (abortAfterTokens && tokenTimes.length >= abortAfterTokens) {
            controller.abort();
            return { status: res.status, type, events, tokenTimes, aborted: true };
          }
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') throw err;
    }
    return { status: res.status, type, events, tokenTimes, aborted: false };
  }
}

// ---------------------------------------------------------------- run

const A = new Client();
const B = new Client();
const docs = [];

try {
  section('0. Setup: two users and three documents');

  const regA = await A.post('/auth/register', { name: 'Chat A', email: `chat.a+${RUN_ID}@example.com`, password: PASSWORD });
  const regB = await B.post('/auth/register', { name: 'Chat B', email: `chat.b+${RUN_ID}@example.com`, password: PASSWORD });
  check('register users A and B', regA.status === 201 && regB.status === 201, `${regA.status} ${regB.status}`);
  note(`user A id: ${regA.body.user?.id} (files under documind/${regA.body.user?.id}/)`);

  const sampleBuf = await readFile(join(FILES, 'sample.txt'));
  const bnBuf = await readFile(join(FILES, 'bangla-sample.txt'));
  const longBuf = makeLongDocument();
  note(`long document is ${longBuf.length} characters`);

  const docShort = await uploadDoc(A, 'sample.txt', sampleBuf);
  const docBn = await uploadDoc(A, 'bangla-sample.txt', bnBuf);
  const docLong = await uploadDoc(A, 'long-facilities.txt', longBuf);
  docs.push(docShort, docBn, docLong);
  check('3 documents uploaded', docs.every(Boolean));

  // ------------------------------------------------------------ search
  section('1. Chunk search: GET /documents/:id/search (no AI)');

  const search = (doc, q, client = A) => client.get(`/documents/${doc.id}/search?q=${encodeURIComponent(q)}`);

  const s1 = await search(docShort, 'CI pipeline');
  check(
    'English keyword finds the right chunk (mode fts)',
    s1.status === 200 && s1.body.mode === 'fts' && s1.body.results.length >= 1 && /CI pipeline/i.test(s1.body.results[0].content),
    short(s1.body),
  );

  const s2 = await search(docLong, 'vault access code');
  check(
    'long document: needle chunk is ranked first (mode fts)',
    s2.status === 200 && s2.body.mode === 'fts' && s2.body.results[0]?.content.includes('7391-ALPHA'),
    short(s2.body.results?.map((r) => ({ index: r.index, start: r.content.slice(0, 60) }))),
  );
  check('at most 5 chunks are returned', s2.body.results?.length <= 5, String(s2.body.results?.length));

  const s3 = await search(docBn, 'নুসরাত');
  check(
    'Bangla keyword finds the right chunk (mode like)',
    s3.status === 200 && s3.body.mode === 'like' && s3.body.results.length >= 1 && s3.body.results[0].content.includes('নুসরাত'),
    short(s3.body),
  );

  const s4 = await search(docShort, 'what is the');
  check('only stop words -> falls back to start of document', s4.status === 200 && s4.body.mode === 'start' && s4.body.results.length >= 1, short(s4.body));

  const s5 = await search(docShort, 'zzzqqq nonexistentword');
  check('no match -> falls back to start of document', s5.status === 200 && s5.body.mode === 'start', short(s5.body));

  const s6 = await search(docShort, `'; DROP TABLE "User"; --`);
  check('SQL-looking input is harmless -> 200', s6.status === 200, short(s6.body));
  check('database still works afterwards', (await A.get('/auth/me')).status === 200);

  const s7 = await search(docShort, 'a & b | !c :* ( ) <->');
  check('tsquery operators in input do not crash -> 200', s7.status === 200, short(s7.body));

  check('query shorter than 2 chars -> 400', (await search(docShort, 'a')).status === 400);
  check("B cannot search A's document -> 404", (await search(docShort, 'pipeline', B)).status === 404);

  // ------------------------------------------------------------ conversations
  section('2. Conversations (no AI)');

  const c1 = await A.post(`/documents/${docShort.id}/conversations`, {});
  const conv = c1.body.conversation;
  check('create conversation -> 201 with default title', c1.status === 201 && conv?.title === 'New conversation', short(c1.body));
  const c2 = await A.post(`/documents/${docShort.id}/conversations`, { title: 'Budget questions' });
  check('create conversation with custom title', c2.status === 201 && c2.body.conversation?.title === 'Budget questions', short(c2.body));

  const list = await A.get(`/documents/${docShort.id}/conversations`);
  check('list shows both, newest activity first', list.status === 200 && list.body.items.length === 2 && list.body.items[0]._count?.messages === 0, short(list.body));

  const msgs = await A.get(`/conversations/${conv.id}/messages`);
  check('new conversation has no messages', msgs.status === 200 && msgs.body.messages.length === 0, short(msgs.body));

  check('empty message -> 400', (await A.post(`/conversations/${conv.id}/messages`, { content: '   ' })).status === 400);
  check('message over 2000 chars -> 400', (await A.post(`/conversations/${conv.id}/messages`, { content: 'x'.repeat(2001) })).status === 400);
  check('message to unknown conversation -> 404 (plain JSON, not a stream)', (await A.post('/conversations/does-not-exist/messages', { content: 'hello' })).status === 404);

  check("B cannot list A's conversations -> 404", (await B.get(`/documents/${docShort.id}/conversations`)).status === 404);
  check("B cannot create a conversation on A's document -> 404", (await B.post(`/documents/${docShort.id}/conversations`, {})).status === 404);
  check("B cannot read A's messages -> 404", (await B.get(`/conversations/${conv.id}/messages`)).status === 404);
  check("B cannot send to A's conversation -> 404", (await B.post(`/conversations/${conv.id}/messages`, { content: 'hello' })).status === 404);
  check("B cannot delete A's conversation -> 404", (await B.del(`/conversations/${conv.id}`)).status === 404);

  const throwaway = c2.body.conversation;
  check('delete conversation -> 200', (await A.del(`/conversations/${throwaway.id}`)).status === 200);
  check('deleted conversation is gone -> 404', (await A.get(`/conversations/${throwaway.id}/messages`)).status === 404);

  // ------------------------------------------------------------ dashboard
  section('3. Dashboard stats (no AI)');

  check('dashboard without login -> 401', (await new Client().get('/dashboard/stats')).status === 401);

  const dash = await A.get('/dashboard/stats');
  const totalBytes = docs.reduce((sum, d) => sum + d.fileSize, 0);
  check('stats.documents counts the 3 uploads', dash.status === 200 && dash.body.stats?.documents === 3, short(dash.body.stats));
  check('stats.storageBytes equals the sum of file sizes', dash.body.stats?.storageBytes === totalBytes, `got ${dash.body.stats?.storageBytes}, expected ${totalBytes}`);
  check('stats.conversations counts the open conversation', dash.body.stats?.conversations >= 1, short(dash.body.stats));
  check('recentDocuments: newest first, at most 5', dash.body.recentDocuments?.length === 3 && dash.body.recentDocuments[0].originalName === 'long-facilities.txt', short(dash.body.recentDocuments?.map((d) => d.originalName)));
  check('recentActivity includes the chat', dash.body.recentActivity?.some((a) => a.type === 'chat' && a.documentName === 'sample.txt'), short(dash.body.recentActivity));
  check('no extractedText or password leaks in dashboard', !/Kickoff|password/i.test(JSON.stringify(dash.body)));

  const dashB = await B.get('/dashboard/stats');
  check('user B sees only zeros', dashB.status === 200 && dashB.body.stats?.documents === 0 && dashB.body.stats?.storageBytes === 0 && dashB.body.recentDocuments?.length === 0, short(dashB.body));

  // ------------------------------------------------------------ AI chat
  if (SKIP_AI) {
    section('4. Streaming chat skipped (--skip-ai)');
  } else {
    section('4. Streaming chat (uses AI requests)');

    const r1 = await streamMessage(A, conv.id, 'Who will set up the CI pipeline?');
    if (r1.type && !r1.type.includes('text/event-stream')) {
      check('chat returns a text/event-stream', false, `status=${r1.status} type=${r1.type} body=${short(r1.body)}`);
    } else {
      const types = r1.events.map((e) => e.type);
      const tokens = r1.events.filter((e) => e.type === 'token');
      const done = r1.events.find((e) => e.type === 'done');
      const err = r1.events.find((e) => e.type === 'error');
      check('stream starts with a "start" event and ends with "done"', types[0] === 'start' && types.at(-1) === 'done', `${types.slice(0, 3).join(',')} ... ${types.slice(-2).join(',')} ${err ? short(err) : ''}`);
      check('answer arrives as several token events', tokens.length >= 2, `${tokens.length} tokens`);
      note(`first token after ${r1.tokenTimes[0]} ms, last token after ${r1.tokenTimes.at(-1)} ms (if these are equal, streaming is being buffered)`);
      const joined = tokens.map((t) => t.text).join('');
      check('tokens joined equal the saved message', Boolean(done) && joined === done.message.content, short(joined, 200));
      check('answer is grounded in the document (mentions Nusrat)', /nusrat/i.test(joined), `${short(joined, 300)} (model-dependent)`);
      check('short document is sent in full (contextMode full)', r1.events[0]?.contextMode === 'full', short(r1.events[0]));

      const after = await A.get(`/conversations/${conv.id}/messages`);
      check('both messages are saved in order (USER then ASSISTANT)', after.body.messages?.length === 2 && after.body.messages[0].role === 'USER' && after.body.messages[1].role === 'ASSISTANT', short(after.body.messages?.map((m) => m.role)));
      const listAfter = await A.get(`/documents/${docShort.id}/conversations`);
      const updated = listAfter.body.items?.find((c) => c.id === conv.id);
      check('title is set from the first question', updated && updated.title !== 'New conversation', short(updated));
    }

    const r2 = await streamMessage(A, conv.id, 'And what is the deadline for that?');
    const a2 = r2.events?.filter((e) => e.type === 'token').map((t) => t.text).join('') ?? '';
    check('follow-up uses earlier messages (mentions 19 March)', /19 march/i.test(a2), `${short(a2, 300)} (model-dependent)`);

    const r3 = await streamMessage(A, conv.id, "What is the CEO's favorite color according to the document?");
    const a3 = r3.events?.filter((e) => e.type === 'token').map((t) => t.text).join('') ?? '';
    check('missing information is reported as not found', /not|n't|no (mention|information)|cannot|unable/i.test(a3), `${short(a3, 300)} (model-dependent)`);

    // long document -> retrieval
    const convLong = (await A.post(`/documents/${docLong.id}/conversations`, {})).body.conversation;
    const r4 = await streamMessage(A, convLong.id, 'What is the vault access code for Project Zephyr?');
    const start4 = r4.events?.[0];
    const a4 = r4.events?.filter((e) => e.type === 'token').map((t) => t.text).join('') ?? '';
    check('long document uses excerpts (contextMode excerpts, at most 5 chunks)', start4?.contextMode === 'excerpts' && start4?.usedChunks?.length >= 1 && start4.usedChunks.length <= 5, short(start4));
    check('answer found through chunk retrieval (7391-ALPHA)', a4.includes('7391-ALPHA'), `${short(a4, 300)} (model-dependent)`);

    // client disconnects mid-answer
    const convAbort = (await A.post(`/documents/${docShort.id}/conversations`, {})).body.conversation;
    const r5 = await streamMessage(A, convAbort.id, 'Write a detailed paragraph about every decision, risk and action item in this document.', { abortAfterTokens: 3 });
    let saved = [];
    for (let i = 0; i < 10 && saved.length < 2; i++) {
      await sleep(1000);
      saved = (await A.get(`/conversations/${convAbort.id}/messages`)).body.messages ?? [];
    }
    check('client abort: stream stopped early', r5.aborted === true, `aborted=${r5.aborted} tokens=${r5.tokenTimes?.length}`);
    check('client abort: user message and the partial answer were saved', saved.length === 2 && saved[1].role === 'ASSISTANT' && saved[1].content.length > 0, short(saved));
  }

  // ------------------------------------------------------------ cleanup
  section('5. Cleanup');

  for (const doc of docs) {
    check(`delete ${doc.originalName} -> 200`, (await A.del(`/documents/${doc.id}`)).status === 200);
  }
  check('conversations were deleted together with the documents', (await A.get(`/conversations/${conv.id}/messages`)).status === 404);
  const finalDash = await A.get('/dashboard/stats');
  check('dashboard shows zeros after cleanup', finalDash.body.stats?.documents === 0 && finalDash.body.stats?.conversations === 0, short(finalDash.body.stats));
} catch (err) {
  failed++;
  failures.push('Script stopped early');
  const cause = err instanceof Error && err.cause ? ` (${err.cause.code ?? err.cause.message ?? err.cause})` : '';
  console.log(`\n  [FAIL] Script stopped early: ${err instanceof Error ? err.message : err}${cause}`);
  if (err instanceof Error && err.stack) console.log(err.stack.split('\n').slice(0, 6).join('\n'));
}

console.log('\n==============================');
console.log(`PASSED: ${passed}   FAILED: ${failed}`);
if (failures.length) {
  console.log('\nFailed checks:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log('==============================');
process.exit(failed ? 1 : 0);
