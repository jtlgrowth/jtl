# The 10 checks

One section per check: what it is, how to verify it, what counts as PASS, and the false
pass: the thing that looks correct and isn't. The false-pass field is the one that earns
its keep. Anyone can grep for `bcrypt`; the value is knowing that finding it proves nothing
if a second code path still writes plaintext.

Record for every check: **verdict + evidence**. Evidence is a `file:line`, a command and
its output, or a named dashboard setting with the value you read. Not a paraphrase.

---

## 1 · Forces HTTPS

Plain HTTP means every session cookie and every submitted password is readable by anything
between the user and the server. On coffee-shop WiFi that is not theoretical.

**Verify**

```bash
curl -sSI http://example.com | head -20        # expect 301/308 → https://
curl -sSI https://example.com | grep -i strict-transport-security
```

Check the apex and `www` separately: they are frequently configured by different people on
different days. If the app has an API on another subdomain, check that too.

**PASS**: HTTP redirects to HTTPS with a 301 or 308, and `Strict-Transport-Security` is
present with a `max-age` of at least 15552000 (180 days).

**False pass**: the redirect exists but the app also *serves* content over HTTP before
redirecting, or the redirect chain passes through an HTTP hop. Read the whole chain
(`curl -sSIL`), not just the final status. Also: HSTS on the marketing domain while the
actual app subdomain has none.

---

## 2 · Passwords hashed

A stolen database is bad. A stolen database of plaintext passwords is bad for every other
site your users reused that password on, which is how one breach becomes ten.

**Verify**

```bash
grep -rniE "bcrypt|argon2|scrypt|pbkdf2" --include="*.{js,ts,py,rb,go,php,java}" .
grep -rniE "password" --include="*.sql" .          # column types and defaults
grep -rniE "(password|passwd|pwd)\s*[:=]" --include="*.{js,ts,py}" . | grep -viE "hash|bcrypt|argon"
```

Managed auth (Supabase Auth, Auth0, Clerk, Firebase, Cognito, and the no-code platforms)
is PLATFORM: name the provider and confirm there is no custom password column alongside
it.

**PASS**: every password write goes through a slow, salted hash, or through a named
managed provider with no custom password storage anywhere in the schema.

**False pass**: `bcrypt` is imported and used on the main signup route, while an admin
seed script, a migration, an import job, or a legacy `/api/register-v1` route still writes
plaintext. Grep the schema, not just the handlers. Second variant: a hash is stored but
it is MD5 or SHA-256 with no salt and no work factor, which is a hash in name only.

---

## 3 · Bot protection on public forms

Without it: signup floods, spam through your contact form arriving from your domain,
credential stuffing, and, if any public endpoint calls an LLM, an uncapped bill run up
by strangers.

**Verify**

Enumerate every endpoint reachable without authentication that accepts a POST. Signup,
login, contact, waitlist, password reset, file upload, webhook receivers, and every
public AI endpoint. For each, find one of: CAPTCHA/Turnstile, a honeypot field, or a rate
limit.

```bash
grep -rniE "recaptcha|turnstile|hcaptcha|honeypot|rate.?limit|ratelimit" .
```

Then probe your own endpoint to confirm the limit is real:

```bash
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -X POST https://example.com/api/signup; done
# expect the tail to become 429
```

**PASS**: every public POST has at least one control, and the rate limit was observed
returning 429 rather than merely being present in the source.

**False pass**: the limiter is defined but never applied to the route, or it is
in-memory on a serverless platform where each cold start gets a fresh empty counter, so
the effective limit is one request per instance and the protection is decorative. Also:
a limit keyed on a header the client controls.

---

## 4 · Sessions expire

A token that never expires is a permanent key. Every laptop left in a café, every
browser-extension leak, and every stolen backup keeps working forever.

**Verify**

Read the actual TTL, do not infer it. For managed auth, read it in the dashboard and quote
the number. For custom JWTs, find where the token is signed and read `expiresIn`. For
cookies, read `Max-Age` off a real `Set-Cookie` response header.

```bash
grep -rniE "expiresIn|maxAge|max_age|JWT_EXPIR|SESSION_TTL|exp:" .
curl -sSI https://example.com/login | grep -i set-cookie
```

**PASS**: a finite access-token TTL (an hour is typical), with refresh rotation for
longer sessions.

**False pass**: a short access-token TTL paired with a refresh token that never expires
and is never rotated, which is a permanent credential wearing a disguise. Also: an
expiry claim is issued but the verification path never checks it. Confirm the token is
actually validated server-side, not just decoded.

---

## 5 · CSRF protection

If a request authenticates by cookie alone, any other site can make a user's browser send
it. That is how "delete account" gets triggered by an image tag.

**Verify**

```bash
grep -rniE "csrf|samesite|xsrf" .
curl -sSI https://example.com/login | grep -i set-cookie   # look for SameSite
```

Establish how the app authenticates first, because the answer changes the whole check:

- **Cookie-authenticated**: needs CSRF tokens on state-changing routes, or `SameSite=Lax`
  or `Strict` and no cross-site write paths.
- **Bearer-token API**: PASS with a note. A token in an `Authorization` header is not
  attached automatically by the browser, so the attack does not apply.
- **Mixed**: audit the cookie half; mixed apps are where this actually breaks.

**PASS**: cookie-authenticated state changes are protected by tokens or `SameSite`, and
that was confirmed on a real response header rather than assumed from the framework's
defaults.

**False pass**: "the framework handles CSRF." Most do, for their own form helpers, and
then the hand-rolled `/api/*` route added later sits outside that protection entirely.
Check the routes people added by hand. Second variant: `SameSite=None` set for a
third-party embed, which turns the protection off for everything.

---

## 6 · Reset links expire and are single-use

A password-reset link is a full account takeover in a URL. It lands in an inbox, gets
forwarded, sits in email backups, and leaks through referrer headers.

**Verify**

```bash
grep -rniE "reset.?token|magic.?link|forgot.?password|recovery" .
```

Look for two properties: a TTL, and consumption on use: the token is deleted or marked
used the first time it is redeemed. For managed auth, read the expiry from the dashboard
and quote the number.

**PASS**: TTL of an hour or less, and the token is invalidated on first use.

**False pass**: the token expires but is never consumed, so it works repeatedly for the
whole window. Or it is derived from a hash of user data (email, `updated_at`, user ID),
which makes it forgeable rather than random. Reset tokens must come from a cryptographic
random source.

---

## 7 · Scoped database key, not master

This is the one that ends companies. A service-role key in client-side code means every
visitor can read and write every row, bypassing every access rule you wrote. It is also
the single most common failure in AI-generated apps, because "just make the query work" is
solved instantly by using the powerful key.

**Verify: against deployed output, not source.** This check is nearly worthless run only
against a clean local tree.

```bash
# 1 · source
grep -rniE "service_role|SERVICE_ROLE|sb_secret|SUPABASE_SERVICE|ANON_KEY|sk_live|sk-[a-zA-Z0-9]" . \
  --exclude-dir=node_modules --exclude-dir=.git

# 2 · deployed bundle: the one that matters
curl -s https://example.com | grep -oE 'src="[^"]+\.js"'
curl -s https://example.com/_next/static/chunks/main-abc123.js | grep -ciE "service_role|eyJ[A-Za-z0-9_-]{20,}"

# 3 · git history: a removed secret is still a live secret
git log --all -p | grep -iE "service_role|sk_live|BEGIN (RSA )?PRIVATE KEY" | head
```

Check for `.env` files committed to the repo, and for source maps published to production
(`.js.map`), which hand over the original source including anything inlined at build time.

**PASS**: the browser bundle contains only the publishable/anon key; every privileged key
appears exclusively in server-only files and environment configuration; git history is
clean.

**False pass**: the source is clean because the key is injected at build time by a
misprefixed environment variable, so it lands in the bundle anyway. Any framework prefix
that means "expose this to the browser" (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`,
`PUBLIC_`) attached to a secret is a leak, and the source tree looks perfect.
**Always grep the deployed JavaScript.**

If you find a live key: FAIL immediately, report it as the top fix, and tell the user to
**rotate it**: removing the code does not un-leak a key that has already been served.

---

## 8 · Clean logs

Logs get shipped to third-party services, read by contractors, and included in support
exports. A password in a log line is a password in every one of those places.

**Verify**

```bash
grep -rniE "(console\.(log|error|warn)|logger\.|print\(|fmt\.Print).*(password|token|secret|apiKey|api_key|card|cvv|ssn|authorization)" . \
  --exclude-dir=node_modules
grep -rniE "console\.log\((req|request|body|user|payload|event)\)" . --exclude-dir=node_modules
```

The second grep matters more than the first. Nobody writes `console.log(password)`. People
write `console.log(req.body)` on a login route, which prints the password with extra steps.

**PASS**: no log statement in an auth, payment, or integration path emits a credential,
directly or by logging a whole object that contains one.

**False pass**: the code is clean but an error handler logs the full request on failure,
so credentials are captured precisely when something is going wrong and everyone is
watching the logs. Also check what the error-tracking SDK is configured to attach.

---

## 9 · Billing alerts

Not confidentiality: solvency. Metered backends fail toward a large invoice, and an
uncapped public LLM endpoint discovered by a scraper is a five-figure weekend.

**Verify**

List every metered backend the surface touches: hosting, database, LLM/API providers,
email, storage, SMS. For each, confirm a spend cap or usage alert exists, and quote the
value.

**PASS**: every metered backend has a cap or an alert with a number you actually read.

**False pass**: "we are on the free tier, so it cannot charge us." True only where the
free tier hard-stops. Several platforms auto-upgrade or bill overage instead of stopping,
and the LLM providers almost always bill. Confirm which behavior your plan has; do not
assume the safe one.

---

## 10 · Automated backups

Ransomware, a bad migration, and a mistyped `DELETE` all end the same way. Backups decide
whether that is an afternoon or the end of the business.

**Verify**

Read the platform's backup setting and quote the schedule and retention. Then confirm the
plan tier actually includes it: free tiers very often do not, while the dashboard still
shows the feature.

For self-managed databases, find the backup job, confirm it ran, and confirm the output
exists on disk with a recent timestamp and a plausible size.

**PASS**: a schedule that has demonstrably run, with a stated retention window, on a plan
tier that includes it. Schema recoverable too: migrations in version control count.

**False pass**: a backup job that has been failing silently for weeks. Check the last
successful run, not the configuration. A backup nobody has restored from is a hypothesis;
if a restore has ever been tested, say so in the evidence, because that is the strongest
version of this row.
