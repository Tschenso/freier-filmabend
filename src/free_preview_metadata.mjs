import {parseAvailability} from './free_availability.mjs';
import {safeDirectUrl, safeImageUrl, textValue, normalizeText, withCategories} from './free_catalog.mjs';

export function decodeAttribute(value = '') {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#39|#(\d+)|#x([0-9a-f]+));/gi, (entity, decimal, hex) => {
    if (decimal || hex) {const code = parseInt(decimal || hex, hex ? 16 : 10); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';}
    return ({'&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&lt;':'<','&gt;':'>'})[entity.toLowerCase()] || entity;
  });
}
export function parsePreviewMetadata(html, record, sourceUrl, checkedAt) {
  if (!safeDirectUrl(record.provider, sourceUrl)) throw new Error('Unsafe preview source.');
  const meta = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = {};
    for (const attr of match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attributes[attr[1].toLowerCase()] = decodeAttribute(attr[2] ?? attr[3]);
    const name = (attributes.property || attributes.name || '').toLowerCase();
    if (name && !meta.has(name)) meta.set(name, attributes.content || '');
  }
  // Only descriptive JSON-LD, never provider JavaScript or video URLs.
  const items = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {const parsed = JSON.parse(match[1]); items.push(...(Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed]));} catch { /* Optional malformed metadata is ignored. */ }
  }
  const video = items.find(item => ['Movie','VideoObject'].includes(item?.['@type']));
  const officialTitle = normalizeText(meta.get('og:title') || video?.name || '');
  const words = normalizeText(record.title).split(/[^a-z0-9äöü]+/).filter(word => word.length >= 4 && !['film','filme','folge','doku','reportage','originalversion','untertitel','teil','ganze','sendung'].includes(word));
  if (!officialTitle || words.length && !words.some(word => officialTitle.includes(word))) return {image:null, metadataGenres:[], previewCheckedAt:checkedAt};
  const value = meta.get('og:image') || meta.get('twitter:image') || (Array.isArray(video?.thumbnailUrl) ? video.thumbnailUrl[0] : video?.thumbnailUrl);
  const image = safeImageUrl(record.provider, value);
  const genres = Array.isArray(video?.genre) ? video.genre : typeof video?.genre === 'string' ? [video.genre] : [];
  return {image: image ? {url:image,sourceUrl,checkedAt} : null, metadataGenres: genres.map(value=>textValue(value,60)).filter(Boolean).slice(0,8), previewCheckedAt:checkedAt, ...parseAvailability(html,record,sourceUrl,checkedAt)};
}

async function publicHead(record) {
  let url = record.url;
  for (let hop = 0; hop < 4; hop++) {
    if (!safeDirectUrl(record.provider,url)) throw new Error('Non-title redirect rejected.');
    const response = await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Local-Free-Film-Catalog/1.1'}});
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel();
      if (!location) throw new Error('Redirect without location.'); url = new URL(location,url).href; continue;
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {await response.body?.cancel(); throw new Error('Title metadata unavailable.');}
    const reader = response.body.getReader(), decoder = new TextDecoder(); let html = '', size = 0;
    try {
      for (;;) {
        const {done,value} = await reader.read(); if(done) break;
        size += value.byteLength; if(size > (record.provider === 'arte' ? 1250000 : 180000)) throw new Error('Metadata head limit.');
        html += decoder.decode(value,{stream:true});
        const end = html.toLowerCase().indexOf('</head>');
        if(end >= 0 && record.provider !== 'arte') {html = html.slice(0,end+7); break;}
        if(record.provider === 'arte' && /Verfügbar bis zum \d{2}\/\d{2}\/\d{4}/.test(html)) break;
        // ARTE embeds large styles later in the head. Stop as soon as the two
        // complete descriptive tags are available; styles/scripts are irrelevant.
        if (record.provider !== 'arte' && /<meta\b[^>]*(?:property|name)=["']og:image["'][^>]*>/i.test(html) && /<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*>/i.test(html)) break;
      }
    } finally {await reader.cancel();}
    return {html,url};
  }
  throw new Error('Redirect limit.');
}

export async function enrichPreviews(records, previousRecords = []) {
  const previous = new Map(previousRecords.map(record=>[record.url,record]));
  const now = new Date().toISOString(), counts = {requested:0, images:0, missing:0, reused:0, perProvider:{}};
  let cursor = 0;
  const result = records.map(record => withCategories({...record}));
  const candidates = result.filter(record=>['arte','zdf','ard'].includes(record.provider));
  if (candidates.length > 1100) throw new Error('Bounded title metadata limit exceeded; retain previous catalogue.');
  await Promise.all(Array.from({length:6}, async () => {
    while(cursor < candidates.length) {
      const record = candidates[cursor++], old = previous.get(record.url);
      if(old?.previewCheckedAt && Date.now()-Date.parse(old.previewCheckedAt)<7*86400000 && (record.provider !== 'arte' || old.availabilityCheckedAt && Date.now()-Date.parse(old.availabilityCheckedAt)<12*3600000)) {
        record.image = safeImageUrl(record.provider,old.image?.url) ? old.image : null;
        record.metadataGenres = [...new Set([...(record.metadataGenres || []),...(old.metadataGenres || [])])]; record.previewCheckedAt = old.previewCheckedAt; for(const key of ['expiresAt','expiryPrecision','availabilitySource','availabilityCheckedAt']) if(old[key] !== undefined) record[key]=old[key]; counts.reused++;
      } else {
        counts.requested++;
        try {const page = await publicHead(record); const meta = parsePreviewMetadata(page.html,record,page.url,now); meta.metadataGenres = [...new Set([...(record.metadataGenres || []),...meta.metadataGenres])]; Object.assign(record,meta);}
        catch {record.image = null; record.previewCheckedAt = now;}
      }
      Object.assign(record,withCategories(record));
      counts[record.image ? 'images':'missing']++;
      const tally = counts.perProvider[record.provider] ||= {images:0,missing:0}; tally[record.image ? 'images':'missing']++;
      if ((counts.images+counts.missing)%60 === 0) process.stdout.write('Titelbilder: '+(counts.images+counts.missing)+' / '+candidates.length+' Metadaten geprüft\n');
    }
  }));
  return {records:result, previewSummary:{...counts, checkedAt:now, source:'Official title-page Open Graph metadata; image bytes remain on provider CDN', maxTitlePages:1100, maxConcurrent:6, maxHeadBytes:1250000, defaultHeadBytes:180000}};
}
