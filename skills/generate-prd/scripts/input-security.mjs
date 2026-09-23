import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const MAX_DURABLE_STRING_LENGTH = 128 * 1024;
const MAX_DECODE_PASSES = 4;
const MAX_RESEARCH_DEPTH = 32;
const MAX_RESEARCH_VALUES = 10_000;

const credentialQueryKeys = new Set([
  'api-key', 'apikey', 'access-token', 'auth-token', 'authorization', 'bearer', 'client-assertion',
  'client-secret', 'credential', 'id-token', 'jwt', 'key', 'password', 'passwd', 'private-key', 'pwd',
  'refresh-token', 'sas', 'secret', 'security-token', 'session-token', 'sig', 'signature', 'token',
  'x-amz-credential', 'x-amz-security-token', 'x-amz-signature',
]);

function fail(message) {
  throw new Error(message);
}

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be non-empty text`);
  return value;
}

function normalizedCredentialKey(value) {
  return value.trim().toLowerCase().replace(/[_.\s]+/g, '-').replace(/-+/g, '-');
}

function decodedTextVariants(value, label) {
  if (value.length > MAX_DURABLE_STRING_LENGTH) fail(`${label} exceeds the durable research text limit`);
  const variants = [value];
  let current = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
    if (!/%[0-9a-f]{2}/i.test(current)) return variants;
    const decodable = current.replace(/%(?![0-9a-f]{2})/gi, '%25');
    let next;
    try {
      next = decodeURIComponent(decodable);
    } catch {
      fail(`${label} contains invalid encoded text`);
    }
    if (next.length > MAX_DURABLE_STRING_LENGTH) fail(`${label} exceeds the durable research text limit after decoding`);
    if (next === current) return variants;
    variants.push(next);
    current = next;
  }
  if (/%[0-9a-f]{2}/i.test(current)) fail(`${label} contains too many encoding layers`);
  return variants;
}

function containsPrivatePath(value) {
  return /file:\/+[^\s]*/i.test(value)
    || /(?:^|[\s("'`=])(?:[a-z]:[\\/]|\\\\[^\\/\s]+[\\/]|~[\\/]|\/(?:home|users|private|tmp|var|etc|root|library|mnt\/[a-z])\/)/i.test(value);
}

function containsVendorToken(value) {
  return /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|npm_[A-Za-z0-9]{20,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}|sk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{20,})\b/.test(value);
}

function passwordValueLooksLikeCredential(value, quoted) {
  const candidate = value.trim();
  if (candidate === '') return false;
  if (/^(?:required|optional|minimum|maximum|masked|hidden|visible|valid|invalid|enabled|disabled)$/i.test(candidate)) return false;
  if (/\s/.test(candidate)) return false;
  if (quoted) return candidate.length >= 8;
  return candidate.length >= 8;
}

function containsCredentialAssignment(value) {
  const assignment = /(?:^|[/?&#\s,;("'`])((?:api[_. -]?key|access[_. -]?token|auth[_. -]?token|authorization|bearer|client[_. -]?assertion|client[_. -]?secret|credential|id[_. -]?token|jwt|key|password|passwd|private[_. -]?key|pwd|refresh[_. -]?token|sas|secret|security[_. -]?token|session[_. -]?token|sig|signature|token|x[_. -]?amz[_. -]?credential|x[_. -]?amz[_. -]?security[_. -]?token|x[_. -]?amz[_. -]?signature))\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^\s&#;,]+))/gi;
  for (const match of value.matchAll(assignment)) {
    const key = normalizedCredentialKey(match[1]);
    const assigned = match[2] ?? match[3] ?? match[4] ?? '';
    const quoted = match[2] !== undefined || match[3] !== undefined;
    if (key === 'password' || key === 'passwd' || key === 'pwd') {
      if (passwordValueLooksLikeCredential(assigned, quoted)) return true;
    } else if (assigned.trim().length >= 4) {
      return true;
    }
  }
  return false;
}

function scanDurableString(value, label) {
  for (const candidate of decodedTextVariants(value, label)) {
    if (containsPrivatePath(candidate)) fail(`${label} must not contain a private local path`);
    if (/\b(?:authorization\s*[:=]\s*)?bearer\s+[A-Za-z0-9._~+\/-]{8,}={0,2}\b/i.test(candidate)
      || containsVendorToken(candidate)
      || containsCredentialAssignment(candidate)) {
      fail(`${label} must not contain credentials or secrets`);
    }
  }
}

/** Reject secrets and private-machine paths anywhere in a bounded durable research record. */
export function validateDurableResearch(value, label) {
  const seen = new WeakSet();
  const work = [{value, label, depth: 0}];
  let visited = 0;
  while (work.length) {
    const current = work.pop();
    visited += 1;
    if (visited > MAX_RESEARCH_VALUES) fail(`${label} exceeds the durable research value limit`);
    if (current.depth > MAX_RESEARCH_DEPTH) fail(`${current.label} exceeds the durable research nesting limit`);
    if (typeof current.value === 'string') {
      scanDurableString(current.value, current.label);
      continue;
    }
    if (!current.value || typeof current.value !== 'object' || seen.has(current.value)) continue;
    seen.add(current.value);
    if (Array.isArray(current.value)) {
      current.value.forEach((item, index) => work.push({value: item, label: `${current.label}[${index}]`, depth: current.depth + 1}));
    } else {
      for (const [key, item] of Object.entries(current.value)) {
        work.push({value: item, label: `${current.label}.${key}`, depth: current.depth + 1});
      }
    }
  }
  return value;
}

function privateIpv4(hostname) {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b, c] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || (b === 168) || (b === 0 && c === 2)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113);
}

function privateIpv6(hostname) {
  const address = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const parts = address.split('::');
  let hextets;
  if (parts.length <= 2) {
    const left = parts[0] === '' ? [] : parts[0].split(':');
    const right = parts.length === 1 || parts[1] === '' ? [] : parts[1].split(':');
    const missing = 8 - left.length - right.length;
    if (missing >= 0) {
      const values = [...left, ...Array(missing).fill('0'), ...right];
      if (values.length === 8 && values.every(part => /^[0-9a-f]{1,4}$/.test(part))) hextets = values.map(part => Number.parseInt(part, 16));
    }
  }
  const embeddedIpv4IsPrivate = hextets ? privateIpv4([
    hextets[6] >> 8,
    hextets[6] & 0xff,
    hextets[7] >> 8,
    hextets[7] & 0xff,
  ].join('.')) : false;
  const ipv4Compatible = hextets?.slice(0, 6).every(value => value === 0);
  const nat64WellKnown = hextets?.[0] === 0x64 && hextets?.[1] === 0xff9b
    && hextets.slice(2, 6).every(value => value === 0);
  const nat64Local = hextets?.[0] === 0x64 && hextets?.[1] === 0xff9b && hextets?.[2] === 1;
  return address === '::' || address === '::1'
    || /^f[cd]/.test(address)
    || /^fe[89ab]/.test(address)
    || /^ff/.test(address)
    || /^2001:db8(?::|$)/.test(address)
    || /^::ffff:/.test(address)
    || ipv4Compatible
    || nat64Local
    || (nat64WellKnown && embeddedIpv4IsPrivate);
}

function isPublicHostname(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  const ipVersion = net.isIP(host);
  if (ipVersion === 4) return !privateIpv4(host);
  if (ipVersion === 6) return !privateIpv6(host);
  if (!host.includes('.')) return false;
  if (/(?:^|\.)(?:localhost|local|internal|intranet|lan|home|corp|localdomain|test|invalid)$/.test(host)) return false;
  return true;
}

/** Require a public HTTPS research URL without embedded credentials or secret query keys. */
export function validatePublicHttpsUrl(value, label) {
  requiredText(value, label);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be a valid absolute URL`);
  }
  if (parsed.protocol !== 'https:') fail(`${label} must use public HTTPS`);
  if (parsed.username || parsed.password) fail(`${label} must not contain URL credentials`);
  if (!isPublicHostname(parsed.hostname)) fail(`${label} must use a public HTTPS host`);
  scanDurableString(parsed.pathname, `${label} path`);
  scanDurableString(parsed.search, `${label} query`);
  scanDurableString(parsed.hash, `${label} fragment`);
  for (const key of parsed.searchParams.keys()) {
    const decodedKeys = decodedTextVariants(key, `${label} query key`);
    if (decodedKeys.some(candidate => credentialQueryKeys.has(normalizedCredentialKey(candidate)))) {
      fail(`${label} must not contain credential query parameters`);
    }
  }
  return parsed;
}

/** Accept a narrow ASCII repository-relative path with one optional local fragment. */
export function validateRepositoryRelativeLink(value, label) {
  requiredText(value, label);
  if (value.includes('%')) fail(`${label} must not contain encoded path text`);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*(?:#[A-Za-z][A-Za-z0-9_.:-]*)?$/.test(value)) {
    fail(`${label} must be a repository-relative link using safe path and optional-fragment characters`);
  }
  const pathname = value.split('#', 1)[0];
  if (pathname.split('/').some(segment => segment === '.' || segment === '..')) {
    fail(`${label} must not traverse outside the repository`);
  }
  return value;
}

/** Escape authored inline text before placing it into generated Markdown. */
export function escapeMarkdownText(value) {
  return String(value)
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/([`*_{}\[\]()#+.!|<>])/g, '\\$1');
}

function realDirectory(value, label) {
  requiredText(value, label);
  const absolute = path.resolve(value);
  let real;
  try {
    real = fs.realpathSync.native(absolute);
  } catch {
    fail(`${label} is missing: ${absolute}`);
  }
  if (!fs.statSync(real).isDirectory()) fail(`${label} must identify a directory: ${absolute}`);
  return real;
}

function sameOrContained(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

/** Canonicalize an image asset root and bind it below a non-filesystem source root. */
export function authorizeAssetRoot(assetRoot, sourceRoot, label = 'assetRoot') {
  const canonicalSourceRoot = realDirectory(sourceRoot, 'sourceRoot');
  if (canonicalSourceRoot === path.parse(canonicalSourceRoot).root) fail('sourceRoot must not be a filesystem root for asset access');
  const canonicalAssetRoot = realDirectory(assetRoot, label);
  if (canonicalAssetRoot === path.parse(canonicalAssetRoot).root) fail(`${label} must not be a filesystem root`);
  if (!sameOrContained(canonicalSourceRoot, canonicalAssetRoot)) fail(`${label} must stay within sourceRoot`);
  return {assetRoot: canonicalAssetRoot, sourceRoot: canonicalSourceRoot};
}
