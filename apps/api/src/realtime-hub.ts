import type { Server } from "socket.io";

export class RealtimeHub {
  private server?: Server;
  attach(server: Server) { this.server = server; }
  toUser(userId: string, event: string, payload: unknown) { this.server?.to(`user:${userId}`).emit(event, payload); }
  toConversation(conversationId: string, event: string, payload: unknown, exceptSocketId?: string) {
    const room = this.server?.to(`conversation:${conversationId}`);
    (exceptSocketId ? room?.except(exceptSocketId) : room)?.emit(event, payload);
  }
  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    try { return (await this.server.in(`user:${userId}`).fetchSockets()).length > 0; }
    catch { return false; }
  }
}
