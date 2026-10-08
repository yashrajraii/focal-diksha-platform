import { parseIndianDate } from "../dates.ts";
import type { ParsedListing } from "../types.ts";
import { cellsFromRow, hrefFrom, linkText, rowsFrom, stableId, textOnly } from "./shared.ts";

const BASE="https://eprocure.gov.in";
export function parseCpppListing(html: string): ParsedListing[] {
  if (!/e-Published Date/i.test(html) || !/Title\/Ref\.No\.\/Tender Id/i.test(html)) throw new Error("CPPP listing headings were not recognised");
  const output:ParsedListing[]=[];
  for(const row of rowsFrom(html)){
    const cells=cellsFromRow(row); if(cells.length<7) continue;
    const link=hrefFrom(cells[4]), title=linkText(cells[4]); if(!link||!title) continue;
    const fullCell=textOnly(cells[4]);
    const suffix=fullCell.slice(title.length).replace(/^\s*\/\s*/,"");
    const parts=suffix.split("/");
    const sourceTenderId=(parts.at(-1)||stableId(link)).trim();
    const reference=parts.slice(0,-1).join("/").trim()||sourceTenderId;
    const detailUrl=new URL(link,BASE).toString();
    output.push({sourceTenderId,reference,title,buyer:textOnly(cells[5])||null,publishedAt:parseIndianDate(textOnly(cells[1])),closingAt:parseIndianDate(textOnly(cells[2])),detailUrl,original:{publishedDate:textOnly(cells[1]),closingDate:textOnly(cells[2]),openingDate:textOnly(cells[3]),titleCell:fullCell,organisation:textOnly(cells[5])}});
  }
  if(output.length===0 && !/No tender/i.test(html)) throw new Error("CPPP returned no recognised rows");
  return output;
}

export function nextCpppPage(html:string):string|null{
  const match=html.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Next\s*»\s*<\/a>/i);
  return match?new URL(match[1].replace(/&amp;/g,"&"),BASE).toString():null;
}
