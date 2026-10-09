import { parseIndianNumericDate } from "../dates.ts";
import type { ParsedListing } from "../types.ts";
import { cellsFromRow, hrefFrom, rowsFrom, textOnly } from "./shared.ts";

const BASE="https://ntpctender.ntpc.co.in";

export function parseNtpcListing(html:string):ParsedListing[]{
  const table=html.match(/<table\b[^>]*id=["']TenderLists["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!table||!/Tender\/NIT Ref\./i.test(table)||!/Closing Date/i.test(table))throw new Error("NTPC public live-tender table was not recognised");
  const output:ParsedListing[]=[];
  for(const row of rowsFrom(table)){
    const cells=cellsFromRow(row);if(cells.length<7)continue;
    const reference=textOnly(cells[1]),title=textOnly(cells[3]),href=hrefFrom(cells[6]);
    if(!reference||!title||!href)continue;
    const closingRaw=textOnly(cells[5]),closing=parseIndianNumericDate(closingRaw);
    output.push({sourceTenderId:reference,reference,title,buyer:textOnly(cells[4])||"NTPC Limited",publishedAt:null,closingAt:closing?.iso??null,detailUrl:new URL(href,BASE).toString(),original:{closingDate:(closing?.dateLabel??closingRaw)||null,closingTimeVerified:String(Boolean(closing?.timeVerified)),sourceOfNit:textOnly(cells[4])||null}});
  }
  if(output.length===0)throw new Error("NTPC public table contained no recognised tender rows");
  return output;
}
