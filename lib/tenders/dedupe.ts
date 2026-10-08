import type { NormalizedTender } from "./types.ts";

export function mergeTenderRecords(existing:NormalizedTender[],incoming:NormalizedTender[]):NormalizedTender[]{
  const map=new Map(existing.map(t=>[t.key,t]));
  for(const next of incoming){const previous=map.get(next.key);map.set(next.key,previous?{...previous,...next,firstDiscoveredAt:previous.firstDiscoveredAt}:next)}
  return [...map.values()];
}
export function shouldUseCache(lastSuccessAt:string|null,now=new Date(),ttlMs=10*60_000):boolean{return Boolean(lastSuccessAt&&now.getTime()-new Date(lastSuccessAt).getTime()<ttlMs)}
export function cacheFallbackMessage(source:string,lastSuccessAt:string|null):string{return lastSuccessAt?`Could not refresh ${source}. Showing saved results from ${lastSuccessAt}.`:`Could not refresh ${source}. No saved results are available.`}
