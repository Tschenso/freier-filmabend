// Public catalogue metadata only. Shared by the collector, standalone page and tests.
export const API_URL = 'https://mediathekviewweb.de/api/query';
export const RTL_FREE_PAGE = 'https://plus.rtl.de/rtlplus-root/kostenlose-inhalte-main-root-service-f_193';
export const PROVIDERS = Object.freeze({
  arte: {name: 'ARTE', channels: ['ARTE.DE'], home: 'https://www.arte.tv/de/', hosts: ['arte.tv', 'www.arte.tv']},
  zdf: {name: 'ZDF', channels: ['ZDF', 'ZDFinfo', 'ZDFneo', 'ZDF-tivi'], home: 'https://www.zdf.de/', hosts: ['zdf.de', 'www.zdf.de', 'zdfheute.de', 'www.zdfheute.de']},
  ard: {name: 'ARD', channels: ['ARD', 'ARD-alpha', 'BR', 'HR', 'MDR', 'NDR', 'Radio Bremen TV', 'RBB', 'SR', 'SWR', 'WDR', 'ONE'], home: 'https://www.ardmediathek.de/', hosts: ['ardmediathek.de', 'www.ardmediathek.de']},
  joyn: {name: 'Joyn Free', channels: [], home: 'https://www.joyn.de/filme', hosts: ['www.joyn.de', 'joyn.de']},
  rtl: {name: 'RTL+ Free', channels: [], home: RTL_FREE_PAGE, hosts: ['plus.rtl.de']},
  kika: {name: 'KiKA', channels: ['KiKA'], home: 'https://www.kika.de/filme/filme-106', hosts: ['www.kika.de','kika.de']},
  netzkino: {name: 'Netzkino', channels: [], home: 'https://www.netzkino.de/category?id=kinderkino', hosts: ['www.netzkino.de','netzkino.de']}
});
export const KINDS = Object.freeze({film: 'Film', doc: 'Doku & Reportage'});
export const AUDIENCES = Object.freeze({children: 'Kinder', youth: 'Jugend', family: 'Familie', unknown: 'Nicht zugeordnet'});
export const GENRES = Object.freeze({animation: 'Animation', adventure: 'Abenteuer & Fantasy', comedy: 'Komödie', drama: 'Drama & Liebe', crime: 'Krimi & Thriller', action: 'Action', nature: 'Natur & Tiere', science: 'Wissen & Technik', history: 'Geschichte', society: 'Gesellschaft', food:'Essen & Kochen',shortfilm:'Kurzfilme',holidays:'Weihnachten & Feiertage',sport:'Sport & Bewegung',travel:'Reisen & Länder',culture:'Kultur, Musik & Kunst',books:'Buchverfilmungen'});
export const AUDIENCE_TERMS = Object.freeze({children: ['Kinderfilm', 'Kinderfilme', 'ZDFtivi', 'ZDFchen', 'Märchen', 'Lollywood'], youth: ['Jugendfilm', 'Jugendfilme', 'Coming of Age', 'Coming-of-Age', 'Teenagerfilm'], family: ['Familienfilm', 'Familienfilme', 'Kinderfilm', 'Märchen']});
export const IMAGE_HOSTS = Object.freeze({arte: ['api-cdn.arte.tv'], zdf: ['www.zdf.de'], ard: ['www.ardmediathek.de', 'api.ardmediathek.de'], joyn: ['img.joyn.de'], rtl: ['images-fio.rtlde.bedrock.tech'], kika: ['www.kika.de'], netzkino: ['d3owf1x34yi7gd.cloudfront.net']});
export const KIND_TERMS = Object.freeze({
  film: ['Kino', 'Spielfilm', 'Fernsehfilm', 'Filme', 'Tatort', 'Polizeiruf', 'Das kleine Fernsehspiel', 'Kinderfilm', 'Jugendfilm', 'Familienfilm', 'Märchen', 'Lollywood'],
  doc: ['Doku', 'Dokumentation', 'Reportage', 'Terra X', '37 Grad', 'Die Spur', 'Geschichte', 'Wissenschaft', 'Entdeckung der Welt', 'Natur', 'Hintergrund', 'Wissen', 'Story']
});

export function textValue(value, max = 240) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}
export function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss');
}
export function safeDirectUrl(provider, value) {
  if (!Object.hasOwn(PROVIDERS, provider) || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !PROVIDERS[provider].hosts.includes(url.hostname)) return null;
    if (provider === 'arte' && !/^\/de\/videos\/\d{6}-\d{3}-[A-Z]\//.test(url.pathname)) return null;
    if (provider === 'ard' && !url.pathname.startsWith('/video/')) return null;
    if (provider === 'joyn' && !/^\/filme\/[^/]+\/?$/.test(url.pathname)) return null;
    if (provider === 'rtl' && !/^\/[^/]+-p_\d+(?:\/video\/[^/]+-c_\d+)?\/?$/.test(url.pathname)) return null;
    if (provider === 'zdf' && (url.pathname === '/' || /\.(?:mp4|m3u8|mpd)$/i.test(url.pathname))) return null;
    if (provider === 'kika' && !/^\/(?:[a-z0-9-]+\/)+(?:[a-z0-9-]+-\d+)(?:\.html)?$/i.test(url.pathname)) return null;
    if (provider === 'netzkino') {
      if(url.pathname !== '/details' || !/^[a-z0-9-]+$/i.test(url.searchParams.get('id') || '') || [...url.searchParams.keys()].some(key=>key!=='id') || url.searchParams.getAll('id').length!==1) return null;
      url.hash=''; return url.href;
    }
    url.hash = ''; url.search = '';
    return url.href;
  } catch { return null; }
}
export function channelProvider(channel) {
  return Object.keys(PROVIDERS).find(id => PROVIDERS[id].channels.includes(channel)) || null;
}
export function safeImageUrl(provider, value) {
  if (!Object.hasOwn(IMAGE_HOSTS, provider) || typeof value !== 'string' || value.length > 2200) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !IMAGE_HOSTS[provider].includes(url.hostname)) return null;
    const patterns = {arte: /^\/img\/v2\/image\//, zdf: /^\/assets\//, ard: /^\/(?:img$|image-service\/images\/)/, joyn: /^\/(?:ingest|gn\/assets)\//, rtl: /^\/v2\/images\/\d+\/raw$/, kika: /\.(?:jpg|jpeg|png|webp)$/i, netzkino: /^\/image\/images\/uploaded\/.+\.(?:jpg|jpeg|png|webp)$/i};
    if (!patterns[provider].test(url.pathname)) return null;
    if (provider === 'ard' && url.pathname === '/img') {
      const nested = new URL(url.searchParams.get('url'));
      if (nested.protocol !== 'https:' || nested.hostname !== 'api.ardmediathek.de' || nested.username || nested.password || nested.port || !nested.pathname.startsWith('/image-service/images/')) return null;
    }
    url.hash = ''; return url.href;
  } catch {return null;}
}
export function audienceTags(record) {
  // A low age rating alone never establishes a children's or youth film.
  const rubric = normalizeText([record.topic, ...(record.genres || []), ...(record.metadataGenres || [])].join(' '));
  const explicit = normalizeText(record.description || '');
  const tags = [];
  const adult = Number.isFinite(record.age) && record.age >= 16;
  if (!adult && (/\b(kinder|kids|children|kinderkino|kinderfilm\w*|zdftivi|zdfchen|lollywood)\b/.test(rubric) || record.channel === 'ZDF-tivi' || record.provider === 'kika' || /\b(kinderfilm|kinderfilme)\b/.test(explicit) || record.provider === 'zdf' && /\/kinder\//.test(record.url))) tags.push('children');
  if (!(Number.isFinite(record.age) && record.age >= 18) && /\b(jugendfilm\w*|teenagerfilm\w*|teen|coming[ -]of[ -]age|young adult)\b/.test(rubric + ' ' + explicit)) tags.push('youth');
  if (!adult && (/\b(familie|family|familienfilm\w*|marchen\w*)\b/.test(rubric) || /\bfamilienfilm\w*\b/.test(explicit) || tags.includes('children'))) tags.push('family');
  return tags;
}
export function genreTags(record) {
  const rubric = normalizeText([record.topic,...(record.genres || []),...(record.metadataGenres || [])].join(' '));
  const raw=[record.title,record.topic,...(record.genres || []),...(record.metadataGenres || [])].join(' ').toLowerCase();
  const title=normalizeText(record.title), text=normalizeText([record.title,record.topic,record.description,...(record.genres || []),...(record.metadataGenres || [])].join(' '));
  // Broad themes need a title or rubric signal; incidental plot words are not a genre.
  const subject=rubric+' '+title;
  const patterns={animation:/animation|zeichentrick|trickfilm|anime/,adventure:/abenteuer|adventure|fantas[yi]|marchen|science fiction/,comedy:/comedy|komodie|humor/,drama:/drama|liebe|romanti|romance|herzkino/,crime:/krimi|crime|thriller|tatort|polizeiruf/,action:/action/,nature:/\b(?:natur(?:film|doku|schutz|geschichte)?|nature|tiere|tierwelt|wildlife|wildnis|ozean|ocean)\b/,science:/wissen|technik|forschung|terra x|pur\+/,history:/geschichte|histor|zeitgeschichte/,society:/gesellschaft|politik|37[ .-]*grad|die spur|weltspiegel|reportage/};
  const tags=Object.entries(patterns).filter(([id,pattern])=>pattern.test(id==='nature'?rubric+' '+title:rubric)).map(([id])=>id);
  if(/\bküchen?\b/.test(raw) || /\b(?:kuche|kochen|kochkunst|kulinar\w*|rezept(?:e|en|buch|ideen)?|kitchen|cooking|cuisine)\b/.test(subject)) tags.push('food');
  if(record.kind==='film' && Number.isFinite(record.duration) && record.duration<2700 && /\b(?:kurzfilm\w*|short film)\b/.test(text)) tags.push('shortfilm');
  if(/\b(?:weihnacht\w*|christmas|adventskalender|ostern|osterfest|halloween)\b/.test(subject)) tags.push('holidays');
  if(/\b(?:sport\w*|fussball\w*|football|basketball|handball|boxer\w*|boxen|olympi(?:ade\w*|sch\w*|a(?:sieg\w*|medaille\w*|rekord\w*)?)|turnen|leichtathletik|radrennen|jahrhundertspiel)\b/.test(subject)) tags.push('sport');
  if(record.kind==='doc' && /\b(?:reise(?:n|bericht\w*|doku\w*|film\w*|fieber|land\w*|ziel\w*)?|travel\w*|landerkunde|leben anderswo|unterwegs in|lander menschen abenteuer)\b/.test(subject)) tags.push('travel');
  if(/\b(?:kultur\w*|kunst(?:ler\w*|werk\w*|geschichte|szene|museum|ausstellung|akademie|markt)?|musik\w*|music\w*|tanz\w*|tanzer\w*|dance|theater|oper|ballett|literatur)\b/.test(subject)) tags.push('culture');
  if(/\b(?:literaturverfilmung|romanverfilmung|buchverfilmung|nach dem roman|nach der erzahlung|based on (?:a|the) novel)\b/.test(text)) tags.push('books');
  return tags;
}
export function accessibilityMetadata(record) {
  const text=normalizeText([record.title,...(record.variants || [])].join(' ')), result={};
  for(const [key,pattern] of [['audioDescription',/audiodeskription|horfassung/],['subtitles',/mit untertitel|deutsche[nr]? untertitel|\bomu\b/]]) {
    if(typeof record[key]==='boolean') result[key]=record[key];
    else if(pattern.test(text)) result[key]=true;
  }
  if(Object.keys(result).some(key=>record[key]===undefined)) result.accessibilityEvidence='Ausdrücklicher Hinweis in Titel oder Titelvariante; Player nicht getestet';
  return result;
}
export function withCategories(record) {
  return {...record,...accessibilityMetadata(record),audiences:audienceTags(record),categories:genreTags(record)};
}
export function retainFirstSeen(records,previousRecords,now) {
  const previous=new Map(previousRecords.map(r=>[r.url,r]));
  return records.map(record=>{const old=previous.get(record.url);return {...record,firstSeenAt:old?.firstSeenAt || old?.fetchedAt || now,firstSeenBaseline:old ? old.firstSeenBaseline ?? true : false};});
}
export function explicitAudienceGenres(description) {
  const text = normalizeText(description);
  return [['Kinderfilm',/\bkinderfilm\w*\b/],['Jugendfilm',/\bjugendfilm\w*\b/],['Coming of Age',/\bcoming[ -]of[ -]age\b/],['Familienfilm',/\bfamilienfilm\w*\b/]].filter(([,pattern])=>pattern.test(text)).map(([label])=>label);
}
export function safeSourceUrl(record) {
  if (record.evidence === 'kika-film-selection') return record.provider === 'kika' && (record.sourceUrl === PROVIDERS.kika.home || record.sourceUrl === record.url && Boolean(safeDirectUrl('kika',record.url)));
  if (record.evidence === 'netzkino-free-selection') return record.provider === 'netzkino' && (record.sourceUrl === PROVIDERS.netzkino.home || record.sourceUrl === record.url && Boolean(safeDirectUrl('netzkino',record.url)));
  if (record.evidence === 'mediathek-index') return record.sourceUrl === 'https://mediathekviewweb.de/';
  if (record.evidence === 'rtl-free-selection') return record.provider === 'rtl' && record.sourceUrl === RTL_FREE_PAGE;
  if (record.evidence === 'joyn-avod' && record.provider === 'joyn') {
    try {const url = new URL(record.sourceUrl); return url.origin === 'https://www.joyn.de' && !url.search && !url.hash && (/^(?:\/filme(?:\/genre\/[a-z-]+)?|\/collections\/kinder)$/.test(url.pathname) || record.sourceUrl === record.url && Boolean(safeDirectUrl('joyn',record.sourceUrl)));} catch {return false;}
  }
  return false;
}
export function classifyMediathek(entry) {
  const title = normalizeText(entry.title), topic = normalizeText(entry.topic), both = topic + ' ' + title;
  if (/\b(trailer|teaser|vorschau|kinotipp|filmtipp|making.of)\b/.test(title)) return null;
  if (/doku|reportage|terra x|37[ .-]*grad|die spur|geschichte|wissenschaft|entdeckung der welt|natur|hintergrund|wissen|\bstory\b/.test(topic)) return 'doc';
  if (/\b(dokumentation|reportage|dokufilm)\b/.test(title)) return 'doc';
  if (/kino|spielfilm|fernsehfilm|\bfilme\b|tatort|polizeiruf|das kleine fernsehspiel|kinderfilm|jugendfilm|familienfilm|marchen|lollywood/.test(both)) return 'film';
  return null;
}
export function normalizeMediathek(entry, fetchedAt) {
  const provider = channelProvider(entry.channel), kind = classifyMediathek(entry);
  const url = safeDirectUrl(provider, entry.url_website), title = textValue(entry.title, 220);
  if (!provider || !kind || !url || !title || !Number.isFinite(entry.duration) || entry.duration < 60) return null;
  return withCategories({
    id: provider + ':' + url, provider, kind, title, url,
    topic: textValue(entry.topic, 140), description: textValue(entry.description, 260),
    duration: entry.duration, publishedAt: Number.isFinite(entry.timestamp) ? entry.timestamp * 1000 : null,
    expiresAt: null, startsAt: null, fetchedAt, channel: textValue(entry.channel, 40),
    access: 'free', evidence: 'mediathek-index', sourceUrl: 'https://mediathekviewweb.de/', genres: [], age: null,
    image: null, metadataGenres: explicitAudienceGenres(entry.description), variants: []
  });
}
export function normalizeJoyn(asset, sourceUrl, fetchedAt) {
  if (asset.__typename !== 'Movie' || !Array.isArray(asset.licenseTypes) || !asset.licenseTypes.includes('AVOD')) return null;
  const markings = normalizeText(JSON.stringify(asset.markings || []));
  if (/plus|premium|subscription|svod/.test(markings)) return null;
  const url = safeDirectUrl('joyn', new URL(asset.path || '/', 'https://www.joyn.de/').href);
  const title = textValue(asset.title, 220);
  if (!url || !title) return null;
  const genres = (asset.genres || []).map(g => textValue(g.name, 60)).filter(Boolean).slice(0, 6);
  const kind = /doku|reportage|documentary/.test(normalizeText(genres.join(' '))) || sourceUrl.endsWith('/genre/doku') ? 'doc' : 'film';
  const image = safeImageUrl('joyn', asset.iconicImage?.url || asset.primaryImage?.defaultIconicImageUrl || asset.primaryImage?.url);
  return withCategories({
    id: 'joyn:' + url, provider: 'joyn', kind, title, url, topic: genres.join(' · '),
    description: textValue(asset.description, 260), duration: null, publishedAt: null, startsAt: null, expiresAt: null,
    fetchedAt, channel: 'Joyn', access: 'free-ads', evidence: 'joyn-avod', sourceUrl, genres,
    age: Number.isFinite(asset.ageRating?.minAge) ? asset.ageRating.minAge : null,
    image: image ? {url: image, sourceUrl, checkedAt: fetchedAt} : null, metadataGenres: explicitAudienceGenres(asset.description), variants: []
  });
}

// Parse JSON data blocks; never execute the broadcaster's scripts.
export function parseJoynPage(html) {
  const old = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (old) {
    const page = JSON.parse(old[1]).props?.pageProps?.initialData?.page;
    if (page?.blocks) return page;
  }
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const push = match[1].match(/^self\.__next_f\.push\((\[[\s\S]*\])\)$/);
    if (!push) continue;
    const chunk = JSON.parse(push[1]);
    if (chunk[0] !== 1 || typeof chunk[1] !== 'string') continue;
    for (const line of chunk[1].split('\n')) {
      if (!line.includes('"initialData"') || !/^\w+:\[/.test(line)) continue;
      try {
        const page = JSON.parse(line.slice(line.indexOf(':') + 1))[3]?.initialData?.page;
        if (page?.blocks) return page;
      } catch { /* Other React Flight records do not contain the catalogue. */ }
    }
  }
  throw new Error('Joyn: public catalogue data missing; previous catalogue must be retained.');
}
export function parseJoynMoviePage(html, sourceUrl, fetchedAt) {
  const url = safeDirectUrl('joyn',sourceUrl); if(!url) throw new Error('Unsafe Joyn movie source.');
  const values = [];
  const old = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(old) values.push(JSON.parse(old[1]));
  for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const push = script[1].match(/^self\.__next_f\.push\((\[[\s\S]*\])\)$/); if(!push) continue;
    const chunk = JSON.parse(push[1]); if(chunk[0] !== 1 || typeof chunk[1] !== 'string') continue;
    for(const line of chunk[1].split('\n')) {const at = line.indexOf(':'); if(at<0) continue; try{values.push(JSON.parse(line.slice(at+1)));}catch{}}
  }
  const stack = [...values]; let visited = 0;
  while(stack.length && visited++ < 80000) {
    const node = stack.pop(); if(!node || typeof node !== 'object') continue;
    if(node.__typename === 'Movie' && safeDirectUrl('joyn',new URL(node.path || '/', 'https://www.joyn.de').href) === url) return normalizeJoyn(node,url,fetchedAt);
    stack.push(...Object.values(node).filter(value=>value && typeof value === 'object'));
  }
  throw new Error('Joyn movie metadata missing; previous selection retained.');
}
export function jsonObjectAfter(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error('Public metadata marker missing.');
  const start = source.indexOf('{', at + marker.length);
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < source.length && start >= 0; i++) {
    const ch = source[i];
    if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; }
    else if (ch === '"') quoted = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return JSON.parse(source.slice(start, i + 1));
  }
  throw new Error('Incomplete public JSON metadata.');
}
export function unwrapRTLAction(action) {
  let target = action?.target, reasons = [], steps = 0;
  while (target?.type === 'lock' && steps++ < 12) {
    reasons.push(target.value_lock?.reason || 'unknown');
    target = target.value_lock?.originalTarget;
  }
  return {target, reasons};
}
export function parseRTLFreePage(html, sourceUrl, fetchedAt) {
  if (sourceUrl !== RTL_FREE_PAGE) throw new Error('RTL: only the explicit free catalogue is eligible.');
  const data = jsonObjectAfter(html, 'root.__dehydratedState =');
  // Select the public layout subtree only. Account, analytics and identity data are discarded.
  const folder = JSON.parse(data.__reduxState).layout?.layouts?.main?.folder?.['193'];
  if (!folder?.blocks || !html.includes('Kostenlose Inhalte')) throw new Error('RTL: free catalogue missing.');
  const records = [];
  for (const block of folder.blocks) for (const item of block.content?.items || []) {
    const content = item.itemContent;
    if (!content?.title || !/^Film\s*[•|]/.test(content.extraDetails || '')) continue;
    const {target, reasons} = unwrapRTLAction(content.action);
    if (reasons.some(r => !['requireConsent', 'requireLogin', 'contentRating'].includes(r))) continue;
    const layout = target?.value_layout;
    if (target?.type !== 'layout' || layout?.type !== 'program' || !/^\d+$/.test(layout.id || '') || !/^[a-z0-9-]+$/i.test(layout.seo || '')) continue;
    const url = safeDirectUrl('rtl', 'https://plus.rtl.de/' + layout.seo + '-p_' + layout.id);
    if (!url) continue;
    const topic = textValue(content.extraDetails, 160), genres = topic.split(/[•|]/).map(s => s.trim()).slice(1);
    const image = safeImageUrl('rtl', content.image?.landscape?.src || content.image?.src);
    records.push(withCategories({id: 'rtl:' + url, provider: 'rtl', kind: /doku|reportage|true crime/.test(normalizeText(topic)) ? 'doc' : 'film',
      title: textValue(content.title, 220), url, topic, description: '', duration: null, publishedAt: null, startsAt: null, expiresAt: null,
      fetchedAt, channel: 'RTL+', access: 'free-ads', evidence: 'rtl-free-selection', sourceUrl, genres, age: null,
      image: image ? {url: image, sourceUrl, checkedAt: fetchedAt} : null, metadataGenres: [], variants: []}));
  }
  return records;
}

export function buildQuery({query = '', provider = 'all', kind = 'all', audience = 'all', genre = 'all', offset = 0, size = 150, minDuration = 0} = {}) {
  const ids = provider === 'all' ? ['arte', 'zdf', 'ard', 'kika'] : [provider];
  if (ids.some(id => !PROVIDERS[id]?.channels.length)) throw new Error('No public live interface for this provider.');
  const queries = ids.flatMap(id => PROVIDERS[id].channels.map(channel => ({fields: ['channel'], query: channel})));
  if (query.trim()) queries.push({fields: ['title', 'topic', 'description'], query: query.trim().slice(0, 160)});
  const terms = kind === 'all' ? [...KIND_TERMS.film, ...KIND_TERMS.doc] : KIND_TERMS[kind];
  if (!terms) throw new Error('Unknown format.');
  queries.push(...terms.map(term => ({fields: ['topic'], query: term})));
  // Targeted youth descriptions often sit under an ordinary film topic.
  // Distinct field groups keep the user's search text as an AND restriction.
  if (Object.hasOwn(AUDIENCE_TERMS, audience)) queries.push(...AUDIENCE_TERMS[audience].map(term => ({fields: audience === 'youth' ? ['description'] : ['topic','title'], query: term})));
  return {queries, sortBy: 'timestamp', sortOrder: 'desc', future: false,
    offset: Math.max(0, Math.min(9000, Math.floor(offset))), size: Math.max(1, Math.min(200, Math.floor(size))),
    duration_min: Math.max(0, Number(minDuration) || 0) - 1};
}
export function deduplicate(records) {
  const map = new Map();
  for (const record of records) {
    if (!record) continue;
    const previous = map.get(record.url);
    if (!previous) map.set(record.url, {...record, variants: [...(record.variants || [])]});
    else {
      if (record.title !== previous.title && !previous.variants.includes(record.title)) previous.variants.push(record.title);
      if (!safeImageUrl(previous.provider, previous.image?.url) && safeImageUrl(record.provider, record.image?.url)) previous.image = record.image;
      if (!previous.metadataGenres?.length && record.metadataGenres?.length) previous.metadataGenres = record.metadataGenres;
      if (!Number.isFinite(previous.age) && Number.isFinite(record.age)) previous.age = record.age;
      if(record.availabilityCheckedAt && (!previous.availabilityCheckedAt || Date.parse(record.availabilityCheckedAt)>Date.parse(previous.availabilityCheckedAt))) for(const key of ['expiresAt','expiryPrecision','availabilitySource','availabilityCheckedAt']) previous[key]=record[key];
      for(const key of ['subtitles','audioDescription','registration','language']) if(previous[key] === undefined && record[key] !== undefined) previous[key]=record[key];
      Object.assign(previous, withCategories(previous));
    }
  }
  return [...map.values()];
}
export function matchesRecord(record, filters = {}, now = Date.now()) {
  if (!safeDirectUrl(record.provider, record.url) || !safeSourceUrl(record) || !['free', 'free-ads'].includes(record.access) || !Object.hasOwn(KINDS, record.kind)) return false;
  if (!filters.showExpired && record.expiresAt !== null && record.expiresAt <= now || record.startsAt !== null && record.startsAt > now) return false;
  if (filters.provider && filters.provider !== 'all' && record.provider !== filters.provider) return false;
  if (filters.kind && filters.kind !== 'all' && record.kind !== filters.kind) return false;
  const audiences = audienceTags(record);
  if (filters.audience === 'unknown' && audiences.length || filters.audience && !['all','unknown'].includes(filters.audience) && !audiences.includes(filters.audience)) return false;
  if (filters.genre && filters.genre !== 'all' && !genreTags(record).includes(filters.genre)) return false;
  const duration = record.duration;
  if (/^max(30|60|90)$/.test(filters.duration || '') && (!Number.isFinite(duration) || duration > Number(filters.duration.slice(3))*60)) return false;
  if (filters.newness && filters.newness !== 'all' && (record.firstSeenBaseline || !Number.isFinite(Date.parse(record.firstSeenAt)) || Date.parse(record.firstSeenAt)<now-Number(filters.newness)*86400000)) return false;
  if (filters.maxMinutes && (!Number.isFinite(duration) || duration > Number(filters.maxMinutes)*60)) return false;
  if (filters.maxAge === 'unknown' && Number.isFinite(record.age)) return false;
  if (filters.maxAge !== undefined && !['all','unknown'].includes(filters.maxAge) && (!Number.isFinite(record.age) || record.age > Number(filters.maxAge))) return false;
  if (filters.expiry && filters.expiry !== 'all' && (!Number.isFinite(record.expiresAt) || record.expiresAt <= now || record.expiresAt > now + Number(filters.expiry)*86400000)) return false;
  if (filters.access === 'adfree' && record.access !== 'free') return false;
  if (filters.access === 'noAccount' && record.registration !== 'not-required') return false;
  if (filters.subtitles && record.subtitles !== true || filters.audioDescription && record.audioDescription !== true) return false;
  if (filters.theme && filters.theme !== 'all' && !familyThemes(record).includes(filters.theme)) return false;
  if (filters.duration === 'short' && (duration === null || duration >= 2700)) return false;
  if (filters.duration === 'long' && (duration === null || duration < 5400)) return false;
  if (filters.duration === 'medium' && (duration === null || duration < 2700 || duration >= 5400)) return false;
  const haystack = normalizeText([record.title, record.topic, record.description, ...(record.genres || []), ...(record.variants || [])].join(' '));
  return normalizeText(filters.query || '').trim().split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
export function sortRecords(records, sort = 'discover', query = '') {
  const cmp = new Intl.Collator('de', {numeric: true, sensitivity: 'base'}), q = normalizeText(query).trim();
  const score = r => {const title = normalizeText(r.title); return title === q ? 3 : title.startsWith(q) ? 2 : title.includes(q) ? 1 : 0;};
  const copy = [...records];
  if (sort === 'discover' && !q) {
    const groups = Object.keys(PROVIDERS).map(id => {
      const films = copy.filter(r => r.provider === id && r.kind === 'film'), docs = copy.filter(r => r.provider === id && r.kind === 'doc'), group = [];
      for (let i = 0; group.length < films.length + docs.length; i++) {if (films[i]) group.push(films[i]); if (docs[i]) group.push(docs[i]);}
      return group;
    });
    const result = [];
    for (let i = 0; result.length < copy.length; i++) for (const group of groups) if (group[i]) result.push(group[i]);
    return result;
  }
  return copy.sort((a, b) => {
    if (sort === 'expires') return (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity) || cmp.compare(a.title,b.title);
    if (sort === 'durationAsc' || sort === 'durationDesc') {
      if (a.duration === null || b.duration === null) return a.duration === b.duration ? cmp.compare(a.title, b.title) : a.duration === null ? 1 : -1;
      return (sort === 'durationAsc' ? 1 : -1) * (a.duration - b.duration) || cmp.compare(a.title, b.title);
    }
    if (sort === 'newest') {
      if (a.publishedAt === null || b.publishedAt === null) return a.publishedAt === b.publishedAt ? cmp.compare(a.title, b.title) : a.publishedAt === null ? 1 : -1;
      return b.publishedAt - a.publishedAt || cmp.compare(a.title, b.title);
    }
    if (sort === 'audience') {
      const rank = r => {const tags = audienceTags(r); return tags.includes('children') ? 0 : tags.includes('youth') ? 1 : tags.includes('family') ? 2 : 3;};
      return rank(a) - rank(b) || cmp.compare(a.title, b.title);
    }
    return (sort === 'discover' && q ? score(b) - score(a) : 0) || cmp.compare(a.title, b.title);
  });
}
export function familyThemes(record) {
  const text = normalizeText([record.title,record.topic,record.description,...(record.genres || [])].join(' '));
  return Object.entries({animals:/\b(?:tier\w*|hund(?:e|en|chen|in|innen)?|katz\w*|pferd\w*|pony\w*|zoo\w*|wildnis)\b/,friendship:/\b(?:freund\w*|zusammenhalt)\b/,fairy:/\b(?:marchen\w*|prinzessin\w*|prinz|zauber\w*|hexe[n]?)\b/,school:/\b(?:schule|schul\w*|lernen)\b/,space:/\b(?:weltraum|weltall|planet\w*|rakete\w*|astronaut\w*)\b/,dinosaurs:/\b(?:dinosaur\w*|dinos?)\b/}).filter(([,pattern])=>pattern.test(text)).map(([id])=>id);
}
export function availabilityLabel(record, now = Date.now()) {
  if (!Number.isFinite(record.expiresAt)) return 'Enddatum nicht bekannt';
  if (record.expiresAt <= now) return 'Nicht mehr verfügbar';
  const date = new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(record.expiresAt - (record.expiryPrecision === 'day' ? 1 : 0)));
  if(record.expiryPrecision === 'day') return 'Bis '+date+' · Enduhrzeit nicht angegeben';
  const days = Math.ceil((record.expiresAt-now)/86400000);
  return 'Bis '+date+' · '+(days === 1 ? 'endet innerhalb von 24 Stunden' : 'noch '+days+' Tage')+(record.expiryPrecision === 'relative' ? ' (ungefähre Anbieterangabe)' : '');
}
export function officialSearchUrl(provider, query) {
  const q = encodeURIComponent(String(query || '').trim().slice(0, 160));
  if (provider === 'joyn') return q ? 'https://www.joyn.de/suche?q=' + q : PROVIDERS.joyn.home;
  if (provider === 'rtl') return RTL_FREE_PAGE;
  return PROVIDERS[provider]?.home || null;
}
