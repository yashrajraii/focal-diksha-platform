export function decodeHtml(value: string): string {
  const named: Record<string,string> = { amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" " };
  return value.replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&([a-z]+);/gi,(m,n)=>named[n.toLowerCase()]??m);
}
export function textOnly(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
}
export function cellsFromRow(row: string): string[] {
  return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
}
export function rowsFrom(html: string): string[] {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
}
export function hrefFrom(value: string): string | null {
  return value.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ? decodeHtml(value.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)![1]) : null;
}
export function linkText(value: string): string | null {
  const match=value.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i); return match?textOnly(match[1]):null;
}
export function stableId(value: string): string {
  let h=2166136261; for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)} return (h>>>0).toString(36);
}
