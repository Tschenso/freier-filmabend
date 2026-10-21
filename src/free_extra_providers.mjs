import {PROVIDERS,safeDirectUrl,safeImageUrl,textValue,withCategories,normalizeText} from './free_catalog.mjs';
export const KIKA_API='https://www.kika.de/ackley/v1/videosubchannels/alle-filme-106/videos';
export function normalizeKika(item,fetchedAt) {
  const detail=item.videoDetails || item;
  if(!['video','externalVideo'].includes(item.docType) || detail.videoType !== 'mainContent' || detail.hasAssets !== true || item.isVisible===false) return null;
  const url=safeDirectUrl('kika','https://www.kika.de'+item.urlPath+'/'+item.id);
  if(!url || !item.title || !Number.isFinite(detail.durationInSeconds)) return null;
  const end=Date.parse(item.endDate), start=Date.parse(item.date);
  if(Number.isFinite(end) && end <= Date.now() || Number.isFinite(start) && start > Date.now()) return null;
  const image=safeImageUrl('kika',new URL((item.teaserImage?.urlScheme || '').replace('**imageVariant**','tlarge169').replace('**width**','640'),'https://www.kika.de').href);
  return withCategories({id:'kika:'+url,provider:'kika',kind:'film',title:textValue(item.title,220),url,topic:'KiKA Kinderfilme',description:textValue(detail.description || item.teaserText,260),duration:detail.durationInSeconds,publishedAt:Number.isFinite(start)?start:null,startsAt:null,expiresAt:Number.isFinite(end)?end:null,expiryPrecision:'time',availabilitySource:url,availabilityCheckedAt:fetchedAt,fetchedAt,channel:'KiKA',access:'free',registration:'not-required',evidence:'kika-film-selection',sourceUrl:PROVIDERS.kika.home,genres:(item.metaKeywords || []).map(g=>textValue(g,60)),metadataGenres:[],age:Number.isFinite(detail.ageRating)?detail.ageRating:null,subtitles:detail.hasSubtitle===true,audioDescription:detail.hasAdVideo===true,language:'de',image:image?{url:image,sourceUrl:url,checkedAt:fetchedAt}:null,variants:[]});
}
export function walkObjects(root, predicate, max=80000) {
  const stack=[root], result=[]; let visited=0;
  while(stack.length && visited++<max) {const node=stack.pop(); if(!node || typeof node !== 'object') continue; if(predicate(node)) result.push(node); stack.push(...Object.values(node).filter(v=>v && typeof v === 'object'));}
  if(stack.length) throw new Error('Public metadata object bound exceeded.');
  return result;
}
export function normalizeNetzkino(item,fetchedAt,inChildrenCollection=false) {
  if(item.__typename!=='CmsMovie' || item.isStreamable===false || !/^[a-z0-9-]+$/i.test(item.slug || '')) return null;
  if((item.flags || []).includes('properties:plus-exclusive') || !(item.flags || []).includes('properties:avod')) return null;
  if(item.licenses?.nodes?.length && !item.licenses.nodes.some(license=>(license.properties || []).includes('AVOD'))) return null;
  const genres=[...(item.categories?.nodes || []).map(node=>node.category?.title).filter(Boolean),...(item.flags || []).filter(flag=>flag.startsWith('genres:')).map(flag=>flag.slice(7))];
  if(!inChildrenCollection && !/kinderkino|familienfilm|family|kids|children/.test(normalizeText(genres.join(' ')))) return null;
  const url=safeDirectUrl('netzkino','https://www.netzkino.de/details?id='+encodeURIComponent(item.slug)), image=safeImageUrl('netzkino',item.widescreenImage?.masterUrl || item.headerImage?.masterUrl);
  if(!url || !item.title) return null;
  return withCategories({id:'netzkino:'+url,provider:'netzkino',kind:'film',title:textValue(item.title,220),url,topic:'Kinderkino · '+genres.slice(0,5).join(' · '),description:textValue(item.longSynopsis || item.shortSynopsis,260),duration:Number.isFinite(item.runtimeInSeconds)?item.runtimeInSeconds:null,publishedAt:null,startsAt:null,expiresAt:null,fetchedAt,channel:'Netzkino',access:'free-ads',evidence:'netzkino-free-selection',sourceUrl:PROVIDERS.netzkino.home,genres:genres.map(g=>textValue(g,60)).slice(0,12),metadataGenres:[],age:Number.isFinite(item.fskRating)?item.fskRating:null,image:image?{url:image,sourceUrl:url,checkedAt:fetchedAt}:null,variants:[]});
}
export function parseNetzkino(html,fetchedAt) {
  const match=html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(!match) throw new Error('Netzkino public catalogue metadata missing.');
  const data=JSON.parse(match[1]);
  const queries=(data.props?.__dehydratedState?.queries || []).filter(query=>{try{const params=JSON.parse(query.queryKey[1]); return query.queryKey?.[0]==='CategoryDataBySlug' && params.slug==='kinderkino' || query.queryKey?.[0]==='AllContent' && params.parentSlug==='kinderkino';}catch{return false;}});
  if(!queries.length) throw new Error('Netzkino Kinderkino source missing.');
  return queries.flatMap(query=>walkObjects(query.state?.data?.data || {},node=>node.__typename==='CmsMovie')).map(node=>normalizeNetzkino(node,fetchedAt,true)).filter(Boolean);
}
