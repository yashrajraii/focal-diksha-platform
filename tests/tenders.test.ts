import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCpppListing } from "../lib/tenders/parsers/cppp.ts";
import { parseNicHomepage } from "../lib/tenders/parsers/nic-home.ts";
import { matchTender } from "../lib/tenders/matching.ts";
import { isExpired, parseIndianDate, withinLookback } from "../lib/tenders/dates.ts";
import { cacheFallbackMessage, mergeTenderRecords, shouldUseCache } from "../lib/tenders/dedupe.ts";
import type { NormalizedTender } from "../lib/tenders/types.ts";

const here=dirname(fileURLToPath(import.meta.url));
const fixture=(name:string)=>readFileSync(join(here,"fixtures",name),"utf8");

test("CPPP parser reads captured public listing fields",()=>{const rows=parseCpppListing(fixture("cppp.html"));assert.equal(rows.length,1);assert.equal(rows[0].sourceTenderId,"2026_BPCL_26927");assert.equal(rows[0].buyer,"Bharat Petroleum Corporation Limited");assert.equal(rows[0].publishedAt,"2026-10-08T14:13:00.000Z")});
test("NIC homepage adapters parse Coal India and UP fixtures",()=>{const coal=parseNicHomepage(fixture("coal.html"),"coal-india"),up=parseNicHomepage(fixture("up.html"),"up-etender");assert.equal(coal[0].reference,"BCCL/MM/2026/021");assert.equal(coal[0].publishedAt,null);assert.match(up[0].detailUrl,/etender\.up\.nic\.in/)});
test("changed page layouts fail loudly instead of returning zero",()=>{assert.throws(()=>parseCpppListing("<html>changed</html>"),/headings/);assert.throws(()=>parseNicHomepage("<html>changed</html>","coal-india"),/not recognised/)});
test("matching covers metals, tools, welding, oils and adhesives",()=>{for(const title of ["Supply of mild steel plates and HR coils","Procurement of HSS drill bits and carbide inserts","Rate contract for welding electrodes and welding gloves","Supply of industrial cutting oils","Purchase of industrial adhesives and retaining compounds"]){const m=matchTender(title);assert.equal(m.isRelevant,true,title);assert.ok(m.categories.length>0,title)}});
test("generic-word false positives are rejected",()=>{for(const title of ["Supply of vehicle number plates","Cleaning of drainage channel","Railway civil works contract","Supply of edible mustard oil","Bore drilling service","Column chromatography system","Repairing LHS and RHS steering cylinders","Details of sailing schedule"]){assert.equal(matchTender(title).isRelevant,false,title)}});
test("mixed works and supply remain reviewable while pure works rank lower",()=>{const mixed=matchTender("Supply and installation of MS plates for shed"),works=matchTender("Repair and maintenance of steel plate fabrication structure");assert.equal(mixed.relevance,"strong");assert.equal(works.relevance,"works-service");assert.equal(works.isRelevant,true)});
test("Indian dates, lookback and expiry use actual instants",()=>{const parsed=parseIndianDate("08-Oct-2026 07:43 PM");assert.equal(parsed,"2026-10-08T14:13:00.000Z");const now=new Date("2026-10-08T15:00:00.000Z");assert.equal(withinLookback(parsed,30,now),true);assert.equal(isExpired("2026-10-08T14:59:00.000Z",now),true)});
test("dedupe preserves cross-source records and updates changed deadlines",()=>{const base={sourceLabel:"X",reference:"R",title:"Steel plates",buyer:null,publishedAt:null,closingAt:"2026-10-10T00:00:00.000Z",location:null,detailUrl:"https://eprocure.gov.in/x",description:null,quantity:null,emd:null,matchedCategories:["Steel plates"],evidence:["steel plates"],relevance:"strong" as const,firstDiscoveredAt:"2026-10-01T00:00:00.000Z",lastVerifiedAt:"2026-10-01T00:00:00.000Z",fetchRunId:"a",original:{}};const a={...base,key:"cppp:1",source:"cppp" as const,sourceTenderId:"1"},changed={...a,closingAt:"2026-10-12T00:00:00.000Z",lastVerifiedAt:"2026-10-08T00:00:00.000Z"},other={...base,key:"up-etender:1",source:"up-etender" as const,sourceTenderId:"1"};const merged=mergeTenderRecords([a] as NormalizedTender[],[changed,other] as NormalizedTender[]);assert.equal(merged.length,2);assert.equal(merged.find(x=>x.key==="cppp:1")?.closingAt,changed.closingAt);assert.equal(merged[0].firstDiscoveredAt,a.firstDiscoveredAt)});
test("cache fallback distinguishes saved and missing records",()=>{assert.equal(shouldUseCache("2026-10-08T09:55:00.000Z",new Date("2026-10-08T10:00:00.000Z")),true);assert.match(cacheFallbackMessage("CPPP","2026-10-08T09:55:00.000Z"),/Showing saved results/);assert.match(cacheFallbackMessage("CPPP",null),/No saved results/)});
