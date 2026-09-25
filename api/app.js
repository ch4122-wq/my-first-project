import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { parse, serialize } from 'cookie';
import { createServerClient } from '@supabase/ssr';
// These are public identifiers, not secrets. No Google client secret is used.
const config = {
  supabaseUrl: 'https://htzleuxpqkynqbzarbge.supabase.co',
  supabaseKey: 'sb_publishable_Y8tDNPuYBCnS_ukjjJn7tQ_yHOMLzmo',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '54636093011-56iake7n6hogtggbgeh7t0nk87e5do9m.apps.googleusercontent.com',
};

export function sameToken(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b || a.length > 1024 || b.length > 1024) return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function originFor(req) {
  const host = req.headers.host;
  const allowed = new Set(['my-first-project-gamma-ashy.vercel.app', process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean));
  if (!allowed.has(host)) throw new Error('Unrecognized host');
  return `https://${host}`;
}

const e = escapeHtml;

const nonceName = '__Host-coffee-nonce';
function setCookie(res, name, value, options = {}) {
  const existing = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : [existing]), serialize(name, value, { path: '/', secure: true, httpOnly: true, sameSite: 'lax', ...options })]);
}
function client(req, res) {
  const jar = parse(req.headers.cookie || '');
  return createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: updates => updates.forEach(({ name, value, options }) => { jar[name] = value; setCookie(res, name, value, { ...options, httpOnly: true, secure: true, sameSite: 'lax', path: '/' }); }),
    },
  });
}
function redirect(res, path) { res.statusCode = 303; res.setHeader('Location', path); res.end(); }
function page(title, body, google = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${e(title)} — The Coffee Edit</title>${google ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}<style>
  *{box-sizing:border-box}body{margin:0;background:#f8f5ed;color:#2c302b;font-family:Arial,sans-serif}main{max-width:1040px;margin:auto;padding:32px 24px}nav{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #deded2;padding-bottom:24px;gap:20px}a{color:#435342}nav a{text-decoration:none;font-weight:700}.brand span{display:inline-grid;place-items:center;background:#435342;color:white;border-radius:50%;width:32px;height:32px;margin-right:10px}.label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#62725c;font-weight:700}header{padding:52px 0 26px}h1{font:400 clamp(42px,7vw,68px)/1.05 Georgia,serif;letter-spacing:-2px;margin:18px 0}h1 em{color:#73806a;font-weight:400}p{color:#686b61;line-height:1.7}.layout{display:grid;grid-template-columns:1.15fr 1fr;gap:24px}.panel{background:#fffef9;border:1px solid #deded2;border-radius:20px;padding:32px}.preview{background:#e9ecdf;border-radius:20px;padding:32px;display:flex;flex-direction:column;justify-content:center}.lock{font-size:30px}.panel h2,.preview h2{font:400 30px Georgia,serif;margin:18px 0}.detail{font-size:13px}.tag{display:inline-block;border:1px solid #c5cdbb;border-radius:30px;padding:7px 12px;font-size:11px}.list{list-style:none;padding:0}.list li{padding:16px 0;border-bottom:1px solid #deded2}.list strong{display:block;margin-bottom:6px}.list span{color:#686b61;font-size:14px}button,.button{font:inherit;border:0;border-radius:24px;background:#435342;color:white;padding:12px 20px;cursor:pointer;text-decoration:none;display:inline-block}button:focus-visible,a:focus-visible{outline:3px solid #829275;outline-offset:4px}footer{border-top:1px solid #deded2;margin-top:40px;padding-top:20px;font-size:12px;color:#686b61}.account{overflow-wrap:anywhere}.welcome{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.welcome form{margin-left:auto}.error{border-left:3px solid #b36a48;padding-left:16px}@media(max-width:650px){.layout{grid-template-columns:1fr}.panel,.preview{padding:24px}header{padding-top:36px}nav{font-size:13px}.welcome form{margin-left:0}}
  </style></head><body><main><nav><a class="brand" href="/"><span>c.</span>the coffee edit</a><a href="/">Explore the cafés ↗</a></nav>${body}<footer>Little places. Lovely pauses. A little more, just for members.</footer></main></body></html>`;
}
function send(res, status, title, body, google = false) { res.statusCode = status; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page(title, body, google)); }
function gate(req, res, origin) {
  const rawNonce = randomBytes(32).toString('hex');
  setCookie(res, nonceName, rawNonce, { maxAge: 600, sameSite: 'none' });
  const hashedNonce = createHash('sha256').update(rawNonce).digest('hex');
  const google = config.googleClientId ? `<div id="g_id_onload" data-client_id="${e(config.googleClientId)}" data-ux_mode="redirect" data-login_uri="${e(origin)}/auth/callback" data-nonce="${hashedNonce}" data-auto_prompt="false"></div><div class="g_id_signin" data-type="standard" data-size="large" data-theme="outline" data-text="continue_with" data-shape="pill"></div>` : '<p class="error">Google sign-in is being configured. Please check back shortly.</p>';
  return send(res, 200, 'The Members’ Corner', `<header><span class="label">The members’ corner</span><h1>A seat at<br><em>the little table.</em></h1><p>Come in for a slower moment. Your members-only coffee ritual is waiting.</p></header><div class="layout"><section class="panel"><span class="tag">Members only · Sign in required</span><h2>A little more to savor.</h2><p>Sign in with Google to unlock our tasting guide and a five-stop café itinerary.</p>${google}<p class="detail">We use your Google name and email to create your account. Your Google password stays with Google.</p></section><aside class="preview"><span class="lock" aria-hidden="true">✳</span><h2>Your next lovely pause</h2><p>A thoughtful coffee ritual, a fresh route through the collection, and a reason to linger a little longer.</p><span class="label">Unlock with your Google account</span></aside></div>`, !!config.googleClientId);
}
export async function handle(req, res, { makeClient = client } = {}) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  let origin;
  try { origin = originFor(req); } catch { return send(res,400,'Invalid request','<h1>Invalid request</h1>'); }
  const route = req.query?.route;
  const cookies = parse(req.headers.cookie || '');
  if (route === 'callback') {
    if (req.method !== 'POST') return send(res,405,'Sign-in required','<h1>Start with Google sign-in.</h1><p><a href="/members">Return to the members’ corner</a></p>');
    const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body || {};
    if (!sameToken(cookies.g_csrf_token, body.g_csrf_token) || !/^[a-f0-9]{64}$/.test(cookies[nonceName] || '') || typeof body.credential !== 'string' || body.credential.length > 20000) return send(res,400,'Sign-in expired','<h1>Let’s try that again.</h1><p>Your sign-in request expired or could not be verified.</p><a class="button" href="/members">Restart Google sign-in</a>');
    const supabase = makeClient(req,res);
    const { data, error } = await supabase.auth.signInWithIdToken({ provider:'google', token:body.credential, nonce:cookies[nonceName] });
    setCookie(res,nonceName,'',{maxAge:0,sameSite:'none'});
    if(error || !data.user) return send(res,401,'Sign-in unsuccessful','<h1>We couldn’t sign you in.</h1><p>Please return and try Google sign-in again.</p><a class="button" href="/members">Try again</a>');
    return redirect(res,'/members');
  }
  if(route === 'signout') {
    if(req.method !== 'POST' || req.headers.origin !== origin) return send(res,403,'Invalid request','<h1>Request not allowed.</h1>');
    const { error } = await makeClient(req,res).auth.signOut({scope:'local'});
    if(error) return send(res,503,'Please try again','<h1>Sign-out could not complete.</h1><p><a href="/members">Return and try again</a></p>');
    return redirect(res,'/members');
  }
  if(route !== 'members' || req.method !== 'GET') return send(res,404,'Not found','<h1>This page isn’t here.</h1><a href="/">Back to the collection</a>');
  const supabase = makeClient(req,res);
  // Verify against the Auth server on every request. Never trust a client-side flag or getSession alone.
  const { data: { user }, error } = await supabase.auth.getUser();
  if(error || !user) return gate(req,res,origin);
  return send(res,200,'Welcome to the Members’ Corner',`<header><span class="label">The members’ corner · Unlocked</span><h1>Your next<br><em>lovely pause.</em></h1><div class="welcome"><p class="account">Welcome, ${e(user.user_metadata?.full_name || user.email || 'coffee friend')}.</p><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></header><div class="layout"><section class="panel"><span class="tag">Your members-only tasting guide</span><h2>The three-sip ritual.</h2><ol class="list"><li><strong>01 · Notice the aroma</strong><span>Take a breath before the first sip. What comes to mind: cocoa, citrus, or toasted nuts?</span></li><li><strong>02 · Let it settle</strong><span>Try a second sip as the cup cools. Pay attention to sweetness, texture, and the finish.</span></li><li><strong>03 · Make a moment of it</strong><span>Put your phone away for five minutes. Leave a little room for an unhurried conversation.</span></li></ol></section><aside class="preview"><span class="label">The five-stop daydream</span><h2>Take the scenic route.</h2><ol class="list"><li>Sunday Window — a soft start</li><li>Moss &amp; Mug — a leafy interlude</li><li>Blue Hour — a riverside reset</li><li>Little Ember — something sweet</li><li>Paper Moon — time to create</li></ol><p class="detail">An imagined itinerary through our fictional café collection.</p><a href="/">Revisit the collection ↗</a></aside></div>`);
}
export default async function handler(req,res) {
  try { await handle(req,res); } catch { send(res,503,'A brief pause','<h1>A brief pause.</h1><p>We couldn’t reach the sign-in service. Please try again in a moment.</p><a class="button" href="/members">Try again</a>'); }
}
