import { isExpired, withinLookback } from "./dates.ts";
import { matchTender } from "./matching.ts";
import { parseCpppListing, nextCpppPage } from "./parsers/cppp.ts";
import { parseNicHomepage } from "./parsers/nic-home.ts";
import { SOURCES } from "./source-config.ts";
import type { NormalizedTender, ParsedListing, SourceId, SourceResult } from "./types.ts";

const ALLOWED_HOSTS=new Set(Object.values(SOURCES).map(s=>s.host));
const MAX_BYTES=1_100_000, TIMEOUT_MS=12_000;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function fetchText(url:string):Promise<string>{
  let current=new URL(url);
  for(let redirects=0;redirects<4;redirects++){
    if(current.protocol!=="https:"||!ALLOWED_HOSTS.has(current.hostname)) throw new Error("Redirect left the reviewed public portal host");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    let response:Response;
    try{response=await fetch(current,{redirect:"manual",signal:controller.signal,headers:{"user-agent":"FocalDikshaTenderDiscovery/1.0 (internal review; bounded public-listing check)",accept:"text/html,application/xhtml+xml"}})}finally{clearTimeout(timer)}
    if(response.status>=300&&response.status<400){const location=response.headers.get("location");if(!location)throw new Error("Portal redirect did not provide a location");current=new URL(location,current);continue}
    if(response.status===403||response.status===401)throw new Error("Access restricted by portal");
    if(response.status===429)throw new Error(`Portal rate limit reached${response.headers.get("retry-after")?`; Retry-After ${response.headers.get("retry-after")}`:""}`);
    if(response.status>=500)throw new Error(`Portal unavailable (${response.status})`);
    if(!response.ok)throw new Error(`Portal returned HTTP ${response.status}`);
    const len=Number(response.headers.get("content-length")||0);if(len>MAX_BYTES)throw new Error("Portal response exceeded the 1.1 MB safety limit");
    const reader=response.body?.getReader();if(!reader)return "";
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;if(value){size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new Error("Portal response exceeded the 1.1 MB safety limit")}chunks.push(value)}}
    const html=new TextDecoder().decode(concat(chunks,size));
    if(/cf-chl-|cloudflare challenge|verify you are human|access denied/i.test(html))throw new Error("Portal presented an access challenge");
    return html;
  }
  throw new Error("Too many portal redirects");
}
function concat(chunks:Uint8Array[],size:number){const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}return out}

function normalize(source:SourceId,row:ParsedListing,runId:string,now:string):NormalizedTender|null{
  const match=matchTender(row.title);
  if(!match.isRelevant)return null;
  const sourceLabel=SOURCES[source].label;
  return {key:`${source}:${row.sourceTenderId}`,source,sourceLabel,sourceTenderId:row.sourceTenderId,reference:row.reference,title:row.title,buyer:row.buyer,publishedAt:row.publishedAt,closingAt:row.closingAt,location:null,detailUrl:row.detailUrl,description:null,quantity:null,emd:null,matchedCategories:match.categories.length?match.categories:["Brand-supported possible match"],evidence:match.evidence,relevance:match.relevance,firstDiscoveredAt:now,lastVerifiedAt:now,fetchRunId:runId,original:row.original};
}

export async function fetchSource(source:SourceId,runId:string,lookbackDays:number,includeClosed=false):Promise<SourceResult>{
  const config=SOURCES[source],now=new Date(),checkedAt=now.toISOString();
  if(!config.enabled)return {source,sourceLabel:config.label,status:"unavailable",pagesChecked:0,listingsInspected:0,matches:[],checkedAt,fromCache:false,coverage:config.reason,error:config.reason};
  let pages=0,rows:ParsedListing[]=[];
  try{
    if(source==="cppp"){
      let next:string|null=config.url;
      while(next&&pages<3){const html=await fetchText(next);const parsed=parseCpppListing(html);rows.push(...parsed);pages++;next=nextCpppPage(html);if(next&&pages<3)await wait(2100)}
    }else{
      const html=await fetchText(config.url);rows=parseNicHomepage(html,source as "coal-india"|"up-etender");pages=1;
    }
    const deduped=[...new Map(rows.map(r=>[r.sourceTenderId,r])).values()];
    const matches=deduped.filter(r=>withinLookback(r.publishedAt,lookbackDays,now)).filter(r=>includeClosed||!isExpired(r.closingAt,now)).map(r=>normalize(source,r,runId,checkedAt)).filter((x):x is NormalizedTender=>Boolean(x));
    return {source,sourceLabel:config.label,status:"partial",pagesChecked:pages,listingsInspected:deduped.length,matches,checkedAt,fromCache:false,coverage:config.reason};
  }catch(error){const message=error instanceof Error?error.message:"Unknown portal error";const status=/restricted|challenge|rate limit/i.test(message)?"restricted":/recognised rows|headings/i.test(message)?"parser-failure":"unavailable";return {source,sourceLabel:config.label,status,pagesChecked:pages,listingsInspected:rows.length,matches:[],checkedAt,fromCache:false,coverage:config.reason,error:message}}
}
