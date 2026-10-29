import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";
import type { ServerOptions } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { env } from "@servicehub/config/env";
import { PrismaService } from "./prisma.service";
import { RealtimeHub } from "./realtime-hub";
import type { JobsService } from "./jobs.module";

@Injectable()
export class JobsSocketAdapter extends IoAdapter {
  private pub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  private sub = this.pub.duplicate();
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(createAdapter(this.pub, this.sub));
    return server;
  }
  async close(server: any) { await super.close(server); await this.pub.quit(); await this.sub.quit(); }
}

@WebSocketGateway({ namespace: "/jobs", cors: { origin: env.APP_ORIGINS.split(",").map(value => value.trim()), credentials: true }, transports: ["websocket", "polling"] })
export class JobsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(@Inject(JwtService) private jwt: JwtService, @Inject(PrismaService) private db: PrismaService, @Inject(RealtimeHub) private hub: RealtimeHub, @Inject("JOBS_SERVICE") private jobs: JobsService) {}
  async afterInit(server: Server) { this.hub.attach(server); }
  async handleConnection(socket: Socket) {
    try {
      const cookie = socket.handshake.headers.cookie || "";
      const token = cookie.split(";").map(part => part.trim()).find(part => part.startsWith("access_token="))?.slice("access_token=".length);
      if (!token) return socket.disconnect(true);
      const claims = await this.jwt.verifyAsync<{ sub: string; sid: string }>(decodeURIComponent(token));
      const [user, session] = await Promise.all([this.db.user.findUnique({ where: { id: claims.sub }, select: { id: true, status: true, deletedAt: true } }), this.db.session.findFirst({ where: { id: claims.sid, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })]);
      if (!user || user.status !== "ACTIVE" || user.deletedAt || !session) return socket.disconnect(true);
      socket.data.userId = user.id; socket.data.sessionId = session.id; socket.join(`user:${user.id}`);
    } catch { socket.disconnect(true); }
  }
  @SubscribeMessage("conversation:join")
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string }) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || !body?.conversationId) return { error: "not_authorized" };
    try { const page = await this.jobs.messages(userId, body.conversationId); await socket.join(`conversation:${body.conversationId}`); return { ok: true, catchup: page }; }
    catch { return { error: "not_authorized" }; }
  }
  @SubscribeMessage("message:send")
  async send(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string; clientMessageKey: string; body?: string; attachments?: string[] }) {
    const userId = socket.data.userId as string | undefined;
    if (!userId || !body?.conversationId) return { error: "not_authorized" };
    try { return await this.jobs.postMessage(userId, body.conversationId, { clientMessageKey: body.clientMessageKey, body: body.body, attachments: body.attachments }, undefined, socket.id); }
    catch (error) { return { error: error instanceof Error ? error.message : "message_failed" }; }
  }
  @SubscribeMessage("typing")
  async typing(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string; active: boolean }) {
    const userId = socket.data.userId as string | undefined; if (!userId) return { error: "not_authorized" };
    try { await this.jobs.messages(userId, body.conversationId); this.hub.toConversation(body.conversationId, "typing", { userId, active: !!body.active }, socket.id); return { ok: true }; } catch { return { error: "not_authorized" }; }
  }
  @SubscribeMessage("message:read")
  async read(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string }) {
    const userId = socket.data.userId as string | undefined; if (!userId) return { error: "not_authorized" };
    try { const page = await this.jobs.messages(userId, body.conversationId); this.hub.toConversation(body.conversationId, "receipt:read", { userId, at: new Date().toISOString() }, socket.id); return { ok: true, unreadCount: page.items.filter(row => row.senderId !== userId).length }; } catch { return { error: "not_authorized" }; }
  }
}
