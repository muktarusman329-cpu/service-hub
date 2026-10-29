import assert from "node:assert/strict";
import { test } from "node:test";
import { JobsGateway } from "./jobs.gateway";

test("Socket.IO disconnects connections without the session cookie", async () => {
  let disconnected = false;
  const gateway = new JobsGateway({} as never, {} as never, {} as never, {} as never);
  await gateway.handleConnection({ handshake: { headers: {} }, disconnect: (close: boolean) => { disconnected = close; } } as never);
  assert.equal(disconnected, true);
});

test("Socket.IO conversation joins reject users outside the participant set", async () => {
  const gateway = new JobsGateway({} as never, {} as never, {} as never, { messages: async () => { throw new Error("not a participant"); } } as never);
  const result = await gateway.join({ data: { userId: "user-a" } } as never, { conversationId: "conversation-b" });
  assert.deepEqual(result, { error: "not_authorized" });
});

test("Socket.IO messages delegate to the persistent idempotent message service", async () => {
  const order: string[] = [];
  const gateway = new JobsGateway({} as never, {} as never, {} as never, { postMessage: async () => { order.push("persist"); return { id: "01K", body: "hello" }; } } as never);
  const result = await gateway.send({ data: { userId: "user-a" }, id: "socket-a" } as never, { conversationId: "conversation-a", clientMessageKey: "offline-key-1", body: "hello" });
  assert.equal((result as { id: string }).id, "01K");
  assert.deepEqual(order, ["persist"]);
});
