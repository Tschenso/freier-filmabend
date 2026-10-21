import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {API_URL, PROVIDERS, RTL_FREE_PAGE, buildQuery, normalizeMediathek, normalizeJoyn, parseJoynPage, parseJoynMoviePage, parseRTLFreePage, deduplicate, matchesRecord, retainFirstSeen} from './free_catalog.mjs';
import {sha256, writeOwnedFile} from './free_catalog_files.mjs';
import {enrichPreviews} from './free_preview_metadata.mjs';
import {KIKA_API,normalizeKika,parseNetzkino} from './free_extra_providers.mjs';
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_PATH = path.join(APP_ROOT, 'data', 'free_catalog.json');
export const JOYN_PAGES = ['https://www.joyn.de/filme', ...['action-abenteuer', 'doku', 'drama', 'horror', 'komoedie', 'krimi'].map(genre => 'https://www.joyn.de/filme/genre/' + genre), 'https://www.joyn.de/collections/kinder'];
export const JOYN_YOUTH_PAGES = ['https://www.joyn.de/filme/sommer'];

async function responseBytes(url, options = {}) {
  const response = await fetch(url, {...options, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(18000),
    headers: {'User-Agent': 'Local-Free-Film-Catalog/1.0', ...(options.headers || {})}});
  if (!response.ok) throw new Error('Public source unavailable (' + response.status + '): ' + url);
  if (Number(response.headers.get('content-length')) > 4_000_000) throw new Error('Unexpectedly large metadata response.');
  const reader = response.body.getReader(); let bytes = 0, parts = [];
  for (;;) {const {done, value} = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 4_000_000) {await reader.cancel(); throw new Error('Metadata size limit reached.');} parts.push(Buffer.from(value));}
  return Buffer.concat(parts);
}
export async function collect({persist=true} = {}) {
  const fetchedAt = new Date().toISOString(), records = [], sources = [];
  // Bounded catalogue requests plus optional official title-page image metadata.
  // No authentication, account data, media/image-byte downloads or recursive crawling.
  for (const provider of ['arte', 'zdf', 'ard']) for (const kind of ['film', 'doc']) {
    const request = buildQuery({provider, kind, size: 180, minDuration: 600});
    const bytes = await responseBytes(API_URL, {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(request)});
    const data = JSON.parse(bytes);
    if (data.err || !Array.isArray(data.result?.results)) throw new Error('Invalid MediathekViewWeb response.');
    const normalized = data.result.results.map(entry => normalizeMediathek(entry, fetchedAt)).filter(entry => entry?.provider === provider && entry.kind === kind);
    if (!normalized.length) throw new Error('Expected catalogue missing: ' + provider + '/' + kind);
    records.push(...normalized);
    sources.push({provider, kind, url: API_URL, request, retrieved: data.result.results.length, accepted: normalized.length,
      indexTimestamp: data.result.queryInfo?.filmlisteTimestamp || null, totalMatchesBeforeValidation: data.result.queryInfo?.totalResults || null,
      sha256: sha256(bytes), fetchedAt});
    process.stdout.write(PROVIDERS[provider].name + ' / ' + kind + ': ' + normalized.length + ' eligible metadata records\n');
  }
  for (const provider of ['arte','zdf','ard']) for (const audience of ['children','youth']) {
    const request = buildQuery({provider,kind:'film',audience,size:160,minDuration:600});
    const bytes = await responseBytes(API_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(request)});
    const data = JSON.parse(bytes);
    if(data.err || !Array.isArray(data.result?.results)) throw new Error('Invalid targeted catalogue response.');
    const normalized = data.result.results.map(entry=>normalizeMediathek(entry,fetchedAt)).filter(entry=>entry?.provider===provider && entry.kind==='film');
    records.push(...normalized);
    sources.push({provider,audience,url:API_URL,request,retrieved:data.result.results.length,accepted:normalized.length,sha256:sha256(bytes),fetchedAt});
    process.stdout.write(PROVIDERS[provider].name+' / '+audience+': '+normalized.length+' gezielte Metadaten\n');
  }
  for (const url of JOYN_PAGES) {
    const bytes = await responseBytes(url), page = parseJoynPage(bytes.toString('utf8'));
    const assets = page.blocks.flatMap(block => block.assets || []).filter(asset => asset.__typename === 'Movie');
    const normalized = assets.map(asset => normalizeJoyn(asset, url, fetchedAt)).filter(Boolean);
    if (!normalized.length) throw new Error('Expected Joyn Free catalogue missing: ' + url);
    records.push(...normalized);
    sources.push({provider: 'joyn', url, retrieved: assets.length, accepted: normalized.length, excluded: assets.length - normalized.length, sha256: sha256(bytes), fetchedAt});
    process.stdout.write('Joyn Free: ' + normalized.length + ' AVOD records from ' + new URL(url).pathname + '\n');
  }
  for(const url of JOYN_YOUTH_PAGES) {
    const bytes = await responseBytes(url), record = parseJoynMoviePage(bytes.toString('utf8'),url,fetchedAt);
    if(record) records.push(record);
    sources.push({provider:'joyn',url,accepted:record ? 1:0,evidence:'explicit-avod-coming-of-age-movie',sha256:sha256(bytes),fetchedAt});
  }
  const rtlBytes = await responseBytes(RTL_FREE_PAGE), rtl = parseRTLFreePage(rtlBytes.toString('utf8'), RTL_FREE_PAGE, fetchedAt);
  if (!rtl.length) throw new Error('Expected RTL free selection missing; no replacement.');
  records.push(...rtl);
  sources.push({provider: 'rtl', url: RTL_FREE_PAGE, accepted: rtl.length, evidence: 'explicit-official-free-selection', sha256: sha256(rtlBytes), fetchedAt});
  let kikaCount=0;
  for(let page=0;page<8;page++) {
    const url=KIKA_API+'?page='+page+'&platform=kikade', bytes=await responseBytes(url), payload=JSON.parse(bytes);
    if(!Array.isArray(payload.content)) throw new Error('KiKA public film collection missing.');
    const accepted=payload.content.map(item=>normalizeKika(item,fetchedAt)).filter(Boolean);
    records.push(...accepted); kikaCount+=accepted.length;
    sources.push({provider:'kika',url,accepted:accepted.length,sha256:sha256(bytes),fetchedAt});
    if(!payload.links?.next) break;
  }
  if(!kikaCount) throw new Error('No available KiKA films; previous catalogue retained.');
  const netzBytes=await responseBytes(PROVIDERS.netzkino.home), netz=parseNetzkino(netzBytes.toString('utf8'),fetchedAt);
  if(!netz.length) throw new Error('Netzkino free film selection missing; previous catalogue retained.');
  records.push(...netz); sources.push({provider:'netzkino',url:PROVIDERS.netzkino.home,accepted:netz.length,sha256:sha256(netzBytes),fetchedAt});
  let previous = [];
  try {const current = JSON.parse(await fs.readFile(DATA_PATH,'utf8')); if(current.format === 'local-free-catalog/1') previous = current.records;} catch(error) {if(error.code !== 'ENOENT') throw error;}
  const enriched = await enrichPreviews(deduplicate(records),previous);
  const unique = retainFirstSeen(enriched.records.filter(record=>matchesRecord(record)),previous,fetchedAt);
  const catalogue = {format: 'local-free-catalog/1', fetchedAt, region: 'DE', sources, previewSummary:enriched.previewSummary,
    coverage: {arte: 'bounded-index-selection-and-live-search', zdf: 'bounded-index-selection-and-live-search', ard: 'bounded-index-selection-and-live-search', joyn: 'eight-public-catalogues-and-one-youth-title-avod-only', rtl: 'explicit-official-free-selection-only', kika:'public-film-collection-max-eight-pages',netzkino:'public-home-avod-family-selection'}, records: unique};
  if(!persist) return catalogue;
  const result = await writeOwnedFile(DATA_PATH, JSON.stringify(catalogue, null, 2) + '\n', {
    previous: path.join(APP_ROOT, 'data', 'free_catalog.previous.json'),
    validate: bytes => {try {return JSON.parse(bytes).format === 'local-free-catalog/1';} catch {return false;}}
  });
  return {...result, titles: unique.length, providers: Object.fromEntries(Object.keys(PROVIDERS).map(id => [id, unique.filter(r => r.provider === id).length]))};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || process.argv[2] !== '--refresh') throw new Error('Use --refresh to request the bounded public metadata update.');
  process.stdout.write(JSON.stringify(await collect()) + '\n');
}
