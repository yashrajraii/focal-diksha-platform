import type { MatchResult, Relevance } from "./types.ts";

type Rule = { category: string; phrases: string[]; possiblePhrases?: string[] };
export const PRODUCT_RULES: Rule[] = [
  { category:"Steel plates", phrases:["steel plate","steel plates","ms plate","ms plates","mild steel plate","mild steel plates","hr plate","hr plates","cr plate","cr plates","chequered plate","chequered plates","checkered plate","checkered plates","ms sheet","ms sheets","mild steel sheet","mild steel sheets","hr sheet","hr sheets","cr sheet","cr sheets","steel sheet","steel sheets"] },
  { category:"Steel coils", phrases:["steel coil","steel coils","hr coil","hr coils","cr coil","cr coils","hot rolled coil","cold rolled coil"] },
  { category:"Hollow sections & tubes", phrases:["hollow section","hollow sections","structural tube","structural tubes","square hollow section","rectangular hollow section","circular hollow section","shs section","rhs section","chs section","shs steel","rhs steel","chs steel","hollow steel section","hollow steel sections"] },
  { category:"Steel rails", phrases:["steel rail","steel rails","rail section","rail sections"] },
  { category:"Angles & channels", phrases:["steel angle","steel angles","ms angle","ms angles","steel channel","steel channels","ms channel","ms channels","ismc"] },
  { category:"Beams & columns", phrases:["steel beam","steel beams","steel joist","steel joists","steel girder","steel girders","steel column","steel columns","ismb","ishb"],possiblePhrases:["ms structural framework","mild steel structural framework"] },
  { category:"Wire rods", phrases:["wire rod","wire rods","steel wire rod"] },
  { category:"Steel round bars", phrases:["steel round bar","steel round bars","ms round bar","ms round bars"] },
  { category:"Measuring tools", phrases:["measuring gauge","measuring gauges","measuring gage","measuring gages","measuring tape","measuring tapes","vernier caliper","vernier calipers","vernier height gauge","vernier height gauges","vernier calliper","vernier callipers","micrometer","micrometers","dial gauge","dial gauges","feeler gauge","feeler gauges"] },
  { category:"HSS cutting tools", phrases:["hss cutting tool","hss cutting tools","drill bit","drill bits","end mill","end mills","milling cutter","milling cutters","reamer","reamers","hacksaw blade","hacksaw blades","hss drill","hss drills","twist drill","twist drills","core drill","hss tool bit","hss tool bits"] },
  { category:"Indexable tooling", phrases:["indexable cutting tool","indexable cutting tools","carbide insert","carbide inserts","tool holder","tool holders"] },
  { category:"Tapping & collets", phrases:["tapping attachment","tapping attachments","tapping adaptor","tapping adaptors","tapping adapter","tapping adapters","collet","collets"] },
  { category:"Industrial oils & lubricants", phrases:["industrial oil","industrial oils","automotive lubricant","automotive lubricants","cutting oil","cutting oils","lubricant","lubricants","lubricating oil","lubricating oils","hydraulic oil","hydraulic oils","gear oil","gear oils","spindle oil","compressor oil","lubricating grease","lithium grease","ep grease"] },
  { category:"Welding consumables", phrases:["welding electrode","welding electrodes","welding wire","welding wires","welding consumable","welding consumables","welding rod","welding rods","electrode welding","electrodes welding","filler wire","filler wires","mig wire","tig wire"] },
  { category:"Welding PPE", phrases:["welding helmet","welding helmets","welding glove","welding gloves","welding jacket","welding jackets","welding goggle","welding goggles","welding handshield","welding hand shield","welding shield","welding apron","welding aprons"] },
  { category:"Adhesives & sealants", phrases:["industrial adhesive","industrial adhesives","industrial sealant","industrial sealants","retaining compound","retaining compounds","threadlocker","thread locker","epoxy adhesive","instant adhesive","silicone sealant","silicon sealant"] },
];

// Catalogue-style items (common on GeM) name the product and material out of order, e.g. "Steel Angle Equal Mild 20x20x3mm" or "MS Iron Angle".
// A product noun plus a steel material word inside one comma-separated item is a reviewable match, never a strong one.
type ItemRule = { category: string; nouns: string[]; materials: string[]; exclude: string[] };
const ITEM_RULES: ItemRule[] = [
  { category:"Steel plates", nouns:["plate","plates","sheet","sheets"], materials:["ms","mild","steel","hr","cr"], exclude:["stainless","lock","clutch","pressure","name","number","hot","cover","glass","acrylic","aluminium","aluminum","deck","roof","roofing","asbestos","cgi","polycarbonate","jointing"] },
  { category:"Angles & channels", nouns:["angle","angles","channel","channels"], materials:["ms","mild","steel"], exclude:["stainless","aluminium","aluminum"] },
  { category:"Steel coils", nouns:["coil","coils"], materials:["hr","cr","steel"], exclude:["cooling","heating","pusher","copper","condenser","evaporator","spring"] },
  { category:"Beams & columns", nouns:["beam","beams","joist","joists","girder","girders"], materials:["ms","mild","steel"], exclude:["laser","light"] },
];
const words=(text:string)=>new Set(text.split(" "));

export const BRAND_TERMS = ["bilz","seeco","sandvik coromant","addison","d&h secheron","d h secheron","savsol ester 5","savsol","pinnacle tools and gauges","pinnacle tools & gauges","anabond","freemans","jindal steel and power","jindal steel & power","jspl","sail","uttam","am/ns india","amns","nalwa steel and power","nalwa steel & power"];
const WORKS_TERMS = ["construction","repair","repairing","maintenance","civil work","installation","erection","laying","fabrication service","annual maintenance","upkeep","renovation","replacement work"];
const SUPPLY_TERMS = ["supply","procurement","purchase","rate contract","providing and supplying","supply and delivery"];
const FALSE_CONTEXTS = ["hand piece lubricant","handpiece lubricant","oil testing","testing of lubricating","lubricating oil testing","oil analysis","number plate","license plate","printing plate","printing plates","drainage channel","television channel","tv channel","edible oil","mustard oil","cooking oil","oil seed","drilling service","drilling work","bore drilling","railway track maintenance","railway civil work","column chromatography"];

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\bm\s*\.\s*s\b\.?/g," ms ").replace(/&/g," and ").replace(/\bchequered\b/g,"checkered").replace(/\bgages\b/g,"gauges").replace(/\badaptors?\b/g,m=>m.startsWith("adaptor")?m.replace("adaptor","adapter"):m).replace(/[^a-z0-9/]+/g," ").replace(/\s+/g," ").trim();
}

const hasPhrase=(text:string,phrase:string)=>` ${text} `.includes(` ${normalizeText(phrase)} `);

export function matchTender(title: string, description = ""): MatchResult {
  const text = normalizeText(`${title} ${description}`);
  const blocked = FALSE_CONTEXTS.filter(p => hasPhrase(text,p));
  const categories: string[] = [], evidence: string[] = [], possibleCategories:string[]=[];
  for (const rule of PRODUCT_RULES) {
    const hit = rule.phrases.find(p => hasPhrase(text,p));
    if (hit && !blocked.some(b => normalizeText(hit).split(" ").some(w => w.length > 3 && normalizeText(b).includes(w)))) {
      categories.push(rule.category); evidence.push(hit);
    }
    const possible=rule.possiblePhrases?.find(p=>hasPhrase(text,p));
    if(possible){possibleCategories.push(rule.category);evidence.push(possible)}
  }
  const itemCategories:string[]=[];
  if(!blocked.length)for(const item of `${title},${description}`.split(/[,;]/).map(normalizeText).filter(Boolean)){
    const w=words(item);
    for(const rule of ITEM_RULES){
      if(categories.includes(rule.category)||itemCategories.includes(rule.category))continue;
      const noun=rule.nouns.find(n=>w.has(n)),material=rule.materials.find(m=>w.has(m));
      if(noun&&material&&!rule.exclude.some(x=>w.has(x))){itemCategories.push(rule.category);evidence.push(`${material} … ${noun}`)}
    }
  }
  const brand = BRAND_TERMS.find(b => hasPhrase(text,b));
  if (brand) evidence.push(brand);
  const works = WORKS_TERMS.some(w => hasPhrase(text,w));
  const supply = SUPPLY_TERMS.some(w => hasPhrase(text,w));
  const mixedPossible=possibleCategories.length>0&&supply;
  const allCategories=[...new Set([...categories,...itemCategories,...(mixedPossible?possibleCategories:[])])];
  let relevance: Relevance = categories.length ? "strong" : "possible";
  if (works && !supply) relevance = "works-service";
  else if (categories.length === 0 && (brand||mixedPossible||itemCategories.length)) relevance = "possible";
  const isRelevant = categories.length > 0 || itemCategories.length > 0 || Boolean(brand) || mixedPossible;
  const reason=isRelevant
    ? relevance==="strong"?`Exact configured product phrase found: ${evidence[0]}.`:relevance==="works-service"?`Product wording was found, but the title is primarily a works or service contract.`:`Plausible product context found with supply wording; manual review is needed.`
    : blocked.length?`Generic wording appeared only in an excluded context: ${blocked.join(", ")}.`:`No configured product phrase or brand variant was found.`;
  return { categories:allCategories, evidence:[...new Set(evidence)], relevance, isRelevant, reason, blockedContexts:blocked };
}
