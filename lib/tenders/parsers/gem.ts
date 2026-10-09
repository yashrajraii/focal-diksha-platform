import type { ParsedListing } from "../types.ts";

const BASE="https://bidplus.gem.gov.in";
type GemDoc=Record<string,unknown>;
const first=(v:unknown):string|null=>{const x=Array.isArray(v)?v[0]:v;return x==null||x===""?null:String(x)};

/** GeM stamps IST wall-clock times with a "Z" suffix (its own UI formats them in UTC), so shift back by 5:30 for the real instant. */
export function gemInstant(value:unknown):string|null{
  const raw=first(value);if(!raw)return null;
  const wall=new Date(raw);if(Number.isNaN(wall.getTime()))return null;
  return new Date(wall.getTime()-330*60_000).toISOString();
}

export function gemDocumentPath(doc:GemDoc):string{
  const id=first(doc.b_id),type=Number(first(doc.b_bid_type)),evalType=Number(first(doc.b_eval_type)??0);
  if(type===5)return `/showdirectradocumentPdf/${id}`;
  if(type===2)return evalType>0?`/list-ra-schedules/${id}`:`/showradocumentPdf/${id}`;
  return `/showbidDocument/${id}`;
}

export interface GemSearchResponse { status?:number; code?:number; message?:string; response?:{response?:{numFound:number;start:number;docs:GemDoc[]}} }

/** Returns parsed bids and the total GeM reports; "No data found" is a valid empty search, any other shape fails loudly. */
export function parseGemSearch(body:GemSearchResponse):{rows:ParsedListing[];numFound:number}{
  if(body.code===404&&/no data/i.test(String(body.message??"")))return {rows:[],numFound:0};
  const res=body.response?.response;
  if(body.code!==200||!res||!Array.isArray(res.docs))throw new Error("GeM search response was not recognised");
  const rows:ParsedListing[]=[];
  for(const doc of res.docs){
    const bidNumber=first(doc.b_bid_number),items=Array.isArray(doc.b_category_name)?doc.b_category_name.map(String).join(", "):first(doc.b_category_name);
    if(!bidNumber||!items||!first(doc.b_id))continue;
    const buyer=[first(doc.ba_official_details_minName),first(doc.ba_official_details_deptName)].filter(Boolean).join(" · ")||null;
    rows.push({sourceTenderId:bidNumber,reference:bidNumber,title:items,buyer,publishedAt:gemInstant(doc.final_start_date_sort),closingAt:gemInstant(doc.final_end_date_sort),detailUrl:new URL(gemDocumentPath(doc),BASE).toString(),original:{bidNumber,quantity:first(doc.b_total_quantity),startDate:first(doc.final_start_date_sort),endDate:first(doc.final_end_date_sort),ministry:first(doc.ba_official_details_minName),department:first(doc.ba_official_details_deptName)}});
  }
  return {rows,numFound:Number(res.numFound)||0};
}

export function gemCsrfToken(html:string):string{
  const token=html.match(/csrf_bd_gem_nk['"]?\s*:\s*['"]([0-9a-f]{16,})['"]/i)?.[1];
  if(!token)throw new Error("GeM search page was not recognised (no CSRF token)");
  return token;
}
