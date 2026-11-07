// DocuMind AI - tests for access token + refresh token (with rotation)
//
// Usage (backend folder, server running):
//   node run-tests-auth.mjs             -> all tests except the expiry test (takes about 1 minute)
//   JWT_ACCESS_EXPIRES_SECONDS=8 node run-tests-auth.mjs --expiry
//        -> ALSO tests real access token expiry. Before this, put JWT_ACCESS_EXPIRES_SECONDS=8
//           in the backend .env and restart the server. Set it back to 1800 afterwards.
//
// If you changed REFRESH_GRACE_SECONDS in .env (default 20), run:
//   REFRESH_GRACE_SECONDS=<same value> node run-tests-auth.mjs
//
// No AI requests and no uploads are used.

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const GRACE = Number(process.env.REFRESH_GRACE_SECONDS ?? 20);
const ACCESS_SECONDS = Number(process.env.JWT_ACCESS_EXPIRES_SECONDS ?? 0);
const RUN_EXPIRY = process.argv.includes('--expiry');
const RUN_ID = Date.now();
const PASSWORD = 'Test12345';
const NEW_PASSWORD = 'NewPass12345';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
let failed = 0;
const failures = [];

function short(value, max = 400) {
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
const section = (t) => console.log(`\n=== ${t} ===`);
const note = (t) => console.log(`  ...    ${t}`);

/** A tiny browser: keeps cookies and only sends a cookie when the request path matches its Path. */
class Client {
  constructor() {
    this.jar = new Map(); // name -> { value, path }
  }

  value(name) {
    return this.jar.get(name)?.value;
  }

  cookieHeader(requestPath) {
    return [...this.jar]
      .filter(([, c]) => requestPath.startsWith(c.path))
      .map(([name, c]) => `${name}=${c.value}`)
      .join('; ');
  }

  apply(setCookieLines) {
    for (const line of setCookieLines) {
      const [pair, ...attrs] = line.split(';').map((s) => s.trim());
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const map = Object.fromEntries(
        attrs.map((a) => {
          const i = a.indexOf('=');
          return i === -1 ? [a.toLowerCase(), true] : [a.slice(0, i).toLowerCase(), a.slice(i + 1)];
        }),
      );
      const expired =
        value === '' ||
        map['max-age'] === '0' ||
        (map.expires && new Date(map.expires).getTime() < Date.now());
      if (expired) this.jar.delete(name);
      else this.jar.set(name, { value, path: map.path ?? '/' });
    }
  }

  /** options.cookie replaces the Cookie header completely (to send a specific token). */
  async request(method, path, body, options = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestPath = new URL(`${API}${path}`).pathname;
      const cookie = options.cookie ?? this.cookieHeader(requestPath);
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const setCookies = res.headers.getSetCookie();
      if (res.status === 429 && attempt < 2) {
        note(`rate limited on ${method} ${path}, waiting 62s and retrying`);
        await sleep(62_000);
        continue;
      }
      if (!options.cookie) this.apply(setCookies);
      else if (options.apply) this.apply(setCookies);
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: res.status, body: json, setCookies };
    }
  }
  get(path, options) {
    return this.request('GET', path, undefined, options);
  }
  post(path, body, options) {
    return this.request('POST', path, body, options);
  }
  patch(path, body, options) {
    return this.request('PATCH', path, body, options);
  }
}

const refreshWith = (value) =>
  new Client().post('/auth/refresh', undefined, { cookie: `documind_refresh=${value}` });

const lineFor = (res, name) => res.setCookies.find((l) => l.startsWith(`${name}=`));
const setsNewRefresh = (res) => {
  const l = lineFor(res, 'documind_refresh');
  return Boolean(l) && !l.startsWith('documind_refresh=;');
};
const clearsRefresh = (res) => Boolean(lineFor(res, 'documind_refresh')?.startsWith('documind_refresh=;'));

async function loginNew(email, password = PASSWORD) {
  const c = new Client();
  const res = await c.post('/auth/login', { email, password });
  return { c, res };
}

try {
  const email = `auth.a+${RUN_ID}@example.com`;

  // ------------------------------------------------------------ 1
  section('1. Register sets the three cookies correctly');

  const first = new Client();
  const reg = await first.post('/auth/register', { name: 'Auth A', email, password: PASSWORD });
  check('register -> 201', reg.status === 201, short(reg.body));
  check('cookies stored: access, refresh, session flag', ['documind_token', 'documind_refresh', 'documind_session'].every((n) => first.value(n)), [...first.jar.keys()].join(', '));

  const accessLine = lineFor(reg, 'documind_token') ?? '';
  const refreshLine = lineFor(reg, 'documind_refresh') ?? '';
  const flagLine = lineFor(reg, 'documind_session') ?? '';
  check('access cookie: HttpOnly, Path=/, SameSite=Lax', /HttpOnly/i.test(accessLine) && /Path=\/(;|$)/.test(accessLine) && /SameSite=Lax/i.test(accessLine), accessLine);
  check('refresh cookie: HttpOnly and Path=/api/auth', /HttpOnly/i.test(refreshLine) && /Path=\/api\/auth/.test(refreshLine), refreshLine);
  check('session flag cookie is NOT HttpOnly (readable by Next.js middleware)', flagLine !== '' && !/HttpOnly/i.test(flagLine), flagLine);
  check('response body contains no tokens', !/token/i.test(JSON.stringify(reg.body)), short(reg.body));
  check('GET /auth/me works with the access cookie', (await first.get('/auth/me')).status === 200);

  // ------------------------------------------------------------ 2
  section('2. Refresh: new access token without logging in again');

  const { c: c2, res: login2 } = await loginNew(email);
  check('login -> 200', login2.status === 200, short(login2.body));
  const r1 = c2.value('documind_refresh');

  c2.jar.delete('documind_token'); // simulates an expired access token
  check('without the access cookie /auth/me -> 401', (await c2.get('/auth/me')).status === 401);

  const ref1 = await c2.post('/auth/refresh');
  check('POST /auth/refresh -> 200 with the user', ref1.status === 200 && ref1.body.user?.email === email, short(ref1.body));
  const r2 = c2.value('documind_refresh');
  check('refresh token was rotated (new value)', Boolean(r2) && r2 !== r1);
  check('a new access cookie was issued', Boolean(c2.value('documind_token')));
  check('/auth/me works again', (await c2.get('/auth/me')).status === 200);

  check('refresh cookie is not sent to non-auth paths (Path=/api/auth)', c2.cookieHeader('/api/documents').includes('documind_refresh') === false && c2.cookieHeader('/api/auth/me').includes('documind_refresh'));

  // ------------------------------------------------------------ 3
  section('3. Grace window: a just-rotated token is still accepted');

  const graceRes = await refreshWith(r1);
  check('old token right after rotation -> 200', graceRes.status === 200, short(graceRes.body));
  check('...but it gets an access token only (no new refresh cookie)', Boolean(lineFor(graceRes, 'documind_token')) && !setsNewRefresh(graceRes), short(graceRes.setCookies));
  const afterGrace = await refreshWith(r2);
  check('the current refresh token still works afterwards', afterGrace.status === 200 && setsNewRefresh(afterGrace), short(afterGrace.body));

  // ------------------------------------------------------------ 4
  section('4. Parallel refreshes (two tabs at once) do not log the user out');

  const { c: c4, res: login4 } = await loginNew(email);
  check('login for this test -> 200', login4.status === 200);
  const p1 = c4.value('documind_refresh');
  const parallel = await Promise.all([refreshWith(p1), refreshWith(p1), refreshWith(p1)]);
  check('all 3 simultaneous refreshes -> 200', parallel.every((r) => r.status === 200), parallel.map((r) => r.status).join(','));
  const rotatedOnes = parallel.filter(setsNewRefresh);
  check('exactly one of them rotated the token', rotatedOnes.length === 1, `rotated=${rotatedOnes.length}`);
  const newRaw = rotatedOnes[0]?.setCookies.find((l) => l.startsWith('documind_refresh=')).split(';')[0].slice('documind_refresh='.length);
  check('the new token from the winner works', Boolean(newRaw) && (await refreshWith(newRaw)).status === 200);

  // ------------------------------------------------------------ 5
  section(`5. Token reuse after the grace window (${GRACE}s) ends the whole session`);

  const { c: c5 } = await loginNew(email);
  const s1 = c5.value('documind_refresh');
  await c5.post('/auth/refresh');
  const s2 = c5.value('documind_refresh');
  note(`waiting ${GRACE + 2} seconds...`);
  await sleep((GRACE + 2) * 1000);
  const reuse = await refreshWith(s1);
  check('old (already rotated) token -> 401', reuse.status === 401, short(reuse.body));
  check('the 401 clears the cookies', clearsRefresh(reuse), short(reuse.setCookies));
  const afterReuse = await refreshWith(s2);
  check('the newer token of the same session is revoked too -> 401', afterReuse.status === 401, short(afterReuse.body));

  // ------------------------------------------------------------ 6
  section('6. Logout');

  const { c: c6 } = await loginNew(email);
  const l1 = c6.value('documind_refresh');
  const out = await c6.post('/auth/logout');
  check('logout -> 200', out.status === 200, short(out.body));
  check('logout clears all three cookies', c6.jar.size === 0, [...c6.jar.keys()].join(', '));
  check('the old refresh token no longer works -> 401', (await refreshWith(l1)).status === 401);
  check('logout without any cookie is harmless -> 200', (await new Client().post('/auth/logout')).status === 200);

  // ------------------------------------------------------------ 7
  section('7. Bad tokens');

  check('refresh without a cookie -> 401', (await new Client().post('/auth/refresh')).status === 401);
  const garbage = await refreshWith('this-is-not-a-real-token');
  check('garbage refresh token -> 401 and cookies cleared', garbage.status === 401 && clearsRefresh(garbage), short(garbage.setCookies));
  const accessAsRefresh = await refreshWith(first.value('documind_token'));
  check('an access token cannot be used as a refresh token -> 401', accessAsRefresh.status === 401);

  const tampered = new Client();
  await tampered.post('/auth/login', { email, password: PASSWORD });
  const good = tampered.value('documind_token');
  const bad = good.slice(0, -2) + (good.endsWith('AA') ? 'BB' : 'AA');
  const tamperedRes = await new Client().get('/auth/me', { cookie: `documind_token=${bad}` });
  check('tampered access token -> 401', tamperedRes.status === 401, short(tamperedRes.body));

  // ------------------------------------------------------------ 8
  section('8. Changing the password');

  const emailP = `auth.p+${RUN_ID}@example.com`;
  const regP = await new Client().post('/auth/register', { name: 'Auth P', email: emailP, password: PASSWORD });
  check('register second user -> 201', regP.status === 201, short(regP.body));

  const { c: dev1 } = await loginNew(emailP);
  const { c: dev2 } = await loginNew(emailP);
  const dev1Old = dev1.value('documind_refresh');
  const change = await dev1.patch('/users/password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
  check('device 1 changes the password -> 200', change.status === 200, short(change.body));
  check('device 1 receives a fresh session (new refresh cookie)', setsNewRefresh(change) && dev1.value('documind_refresh') !== dev1Old, short(change.setCookies));
  check('device 1 is still logged in', (await dev1.get('/auth/me')).status === 200);
  check('device 1 can refresh with its new token', (await dev1.post('/auth/refresh')).status === 200);
  check('device 2 (other session) is logged out -> refresh 401', (await dev2.post('/auth/refresh')).status === 401);
  check('login with the old password -> 401', (await new Client().post('/auth/login', { email: emailP, password: PASSWORD })).status === 401);
  check('login with the new password -> 200', (await new Client().post('/auth/login', { email: emailP, password: NEW_PASSWORD })).status === 200);

  // ------------------------------------------------------------ 9
  if (RUN_EXPIRY) {
    section(`9. Real access token expiry (server must use JWT_ACCESS_EXPIRES_SECONDS=${ACCESS_SECONDS})`);
    if (!ACCESS_SECONDS) {
      check('JWT_ACCESS_EXPIRES_SECONDS was passed to this script', false, 'run: JWT_ACCESS_EXPIRES_SECONDS=8 node run-tests-auth.mjs --expiry');
    } else {
      const { c: c9 } = await loginNew(email);
      check('fresh access token works', (await c9.get('/auth/me')).status === 200);
      note(`waiting ${ACCESS_SECONDS + 2} seconds for the access token to expire...`);
      await sleep((ACCESS_SECONDS + 2) * 1000);
      const expired = await c9.get('/auth/me');
      check('expired access token -> 401', expired.status === 401, short(expired.body));
      check('refresh -> 200', (await c9.post('/auth/refresh')).status === 200);
      check('/auth/me works again with the new access token', (await c9.get('/auth/me')).status === 200);
    }
  } else {
    section('9. Access token expiry skipped');
    note('Run with: JWT_ACCESS_EXPIRES_SECONDS=8 node run-tests-auth.mjs --expiry (after setting it in .env)');
  }
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
console.log('\nTest users created: emails starting with "auth." (delete later in Neon):');
console.log(`  DELETE FROM "User" WHERE email LIKE 'auth.%@example.com';`);
console.log('==============================');
process.exit(failed ? 1 : 0);
