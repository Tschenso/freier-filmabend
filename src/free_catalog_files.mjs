import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// A single verified predecessor, with fixed paths selected by the caller.
export async function writeOwnedFile(file, bytes, {previous, validate} = {}) {
  const next = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (!validate(next)) throw new Error('Refusing invalid generated artifact.');
  await fs.mkdir(path.dirname(file), {recursive: true});
  let old = null;
  try {old = await fs.readFile(file);} catch (error) {if (error.code !== 'ENOENT') throw error;}
  if (old?.equals(next)) return {changed: false, bytes: next.length, sha256: sha256(next)};
  if (old && !validate(old)) throw new Error('Refusing to overwrite an unrelated file: ' + file);
  const stage = file + '.stage-' + process.pid;
  const backupStage = previous + '.stage-' + process.pid;
  let stageCreated = false, backupCreated = false;
  try {
    await fs.writeFile(stage, next, {flag: 'wx'});
    stageCreated = true;
    if (sha256(await fs.readFile(stage)) !== sha256(next)) throw new Error('Staged artifact verification failed.');
    if (old) {
      let prior = null;
      try {prior = await fs.readFile(previous);} catch (error) {if (error.code !== 'ENOENT') throw error;}
      if (prior && !validate(prior)) throw new Error('Refusing to replace an unrelated predecessor.');
      if (sha256(await fs.readFile(file)) !== sha256(old)) throw new Error('Concurrent modification; no overwrite.');
      await fs.writeFile(backupStage, old, {flag: 'wx'});
      backupCreated = true;
      if (sha256(await fs.readFile(backupStage)) !== sha256(old)) throw new Error('Predecessor verification failed.');
      await fs.rename(backupStage, previous);
    }
    await fs.rename(stage, file);
    if (sha256(await fs.readFile(file)) !== sha256(next)) throw new Error('Final artifact verification failed.');
    return {changed: true, bytes: next.length, sha256: sha256(next), predecessor: old ? previous : null};
  } finally {
    // Only this invocation's two exact staging paths are owned here.
    if (stageCreated) await fs.rm(stage, {force: true});
    if (backupCreated) await fs.rm(backupStage, {force: true});
  }
}
