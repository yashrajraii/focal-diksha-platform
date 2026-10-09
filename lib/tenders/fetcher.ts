import { isExpired, withinLookback } from "./dates.ts";
import { matchTender } from "./matching.ts";
import { parseCpppListing, nextCpppPage } from "./parsers/cppp.ts";
import { gemCsrfToken, parseGemSearch, type GemSearchResponse } from "./parsers/gem.ts";
import { parseNicHomepage } from "./parsers/nic-home.ts";
import { parseNtpcListing } from "./parsers/ntpc.ts";
import { SOURCES } from "./source-config.ts";
import type { NormalizedTender, ParsedListing, SourceId, SourceResult } from "./types.ts";

const ALLOWED_HOSTS=new Set(Object.values(SOURCES).map(s=>s.host));
const MAX_BYTES=1_100_000, TIMEOUT_MS=12_000;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const USER_AGENT="Mozilla/5.0 (compatible; FocalDikshaTenderDiscovery/1.0; internal review; bounded public-listing check)";

/** Batch limits: each fetch-source call stays small, and the browser asks for the next batch until the source is exhausted or capped. */
export const CPPP_PAGES_PER_BATCH=3, CPPP_MAX_PAGES=15;
export const GEM_TERMS_PER_BATCH=4, GEM_PAGES_PER_TERM=3;
/** GeM's public search is fuzzy, so these only narrow the feed; matchTender still decides relevance. */
export const GEM_SEARCH_TERMS=["mild steel plate","steel plate","ms sheet","hr coil","steel angle","ms channel","steel beam","hollow section","wire rod","round bar","welding electrode","welding rod","welding wire","welding gloves","drill bit","end mill","carbide insert","milling cutter","hacksaw blade","tool holder","collet","cutting oil","lubricant","hydraulic oil","retaining compound","sealant","vernier caliper","micrometer","measuring tape"];

type FetchInit={method?:"GET"|"POST";body?:string;headers?:Record<string,string>};
async function fetchBounded(url:string,init:FetchInit={}):Promise<{text:string;headers:Headers}>{
  let current=new URL(url);
  for(let redirects=0;redirects<4;redirects++){
    if(current.protocol!=="https:"||!ALLOWED_HOSTS.has(current.hostname)) throw new Error("Redirect left the reviewed public portal host");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    let response:Response;
    try{response=await fetch(current,{method:init.method??"GET",body:init.body,redirect:"manual",signal:controller.signal,headers:{"user-agent":USER_AGENT,accept:"text/html,application/xhtml+xml",...init.headers}})}finally{clearTimeout(timer)}
    if(response.status>=300&&response.status<400){const location=response.headers.get("location");if(!location)throw new Error("Portal redirect did not provide a location");current=new URL(location,current);continue}
    if(response.status===403||response.status===401)throw new Error("Access restricted by portal");
    if(response.status===429)throw new Error(`Portal rate limit reached${response.headers.get("retry-after")?`; Retry-After ${response.headers.get("retry-after")}`:""}`);
    if(response.status>=500)throw new Error(`Portal unavailable (${response.status})`);
    if(!response.ok)throw new Error(`Portal returned HTTP ${response.status}`);
    const len=Number(response.headers.get("content-length")||0);if(len>MAX_BYTES)throw new Error("Portal response exceeded the 1.1 MB safety limit");
    const reader=response.body?.getReader();if(!reader)return {text:"",headers:response.headers};
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;if(value){size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new Error("Portal response exceeded the 1.1 MB safety limit")}chunks.push(value)}}
    const html=new TextDecoder().decode(concat(chunks,size));
    if(/cf-chl-|cloudflare challenge|verify you are human|access denied/i.test(html))throw new Error("Portal presented an access challenge");
    return {text:html,headers:response.headers};
  }
  throw new Error("Too many portal redirects");
}
const fetchText=async(url:string)=>(await fetchBounded(url)).text;
function concat(chunks:Uint8Array[],size:number){const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}return out}

function normalize(source:SourceId,row:ParsedListing,runId:string,now:string):NormalizedTender|null{
  const match=matchTender(row.title);
  if(!match.isRelevant)return null;
  const sourceLabel=SOURCES[source].label;
  return {key:`${source}:${row.sourceTenderId}`,source,sourceLabel,sourceTenderId:row.sourceTenderId,reference:row.reference,title:row.title,buyer:row.buyer,publishedAt:row.publishedAt,closingAt:row.closingAt,location:null,detailUrl:row.detailUrl,description:null,quantity:null,emd:null,matchedCategories:match.categories.length?match.categories:["Brand-supported possible match"],evidence:match.evidence,relevance:match.relevance,firstDiscoveredAt:now,lastVerifiedAt:now,fetchRunId:runId,original:row.original};
}

type Cursor={next?:string;page?:number;term?:number};
const readCursor=(value:string|null|undefined):Cursor=>{try{return value?JSON.parse(value) as Cursor:{}}catch{return {}}};

/** One GeM batch: open the public search page for a session cookie and CSRF token, then page through a few keyword searches newest-first. */
async function fetchGemBatch(startTerm:number,lookbackDays:number,now:Date):Promise<{rows:ParsedListing[];requests:number;nextTerm:number|null}>{
  const page=await fetchBounded("https://bidplus.gem.gov.in/all-bids");
  const token=gemCsrfToken(page.text);
  const cookie=page.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  const cutoff=now.getTime()-lookbackDays*86_400_000,rows:ParsedListing[]=[];let requests=1;
  const end=Math.min(startTerm+GEM_TERMS_PER_BATCH,GEM_SEARCH_TERMS.length);
  for(let t=startTerm;t<end;t++){
    for(let p=1;p<=GEM_PAGES_PER_TERM;p++){
      await wait(1100);
      const payload={page:p,param:{searchBid:GEM_SEARCH_TERMS[t],searchType:"fullText"},filter:{bidStatusType:"ongoing_bids",byType:"all",highBidValue:"",byEndDate:{from:"",to:""},sort:"Bid-Start-Date-Latest"}};
      const res=await fetchBounded("https://bidplus.gem.gov.in/all-bids-data",{method:"POST",body:new URLSearchParams({payload:JSON.stringify(payload),csrf_bd_gem_nk:token}).toString(),headers:{cookie,accept:"application/json","content-type":"application/x-www-form-urlencoded","x-requested-with":"XMLHttpRequest",referer:"https://bidplus.gem.gov.in/all-bids"}});
      requests++;
      let body:GemSearchResponse;try{body=JSON.parse(res.text) as GemSearchResponse}catch{throw new Error("GeM search response was not recognised")}
      const parsed=parseGemSearch(body);rows.push(...parsed.rows);
      const oldest=parsed.rows.at(-1)?.publishedAt;
      if(parsed.rows.length<10||p*10>=parsed.numFound||(oldest&&new Date(oldest).getTime()<cutoff))break;
    }
  }
  return {rows,requests,nextTerm:end<GEM_SEARCH_TERMS.length?end:null};
}

export async function fetchSource(source:SourceId,runId:string,lookbackDays:number,includeClosed=false,cursorValue:string|null=null):Promise<SourceResult>{
  const config=SOURCES[source],now=new Date(),checkedAt=now.toISOString();
  if(!config.enabled)return {source,sourceLabel:config.label,status:"unavailable",pagesChecked:0,listingsInspected:0,matches:[],checkedAt,fromCache:false,coverage:config.reason,error:config.reason};
  let pages=0,rows:ParsedListing[]=[],cursor:string|null=null;
  const from=readCursor(cursorValue);
  try{
    if(source==="cppp"){
      let next:string|null=from.next??config.url,total=from.page??0;
      while(next&&pages<CPPP_PAGES_PER_BATCH&&total<CPPP_MAX_PAGES){if(pages>0)await wait(2100);const html=await fetchText(next);rows.push(...parseCpppListing(html));pages++;total++;next=nextCpppPage(html)}
      if(next&&total<CPPP_MAX_PAGES)cursor=JSON.stringify({next,page:total});
    }else if(source==="gem"){
      const batch=await fetchGemBatch(from.term??0,lookbackDays,now);rows=batch.rows;pages=batch.requests;
      if(batch.nextTerm!==null)cursor=JSON.stringify({term:batch.nextTerm});
    }else if(source==="ntpc"){
      const html=await fetchText(config.url);rows=parseNtpcListing(html);pages=1;
    }else{
      const html=await fetchText(config.url);rows=parseNicHomepage(html,source as "coal-india"|"up-etender");pages=1;
    }
    const deduped=[...new Map(rows.map(r=>[r.sourceTenderId,r])).values()];
    const matches=deduped.filter(r=>withinLookback(r.publishedAt,lookbackDays,now)).filter(r=>includeClosed||!isExpired(r.closingAt,now)).map(r=>normalize(source,r,runId,checkedAt)).filter((x):x is NormalizedTender=>Boolean(x));
    return {source,sourceLabel:config.label,status:config.availability==="available"?"completed":"partial",pagesChecked:pages,listingsInspected:deduped.length,matches,checkedAt,fromCache:false,coverage:config.reason,canContinue:cursor!==null,cursor};
  }catch(error){const message=error instanceof Error?error.message:"Unknown portal error";const status=/restricted|challenge|rate limit/i.test(message)?"restricted":/recognised|headings/i.test(message)?"parser-failure":"unavailable";return {source,sourceLabel:config.label,status,pagesChecked:pages,listingsInspected:rows.length,matches:[],checkedAt,fromCache:false,coverage:config.reason,error:message}}
}
