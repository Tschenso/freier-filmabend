import {PROVIDERS,safeDirectUrl,safeImageUrl,safeSourceUrl,matchesRecord,audienceTags,genreTags} from './free_catalog.mjs';
export function validateCatalogue(data) {
  if (data.format !== 'local-free-catalog/1' || !Array.isArray(data.records) || !data.records.length || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error('Invalid catalogue.');
  const ids = new Set();
  for (const record of data.records) {
    if (typeof record.title !== 'string' || !record.title.trim() || !safeDirectUrl(record.provider, record.url) || !matchesRecord(record, {}, 0) || !Number.isFinite(Date.parse(record.fetchedAt)) || ids.has(record.url)) throw new Error('Invalid, unsafe or duplicate catalogue entry.');
    ids.add(record.url);
    if (!safeSourceUrl(record)) throw new Error('Free access evidence missing.');
    if(record.expiresAt !== null && (!Number.isFinite(record.expiresAt) || !safeDirectUrl(record.provider,record.availabilitySource) || !Number.isFinite(Date.parse(record.availabilityCheckedAt)))) throw new Error('Invalid availability evidence.');
    if (record.image && (!safeImageUrl(record.provider,record.image.url) || !Number.isFinite(Date.parse(record.image.checkedAt)) || !(safeDirectUrl(record.provider,record.image.sourceUrl) || safeSourceUrl({...record,sourceUrl:record.image.sourceUrl})))) throw new Error('Unsafe or unconfirmed preview metadata.');
    if (record.audiences && JSON.stringify(record.audiences) !== JSON.stringify(audienceTags(record)) || record.categories && JSON.stringify(record.categories) !== JSON.stringify(genreTags(record))) throw new Error('Catalogue categories are inconsistent.');
  }
  for (const id of Object.keys(PROVIDERS)) if (!data.records.some(r => r.provider === id)) throw new Error('Missing provider: ' + id);
  return true;
}
