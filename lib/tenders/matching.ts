import type { MatchResult, Relevance } from "./types.ts";

type Rule = { category: string; phrases: string[]; weak?: string[] };
export const PRODUCT_RULES: Rule[] = [
  { category:"Steel plates", phrases:["steel plate","steel plates","ms plate","ms plates","mild steel plate","mild steel plates","hr plate","hr plates","cr plate","cr plates","chequered plate","chequered plates","checkered plate","checkered plates"] },
  { category:"Steel coils", phrases:["steel coil","steel coils","hr coil","hr coils","cr coil","cr coils","hot rolled coil","cold rolled coil"] },
  { category:"Hollow sections & tubes", phrases:["hollow section","hollow sections","structural tube","structural tubes","square hollow section","rectangular hollow section","circular hollow section","shs section","rhs section","chs section","shs steel","rhs steel","chs steel"] },
  { category:"Steel rails", phrases:["steel rail","steel rails","rail section","rail sections"] },
  { category:"Angles & channels", phrases:["steel angle","steel angles","ms angle","ms angles","steel channel","steel channels","ms channel","ms channels","ismc"] },
  { category:"Beams & columns", phrases:["steel beam","steel beams","steel joist","steel joists","steel girder","steel girders","steel column","steel columns","ismb","ishb"] },
  { category:"Wire rods", phrases:["wire rod","wire rods","steel wire rod"] },
  { category:"Steel round bars", phrases:["steel round bar","steel round bars","ms round bar","ms round bars"] },
  { category:"Measuring tools", phrases:["measuring gauge","measuring gauges","measuring gage","measuring gages","measuring tape","measuring tapes"] },
  { category:"HSS cutting tools", phrases:["hss cutting tool","hss cutting tools","drill bit","drill bits","end mill","end mills","milling cutter","milling cutters","reamer","reamers"] },
  { category:"Indexable tooling", phrases:["indexable cutting tool","indexable cutting tools","carbide insert","carbide inserts","tool holder","tool holders"] },
  { category:"Tapping & collets", phrases:["tapping attachment","tapping attachments","tapping adaptor","tapping adaptors","tapping adapter","tapping adapters","collet","collets"] },
  { category:"Industrial oils & lubricants", phrases:["industrial oil","industrial oils","automotive lubricant","automotive lubricants","cutting oil","cutting oils"] },
  { category:"Welding consumables", phrases:["welding electrode","welding electrodes","welding wire","welding wires","welding consumable","welding consumables"] },
  { category:"Welding PPE", phrases:["welding helmet","welding helmets","welding glove","welding gloves","welding jacket","welding jackets","welding goggle","welding goggles"] },
  { category:"Adhesives & sealants", phrases:["industrial adhesive","industrial adhesives","industrial sealant","industrial sealants","retaining compound","retaining compounds"] },
];

export const BRAND_TERMS = ["bilz","seeco","sandvik coromant","addison","d&h secheron","d h secheron","savsol ester 5","savsol","pinnacle tools and gauges","pinnacle tools & gauges","anabond","freemans","jindal steel and power","jindal steel & power","jspl","sail","uttam","am/ns india","amns","nalwa steel and power","nalwa steel & power"];
const WORKS_TERMS = ["construction","repair","repairing","maintenance","civil work","installation","erection","laying","fabrication service","annual maintenance","upkeep","renovation","replacement work"];
const SUPPLY_TERMS = ["supply","procurement","purchase","rate contract","providing and supplying","supply and delivery"];
const FALSE_CONTEXTS = ["number plate","license plate","printing plate","printing plates","drainage channel","television channel","tv channel","edible oil","mustard oil","cooking oil","oil seed","drilling service","drilling work","bore drilling","railway track maintenance","railway civil work","column chromatography"];

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/&/g," and ").replace(/\bchequered\b/g,"checkered").replace(/\bgages\b/g,"gauges").replace(/\badaptors?\b/g,m=>m.startsWith("adaptor")?m.replace("adaptor","adapter"):m).replace(/[^a-z0-9/]+/g," ").replace(/\s+/g," ").trim();
}

const hasPhrase=(text:string,phrase:string)=>` ${text} `.includes(` ${normalizeText(phrase)} `);

export function matchTender(title: string, description = ""): MatchResult {
  const text = normalizeText(`${title} ${description}`);
  const blocked = FALSE_CONTEXTS.filter(p => hasPhrase(text,p));
  const categories: string[] = [], evidence: string[] = [];
  for (const rule of PRODUCT_RULES) {
    const hit = rule.phrases.find(p => hasPhrase(text,p));
    if (hit && !blocked.some(b => normalizeText(hit).split(" ").some(w => w.length > 3 && normalizeText(b).includes(w)))) {
      categories.push(rule.category); evidence.push(hit);
    }
  }
  const brand = BRAND_TERMS.find(b => hasPhrase(text,b));
  if (brand) evidence.push(brand);
  const works = WORKS_TERMS.some(w => hasPhrase(text,w));
  const supply = SUPPLY_TERMS.some(w => hasPhrase(text,w));
  let relevance: Relevance = categories.length ? "strong" : "possible";
  if (works && !supply) relevance = "works-service";
  else if (categories.length === 0 && brand) relevance = "possible";
  const isRelevant = categories.length > 0 || Boolean(brand);
  return { categories, evidence:[...new Set(evidence)], relevance, isRelevant };
}
