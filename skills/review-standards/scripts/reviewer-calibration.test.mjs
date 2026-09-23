import assert from 'node:assert/strict';
import test from 'node:test';
import {calibrationRequest, validateCalibration, verifyReadiness} from './reviewer-calibration.mjs';
import {digest} from './review-ledger.mjs';

test('prepared calibration binds reviewer effort, instructions and checker bytes', () => {
	const request = calibrationRequest();
	for (const file of [
		'agents/ui-reviewer.toml',
		'skills/review-standards/references/evidence-ledger.md',
		'skills/review-standards/scripts/review-ledger.mjs',
	])
		assert.match(request.inputs[file], /^[0-9a-f]{64}$/);
	const {fingerprint, ...payload} = request;
	assert.equal(fingerprint, digest(payload));
});

test('calibration rejects tampered scope before processing reports', () => {
	const request = calibrationRequest();
	request.lanes = {};
	assert.throws(() => validateCalibration(request, null, null), /Modified request payload/);
});

test('old reviews cannot certify configuration first captured at seal time', () => {
	const request = calibrationRequest();
	const record = {request: structuredClone(request), inputs: request.inputs};
	record.request.inputs['agents/ui-reviewer.toml'] = 'old-model-configuration';
	assert.throws(() => verifyReadiness(record), /inputs differ from reviewed request/);
	record.inputs = record.request.inputs;
	assert.throws(() => verifyReadiness(record), /Calibration inputs changed/);
});

test('relocation changes evidence root only and still requires original reports', () => {
	const {fingerprint, ...payload} = calibrationRequest();
	payload.repo = 'C:/synthetic-prior-calibration-location';
	const request = {...payload, fingerprint: digest(payload)};
	assert.throws(() => validateCalibration(request, null, null), /Stale review unit/);
	assert.throws(() => validateCalibration(request, null, null, true), /Missing or stale primary/);
	request.inputs = {};
	assert.throws(() => validateCalibration(request, null, null, true), /Modified request payload/);
});
