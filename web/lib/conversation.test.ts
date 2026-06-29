import { describe, it, expect } from "vitest";
import { getConversation, appendMessage, type Message } from "./conversation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock minimal et chaînable d'un client Supabase (juste ce qu'utilise conversation.ts) :
// from().select().eq().limit() | insert().select().single() | update().eq().
type Row = Record<string, unknown>;
function makeSb(initial: Row[] = []) {
  const store: Record<string, Row[]> = { conversations: [...initial] };
  function from(table: string) {
    const q = {
      _op: "select" as "select" | "insert" | "update",
      _filters: {} as Record<string, unknown>,
      _payload: null as Row | null,
      _single: false,
      select() {
        return q;
      },
      insert(p: Row) {
        q._op = "insert";
        q._payload = p;
        return q;
      },
      update(p: Row) {
        q._op = "update";
        q._payload = p;
        return q;
      },
      eq(c: string, v: unknown) {
        q._filters[c] = v;
        return q;
      },
      limit() {
        return q;
      },
      single() {
        q._single = true;
        return q;
      },
      maybeSingle() {
        q._single = true;
        return q;
      },
      then<T>(resolve: (v: { data: unknown; error: null }) => T) {
        return Promise.resolve(run()).then(resolve);
      },
    };
    const rows = () => store[table] ?? (store[table] = []);
    const match = (r: Row) => Object.entries(q._filters).every(([k, v]) => r[k] === v);
    function run() {
      if (q._op === "insert") {
        rows().push(q._payload as Row);
        return { data: q._single ? q._payload : [q._payload], error: null };
      }
      if (q._op === "update") {
        const upd = rows().filter(match);
        upd.forEach((r) => Object.assign(r, q._payload));
        return { data: upd, error: null };
      }
      const found = rows().filter(match);
      return { data: q._single ? (found[0] ?? null) : found, error: null };
    }
    return q;
  }
  return { store, sb: { from } as unknown as SupabaseClient };
}

describe("getConversation", () => {
  it("retrouve le fil par demande_id (cas seed)", async () => {
    const msgs: Message[] = [{ role: "user", content: "hi" }];
    const { sb } = makeSb([{ id: "c1", demande_id: "D", client_id: "cli", messages: msgs }]);
    const conv = await getConversation(sb, "D");
    expect(conv.id).toBe("c1");
    expect(conv.messages).toHaveLength(1);
  });

  it("retrouve le fil par id quand demande_id est absent (flux chat)", async () => {
    const { sb } = makeSb([{ id: "D", demande_id: null, client_id: "cli", messages: [] }]);
    const conv = await getConversation(sb, "D");
    expect(conv.id).toBe("D");
  });

  it("crée un fil vide (id == demande) si aucun n'existe", async () => {
    const { sb, store } = makeSb([]);
    const conv = await getConversation(sb, "D", "cli");
    expect(conv.id).toBe("D");
    expect(conv.messages).toEqual([]);
    expect(store.conversations).toHaveLength(1);
    expect(store.conversations[0]).toMatchObject({ id: "D", demande_id: "D", client_id: "cli" });
  });
});

describe("appendMessage", () => {
  it("ajoute un message (role + content + ts) et le persiste", async () => {
    const { sb, store } = makeSb([{ id: "c1", demande_id: "D", client_id: "cli", messages: [] }]);
    const conv = { id: "c1", messages: [] as Message[] };
    const out = await appendMessage(sb, conv, "user", "bonjour");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ role: "user", content: "bonjour" });
    expect(typeof out[0].ts).toBe("string");
    expect((store.conversations[0].messages as Message[])[0].content).toBe("bonjour");
  });

  it("tronque le contenu à 2000 caractères", async () => {
    const { sb } = makeSb([{ id: "c1", demande_id: "D", client_id: "cli", messages: [] }]);
    const out = await appendMessage(sb, { id: "c1", messages: [] }, "admin", "x".repeat(3000));
    expect(out[0].content).toHaveLength(2000);
  });
});
