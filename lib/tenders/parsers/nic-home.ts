import { parseIndianDate } from "../dates.ts";
import type { ParsedListing, SourceId } from "../types.ts";
import { cellsFromRow, hrefFrom, linkText, rowsFrom, stableId, textOnly } from "./shared.ts";

const meta:Record<"coal-india"|"up-etender",{origin:string;buyer:string}>={
  "coal-india":{origin:"https://coalindiatenders.nic.in",buyer:"Coal India Limited and subsidiaries"},
  "up-etender":{origin:"https://etender.up.nic.in",buyer:"Government of Uttar Pradesh"}
};

export function parseNicHomepage(html:string,source:Extract<SourceId,"coal-india"|"up-etender">):ParsedListing[]{
  const table=html.match(/<table\b[^>]*id=["']activeTenders["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!table) throw new Error("Public homepage tender table was not recognised");
  const cfg=meta[source],output:ParsedListing[]=[];
  for(const row of rowsFrom(table)){
    const cells=cellsFromRow(row); if(cells.length<4) continue;
    const href=hrefFrom(cells[0]),rawTitle=linkText(cells[0]); if(!href||!rawTitle) continue;
    const title=rawTitle.replace(/^\s*\d+\.\s*/,"").trim(),reference=textOnly(cells[1]);
    const detailUrl=new URL(href,cfg.origin).toString();
    output.push({sourceTenderId:reference||stableId(detailUrl),reference:reference||"Not available",title,buyer:cfg.buyer,publishedAt:null,closingAt:parseIndianDate(textOnly(cells[2])),detailUrl,original:{title:rawTitle,reference:reference||null,closingDate:textOnly(cells[2]),openingDate:textOnly(cells[3])}});
  }
  if(output.length===0) throw new Error("Public homepage contained no recognised tender rows");
  return output;
}
