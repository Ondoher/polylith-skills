import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {prepareSeries} from './series.mjs';

const governance = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const [source, output] = process.argv.slice(2);
assert(source && output, 'Supply source suite directory and a new output directory');
const manifest = prepareSeries(path.resolve(source), path.resolve(output), governance);
console.log(JSON.stringify({status: 'prepared-not-executed', directory: path.resolve(output), manifest}, null, 2));
