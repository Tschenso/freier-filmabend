// Availability is independent of publication dates and free-offer proof.
export function endOfBerlinDay(year, month, day) {
  const midnight=Date.UTC(year,month-1,day+1);
  let result=midnight;
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  for(let i=0;i<3;i++) {
    const p=Object.fromEntries(fmt.formatToParts(new Date(result)).map(v=>[v.type,v.value]));
    const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    result=midnight-(wall-result);
  }
  return result;
}
export function parseAvailability(html,record,sourceUrl,checkedAt) {
  if(record.provider !== 'arte') return {};
  const match=html.match(/Verfügbar bis zum (\d{2})\/(\d{2})\/(\d{4})/);
  if(!match) return {expiresAt:null,availabilityCheckedAt:checkedAt};
  const [day,month,year]=match.slice(1).map(Number);
  if(month<1 || month>12 || day<1 || day>new Date(Date.UTC(year,month,0)).getUTCDate()) return {};
  return {expiresAt:endOfBerlinDay(year,month,day),expiryPrecision:'day',availabilitySource:sourceUrl,availabilityCheckedAt:checkedAt};
}
