import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { fetchSource } from "@/lib/tenders/fetcher";
import { ENABLED_SOURCES, SOURCES } from "@/lib/tenders/source-config";
import { cacheFallbackMessage, shouldUseCache } from "@/lib/tenders/dedupe";
import type { NormalizedTender, SourceId, SourceResult } from "@/lib/tenders/types";

export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"cache-control":"no-store"}});
const db=()=>{if(!env.DB)throw new Error("Tender storage is not configured");return env.DB};
const safeParse=<T>(value:string|null,fallback:T):T=>{try{return value?JSON.parse(value) as T:fallback}catch{return fallback}};

function rowToTender(row:Record<string,unknown>):NormalizedTender&{saved:boolean}{
  return {key:String(row.key),source:String(row.source) as SourceId,sourceLabel:String(row.source_label),sourceTenderId:String(row.source_tender_id),reference:String(row.reference),title:String(row.title),buyer:row.buyer?String(row.buyer):null,publishedAt:row.published_at?String(row.published_at):null,closingAt:row.closing_at?String(row.closing_at):null,location:row.location?String(row.location):null,detailUrl:String(row.detail_url),description:row.description?String(row.description):null,quantity:row.quantity?String(row.quantity):null,emd:row.emd?String(row.emd):null,matchedCategories:safeParse(String(row.matched_categories),[]),evidence:safeParse(String(row.evidence),[]),relevance:String(row.relevance) as NormalizedTender["relevance"],firstDiscoveredAt:String(row.first_discovered_at),lastVerifiedAt:String(row.last_verified_at),fetchRunId:String(row.fetch_run_id),original:safeParse(String(row.original_json),{}),saved:Boolean(row.saved)};
}

export async function GET(){
  try{
    const now=new Date().toISOString();
    const [tenderRows,statusRows,run]=await Promise.all([
      db().prepare(`SELECT l.*, CASE WHEN s.tender_key IS NULL THEN 0 ELSE 1 END AS saved FROM live_tenders l LEFT JOIN saved_live_tenders s ON s.tender_key=l.key WHERE l.closing_at IS NULL OR l.closing_at>=? ORDER BY COALESCE(l.published_at,l.first_discovered_at) DESC LIMIT 250`).bind(now).all(),
      db().prepare(`SELECT * FROM source_status ORDER BY source`).all(),
      db().prepare(`SELECT * FROM tender_runs ORDER BY started_at DESC LIMIT 1`).first()
    ]);
    return json({sources:SOURCES,statuses:statusRows.results,lastRun:run,tenders:tenderRows.results.map(r=>rowToTender(r as Record<string,unknown>)),serverTime:now});
  }catch(error){return json({error:error instanceof Error?error.message:"Tender discovery is unavailable"},503)}
}

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>,action=String(body.action||"");
    if(action==="start"){
      const selected=(Array.isArray(body.sources)?body.sources:[]).filter((s):s is SourceId=>typeof s==="string"&&ENABLED_SOURCES.includes(s as SourceId)).slice(0,ENABLED_SOURCES.length);
      if(!selected.length)return json({error:"Select at least one available source"},400);
      const cutoff=new Date(Date.now()-2*60_000).toISOString();
      const active=await db().prepare(`SELECT id FROM tender_runs WHERE status='running' AND cancelled=0 AND started_at>=? ORDER BY started_at DESC LIMIT 1`).bind(cutoff).first<{id:string}>();
      if(active)return json({error:"A tender search is already running",runId:active.id},409);
      const id=crypto.randomUUID(),now=new Date().toISOString();
      await db().prepare(`INSERT INTO tender_runs (id,status,started_at,selected_sources) VALUES (?,'running',?,?)`).bind(id,now,JSON.stringify(selected)).run();
      return json({runId:id,startedAt:now,sources:selected});
    }
    if(action==="fetch-source"){
      const runId=String(body.runId||""),source=String(body.source||"") as SourceId,lookback=Math.max(7,Math.min(90,Number(body.lookback)||30)),cursor=typeof body.cursor==="string"&&body.cursor?body.cursor:null;
      if(!ENABLED_SOURCES.includes(source))return json({error:"Source is not enabled"},400);
      const run=await db().prepare(`SELECT * FROM tender_runs WHERE id=?`).bind(runId).first<Record<string,unknown>>();
      if(!run||run.status!=="running")return json({error:"Search run is not active"},409);
      if(Boolean(run.cancelled))return json({error:"Search was cancelled"},409);
      const selected=safeParse<SourceId[]>(String(run.selected_sources),[]);if(!selected.includes(source))return json({error:"Source was not selected for this run"},400);
      await db().prepare(`UPDATE tender_runs SET current_source=? WHERE id=?`).bind(source,runId).run();
      const cached=await db().prepare(`SELECT * FROM source_status WHERE source=?`).bind(source).first<Record<string,unknown>>();
      let result:SourceResult;
      // Continuation batches always fetch; only a source's first batch may reuse a recent successful result.
      if(!cursor&&shouldUseCache(cached?.last_success_at?String(cached.last_success_at):null)){
        const rows=await db().prepare(`SELECT l.*, CASE WHEN s.tender_key IS NULL THEN 0 ELSE 1 END AS saved FROM live_tenders l LEFT JOIN saved_live_tenders s ON s.tender_key=l.key WHERE l.source=? AND (l.closing_at IS NULL OR l.closing_at>=?) ORDER BY COALESCE(l.published_at,l.first_discovered_at) DESC`).bind(source,new Date().toISOString()).all();
        result={source,sourceLabel:SOURCES[source].label,status:"partial",pagesChecked:Number(cached.pages_checked||0),listingsInspected:Number(cached.listings_inspected||0),matches:rows.results.map(r=>rowToTender(r as Record<string,unknown>)),checkedAt:String(cached.last_success_at),fromCache:true,coverage:SOURCES[source].reason};
      }else {
        result=await fetchSource(source,runId,lookback,false,cursor);
        if(!cursor&&!["completed","partial"].includes(result.status)&&cached?.last_success_at){
          const rows=await db().prepare(`SELECT l.*, CASE WHEN s.tender_key IS NULL THEN 0 ELSE 1 END AS saved FROM live_tenders l LEFT JOIN saved_live_tenders s ON s.tender_key=l.key WHERE l.source=? AND (l.closing_at IS NULL OR l.closing_at>=?) ORDER BY COALESCE(l.published_at,l.first_discovered_at) DESC`).bind(source,new Date().toISOString()).all();
          result={...result,matches:rows.results.map(r=>rowToTender(r as Record<string,unknown>)),fromCache:true,error:cacheFallbackMessage(SOURCES[source].label,String(cached.last_success_at))};
        }
      }
      if(!result.fromCache&&result.matches.length){
        const statements=result.matches.map(t=>db().prepare(`INSERT INTO live_tenders (key,source,source_label,source_tender_id,reference,title,buyer,published_at,closing_at,location,detail_url,description,quantity,emd,matched_categories,evidence,relevance,first_discovered_at,last_verified_at,fetch_run_id,original_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET reference=excluded.reference,title=excluded.title,buyer=excluded.buyer,published_at=excluded.published_at,closing_at=excluded.closing_at,location=excluded.location,detail_url=excluded.detail_url,description=excluded.description,quantity=excluded.quantity,emd=excluded.emd,matched_categories=excluded.matched_categories,evidence=excluded.evidence,relevance=excluded.relevance,last_verified_at=excluded.last_verified_at,fetch_run_id=excluded.fetch_run_id,original_json=excluded.original_json`).bind(t.key,t.source,t.sourceLabel,t.sourceTenderId,t.reference,t.title,t.buyer,t.publishedAt,t.closingAt,t.location,t.detailUrl,t.description,t.quantity,t.emd,JSON.stringify(t.matchedCategories),JSON.stringify(t.evidence),t.relevance,t.firstDiscoveredAt,t.lastVerifiedAt,t.fetchRunId,JSON.stringify(t.original)));
        await db().batch(statements);
      }
      const successful=result.status==="completed"||result.status==="partial";
      await db().prepare(`INSERT INTO source_status (source,status,checked_at,last_success_at,last_error,coverage,pages_checked,listings_inspected,matches_found) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET status=excluded.status,checked_at=excluded.checked_at,last_success_at=CASE WHEN excluded.last_success_at IS NULL THEN source_status.last_success_at ELSE excluded.last_success_at END,last_error=excluded.last_error,coverage=excluded.coverage,pages_checked=CASE WHEN ? THEN source_status.pages_checked+excluded.pages_checked ELSE excluded.pages_checked END,listings_inspected=CASE WHEN ? THEN source_status.listings_inspected+excluded.listings_inspected ELSE excluded.listings_inspected END,matches_found=CASE WHEN ? THEN source_status.matches_found+excluded.matches_found ELSE excluded.matches_found END`).bind(source,result.status,result.checkedAt,successful?result.checkedAt:null,result.error||null,result.coverage,result.pagesChecked,result.listingsInspected,result.matches.length,cursor?1:0,cursor?1:0,cursor?1:0).run();
      // Source outcome counters move once per source, on its final batch.
      const finalBatch=!result.canContinue,completedInc=finalBatch&&result.status==="completed"?1:0,partialInc=finalBatch&&result.status==="partial"?1:0,errorInc=successful?0:1;
      await db().prepare(`UPDATE tender_runs SET current_source=NULL,pages_checked=pages_checked+?,listings_inspected=listings_inspected+?,matches_found=matches_found+?,completed_sources=completed_sources+?,partial_sources=partial_sources+?,error_sources=error_sources+? WHERE id=?`).bind(result.pagesChecked,result.listingsInspected,result.matches.length,completedInc,partialInc,errorInc,runId).run();
      return json(result);
    }
    if(action==="complete"){
      const runId=String(body.runId||""),now=new Date().toISOString();
      const run=await db().prepare(`SELECT * FROM tender_runs WHERE id=?`).bind(runId).first<Record<string,unknown>>();if(!run)return json({error:"Run not found"},404);
      const status=Boolean(run.cancelled)?"cancelled":Number(run.error_sources||0)>0||Number(run.partial_sources||0)>0?"partial":"completed";
      await db().prepare(`UPDATE tender_runs SET status=?,completed_at=?,current_source=NULL WHERE id=?`).bind(status,now,runId).run();return json({status,completedAt:now});
    }
    if(action==="cancel"){
      await db().prepare(`UPDATE tender_runs SET status='cancelled',cancelled=1,completed_at=?,current_source=NULL WHERE id=? AND status='running'`).bind(new Date().toISOString(),String(body.runId||"")).run();return json({status:"cancelled"});
    }
    if(action==="save"||action==="unsave"){
      const key=String(body.key||"");const exists=await db().prepare(`SELECT key FROM live_tenders WHERE key=?`).bind(key).first();if(!exists)return json({error:"Tender not found"},404);
      if(action==="save")await db().prepare(`INSERT INTO saved_live_tenders (tender_key,saved_at) VALUES (?,?) ON CONFLICT(tender_key) DO UPDATE SET saved_at=excluded.saved_at`).bind(key,new Date().toISOString()).run();
      else await db().prepare(`DELETE FROM saved_live_tenders WHERE tender_key=?`).bind(key).run();
      return json({saved:action==="save"});
    }
    return json({error:"Unsupported action"},400);
  }catch(error){return json({error:error instanceof Error?error.message:"Tender discovery request failed"},500)}
}
