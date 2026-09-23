import fs from 'node:fs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function segment(value, index) {
  return value && typeof value === 'object' && !Array.isArray(value) && typeof value.id === 'string'
    ? `[id=${value.id}]`
    : `[${index}]`;
}

function statusRecords(value, recordPath = '$', records = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => statusRecords(item, `${recordPath}${segment(item, index)}`, records));
    return records;
  }
  if (!value || typeof value !== 'object') return records;
  if (typeof value.status === 'string') records.set(recordPath, value);
  for (const [key, item] of Object.entries(value)) {
    if (key !== 'status') statusRecords(item, `${recordPath}.${key}`, records);
  }
  return records;
}

function explicitReason(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** Protect document- and record-level locked design states before persistence. */
export function guardDesignLocks(outputPath, next, options = {}) {
  const previous = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : null;
  const previousRecords = previous ? statusRecords(previous) : new Map();
  const nextRecords = statusRecords(next);

  for (const [recordPath, record] of nextRecords) {
    const prior = previousRecords.get(recordPath);
    if (record.status === 'locked' && prior?.status !== 'locked' && !explicitReason(options.lockReason)) {
      throw new Error(`Locking ${recordPath} requires an explicit current user lock request`);
    }
  }

  for (const [recordPath, prior] of previousRecords) {
    if (prior.status !== 'locked') continue;
    const nextRecord = nextRecords.get(recordPath);
    if ((!nextRecord || !same(prior, nextRecord)) && !explicitReason(options.lockedChangeReason)) {
      throw new Error(`Locked design ${recordPath} cannot change without an explicit current user request`);
    }
  }

  return next;
}
