import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createD1HttpDatabase, env } from '../lib/server/vercel-d1-env.ts';

test('D1 HTTP adapter preserves bound values, rows and batch operations', async () => {
  const calls: {url:string; body:Record<string, unknown>}[] = [];
  const mock = (async (url: unknown, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-token');
    const body = JSON.parse(String(init.body));
    calls.push({url:String(url),body});
    const count = body.batch?.length ?? 1;
    return Response.json({success:true,result:Array.from({length:count},()=>({success:true,results:[{id:'tender-1'}]}))});
  }) as typeof fetch;
  const db = createD1HttpDatabase('account','database','test-token',mock);
  assert.deepEqual(await db.prepare('SELECT id WHERE title=?').bind("customer's plate").first(), {id:'tender-1'});
  assert.deepEqual(calls[0].body.params, ["customer's plate"]);
  assert.equal((await db.batch([db.prepare('INSERT ?').bind(3),db.prepare('UPDATE ?').bind(null)])).length, 2);
  assert.deepEqual(calls[1].body.batch, [{sql:'INSERT ?',params:[3]},{sql:'UPDATE ?',params:[null]}]);
  assert.match(calls[0].url, /^https:\/\/api\.cloudflare\.com\//);
});

test('D1 failures do not disclose provider messages or credentials', async () => {
  const mock = (async () => Response.json({success:false,errors:[{message:'secret SQL and token'}]})) as typeof fetch;
  await assert.rejects(createD1HttpDatabase('account','database','secret-token',mock).prepare('SELECT ?').bind('private').all(), error => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, /secret|private|SELECT/);
    return true;
  });
});

test('D1 rejects incomplete batch results', async () => {
  const mock = (async () => Response.json({success:true,result:[]})) as typeof fetch;
  await assert.rejects(createD1HttpDatabase('account','database','test-token',mock).prepare('SELECT 1').all());
});

test('missing configuration gives an actionable error', () => {
  const names = ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_D1_DATABASE_ID','CLOUDFLARE_D1_API_TOKEN'];
  const original = names.map(name=>process.env[name]);
  try {
    names.forEach(name=>delete process.env[name]);
    assert.throws(()=>env.DB, /Live tender storage is not configured/);
  } finally {
    names.forEach((name,i)=>{if(original[i]===undefined)delete process.env[name];else process.env[name]=original[i]});
  }
});
