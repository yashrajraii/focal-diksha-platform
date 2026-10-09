/** Server-only replacement for Cloudflare's native bindings in a Next.js build. */
type Query = { sql: string; params: unknown[] };
type QueryResult = { success: boolean; results: Record<string, unknown>[]; meta?: Record<string, unknown> };
type ApiResponse = { success: boolean; result?: QueryResult[] };

export function createD1HttpDatabase(
  accountId: string,
  databaseId: string,
  apiToken: string,
  request: typeof fetch = fetch,
) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`;
  async function execute(body: Query | { batch: Query[] }): Promise<QueryResult[]> {
    const response = await request(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Tender database request failed (HTTP ${response.status}).`);
    const payload = await response.json() as ApiResponse;
    const expected = "batch" in body ? body.batch.length : 1;
    if (!payload.success || !Array.isArray(payload.result) || payload.result.length !== expected || payload.result.some(r => !r.success)) {
      // Do not disclose provider messages, SQL, parameters or credentials to clients.
      throw new Error("Tender database query failed. Check the database schema and server configuration.");
    }
    return payload.result.map(r => ({ ...r, results: r.results ?? [] }));
  }
  class Statement {
    readonly query: Query;
    constructor(query: Query) { this.query = query; }
    bind(...params: unknown[]) { return new Statement({ sql: this.query.sql, params }); }
    async all<T = Record<string, unknown>>() {
      const [result] = await execute(this.query);
      return { ...result, results: result.results as T[] };
    }
    async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
      const { results } = await this.all<T>();
      const row = results[0];
      if (!row) return null;
      return column ? (row as Record<string, unknown>)[column] as T : row;
    }
    async run() { const [result] = await execute(this.query); return result; }
    async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
      const { results } = await this.all();
      const rows = results.map(row => Object.values(row));
      return (options?.columnNames && results.length ? [Object.keys(results[0]), ...rows] : rows) as T[];
    }
  }
  return {
    prepare(sql: string) { return new Statement({ sql, params: [] }); },
    async batch(statements: Statement[]) {
      if (!statements.length) return [];
      return execute({ batch: statements.map(statement => statement.query) });
    },
  };
}

export const env = {
  get DB(): D1Database {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const database = process.env.CLOUDFLARE_D1_DATABASE_ID;
    const token = process.env.CLOUDFLARE_D1_API_TOKEN;
    if (!account || !database || !token) {
      throw new Error("Live tender storage is not configured on this deployment. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_D1_API_TOKEN in Vercel. The sample demo is still available.");
    }
    return createD1HttpDatabase(account, database, token) as unknown as D1Database;
  },
};
