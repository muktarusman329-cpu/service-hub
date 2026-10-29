import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import nodemailer from "nodemailer";
import { env } from "@servicehub/config/env";
import { PrismaService } from "./prisma.service";
import { decryptJobValue, digest, encryptJobValue } from "./security";

type DeliveryChannel = "WHATSAPP" | "SMS" | "EMAIL" | "DEV";
type OtpMessage = { deliveryId: string; destinationEncrypted: string; channel: DeliveryChannel; fallbackChannel: DeliveryChannel; codeEncrypted: string; templateKey?: string };
const connection = (worker = false) => new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: worker ? null : 1,
  connectTimeout: 1500,
  enableOfflineQueue: worker,
  retryStrategy: worker ? undefined : (attempt) => attempt > 3 ? null : Math.min(attempt * 250, 1000)
});

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly queue = new Queue<OtpMessage>(env.NOTIFICATION_QUEUE_NAME, { connection: connection() });
  private worker?: Worker<OtpMessage>;
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async onModuleInit() {
    this.worker = new Worker<OtpMessage>(env.NOTIFICATION_QUEUE_NAME, async (job) => this.deliver(job.data), { connection: connection(true), concurrency: 5 });
    this.worker.on("failed", async (job, error) => {
      this.logger.warn(`Notification delivery failed (${job?.id}): ${error.name}`);
      if (job && job.attemptsMade >= Number(job.opts.attempts || 1)) await this.db.notification.updateMany({ where: { id: job.data.deliveryId }, data: { status: "DEAD_LETTER" } });
    });
  }
  async onModuleDestroy() { await this.worker?.close(); await this.queue.close(); }
  async sendOtp(destination: string, channel: DeliveryChannel, code: string, userId?: string) {
    const delivery = await this.db.notification.create({ data: { userId, destinationHash: digest(destination), channel, templateKey: "auth.otp", status: "QUEUED" } });
    const configuredFallback = env.OTP_FALLBACK_CHANNEL === "email" ? "termii" : env.OTP_FALLBACK_CHANNEL;
    const fallbackChannel = destination.includes("@") ? "EMAIL" : (configuredFallback === "termii" ? "SMS" : configuredFallback.toUpperCase()) as DeliveryChannel;
    try {
      await this.queue.add("otp", { deliveryId: delivery.id, destinationEncrypted: encryptJobValue(destination), channel, fallbackChannel, codeEncrypted: encryptJobValue(code), templateKey: "auth.otp" }, { attempts: 4, backoff: { type: "exponential", delay: 1500 }, removeOnComplete: true, removeOnFail: { age: 7 * 24 * 3600, count: 1000 } });
    } catch (error) {
      await this.db.notification.update({ where: { id: delivery.id }, data: { status: "FAILED", lastErrorCode: "queue_unavailable" } });
      throw error;
    }
  }
  async sendTechnicianStatus(userId: string, status: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { phoneE164: true, email: true, emailVerifiedAt: true, preferredOtpChannel: true } });
    if (!user) return;
    const phonePrimary = user.preferredOtpChannel === "EMAIL" && user.emailVerifiedAt && user.email ? "EMAIL" : user.preferredOtpChannel || env.OTP_PRIMARY_CHANNEL.toUpperCase();
    const destination = phonePrimary === "EMAIL" ? user.email! : user.phoneE164;
    if (!destination) return;
    const channel = phonePrimary as DeliveryChannel;
    const delivery = await this.db.notification.create({ data: { userId, destinationHash: digest(destination), channel, templateKey: "technician.status", status: "QUEUED" } });
    const message = { deliveryId: delivery.id, destinationEncrypted: encryptJobValue(destination), channel, fallbackChannel: user.emailVerifiedAt && user.email ? "EMAIL" as const : channel, codeEncrypted: encryptJobValue(`Your ServiceHub technician application status is ${status.toLowerCase().replaceAll("_", " ")}. Sign in to view details.`), templateKey: "technician.status" };
    await this.queue.add("notice", message, { attempts: 4, backoff: { type: "exponential", delay: 1500 }, removeOnComplete: true, removeOnFail: { age: 7 * 24 * 3600, count: 1000 } });
  }
  async sendMarketplaceNotice(userId: string, eventKey: string, title: string, body: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { phoneE164: true, email: true, emailVerifiedAt: true, preferredOtpChannel: true } });
    if (!user) return;
    await this.db.userInboxNotification.create({ data: { userId, title: title.slice(0, 160), body: body.slice(0, 500) } });
    const choices: Array<{ channel: DeliveryChannel; destination: string }> = [];
    const preferred = (user.preferredOtpChannel || env.OTP_PRIMARY_CHANNEL.toUpperCase()) as DeliveryChannel;
    if (preferred === "WHATSAPP" && user.phoneE164) choices.push({ channel: "WHATSAPP", destination: user.phoneE164 });
    if (preferred === "SMS" && user.phoneE164) choices.push({ channel: "SMS", destination: user.phoneE164 });
    if (preferred === "EMAIL" && user.email && user.emailVerifiedAt) choices.push({ channel: "EMAIL", destination: user.email });
    if (preferred === "DEV" && env.NODE_ENV !== "production") choices.push({ channel: "DEV", destination: user.phoneE164 || user.email || userId });
    if (user.email && user.emailVerifiedAt && !choices.some(choice => choice.channel === "EMAIL")) choices.push({ channel: "EMAIL", destination: user.email });
    if (user.phoneE164 && !choices.some(choice => choice.channel === "SMS")) choices.push({ channel: "SMS", destination: user.phoneE164 });
    const preferences = await this.db.notificationPreference.findMany({ where: { userId, eventKey } });
    const allowed = (channel: DeliveryChannel) => preferences.find(p => p.channel === channel)?.enabled ?? true;
    const primary = choices.find(choice => allowed(choice.channel));
    if (!primary) return;
    const fallback = choices.find(choice => choice.channel !== primary.channel && allowed(choice.channel)) || primary;
    const delivery = await this.db.notification.create({ data: { userId, destinationHash: digest(primary.destination), channel: primary.channel, templateKey: `marketplace.${eventKey}`.slice(0, 80), status: "QUEUED" } });
    try {
      await this.queue.add("notice", { deliveryId: delivery.id, destinationEncrypted: encryptJobValue(primary.destination), channel: primary.channel, fallbackChannel: fallback.channel, codeEncrypted: encryptJobValue(`${title}\n${body}`), templateKey: `marketplace.${eventKey}` }, { attempts: 4, backoff: { type: "exponential", delay: 1500 }, removeOnComplete: true, removeOnFail: { age: 7 * 24 * 3600, count: 1000 } });
    } catch (error) {
      await this.db.notification.update({ where: { id: delivery.id }, data: { status: "FAILED", lastErrorCode: "queue_unavailable" } });
      throw error;
    }
  }
  private async deliver(message: OtpMessage) {
    const destination = decryptJobValue(message.destinationEncrypted);
    const code = decryptJobValue(message.codeEncrypted);
    try {
      let deliveredBy = message.channel;
      try { await this.sendChannel(message.channel, destination, code, message.templateKey === "auth.otp", message.templateKey); }
      catch (primaryError) {
        if (message.fallbackChannel === message.channel) throw primaryError;
        this.logger.warn(`OTP primary channel failed (${message.channel}); trying configured fallback (${message.fallbackChannel})`);
        await this.sendChannel(message.fallbackChannel, destination, code, message.templateKey === "auth.otp", message.templateKey);
        deliveredBy = message.fallbackChannel;
      }
      await this.db.notification.update({ where: { id: message.deliveryId }, data: { channel: deliveredBy, status: "SENT", sentAt: new Date(), attemptCount: { increment: 1 } } });
    } catch (error) {
      await this.db.notification.update({ where: { id: message.deliveryId }, data: { status: "RETRYING", attemptCount: { increment: 1 }, lastErrorCode: error instanceof Error ? error.name : "delivery_error" } });
      throw error;
    }
  }
  private async sendChannel(channel: DeliveryChannel, destination: string, code: string, isOtp: boolean, templateKey?: string) {
    if (channel === "DEV") { console.info(isOtp ? `[DEV OTP] ${code}` : `[DEV notification] ${templateKey || "event"}`); return; }
    if (channel === "SMS") {
      const response = await fetch("https://api.ng.termii.com/api/sms/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: env.TERMII_API_KEY, to: destination, from: env.TERMII_SENDER_ID, sms: isOtp ? `Your ServiceHub code is ${code}. It expires in 5 minutes.` : code, type: "plain", channel: "generic" }) });
      if (!response.ok) throw new Error(`termii_${response.status}`); return;
    }
    if (channel === "WHATSAPP") {
      const templateName = isOtp ? "servicehub_otp" : templateKey?.startsWith("marketplace.") ? "servicehub_marketplace_update" : "technician_status_update";
      const response = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", headers: { authorization: `Bearer ${env.WHATSAPP_CLOUD_API_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: destination, type: "template", template: { name: templateName, language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: code }] }, ...(isOtp ? [{ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] }] : [])] } }) });
      if (!response.ok) throw new Error(`whatsapp_${response.status}`); return;
    }
    if (env.EMAIL_PROVIDER === "resend") {
      const marketplace = templateKey?.startsWith("marketplace.");
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM, to: destination, subject: isOtp ? "Your ServiceHub sign-in code" : marketplace ? "A ServiceHub update" : "Your ServiceHub technician application update", text: isOtp ? `Your code is ${code}. It expires in 5 minutes.` : code }) });
      if (!response.ok) throw new Error(`resend_${response.status}`); return;
    }
    const transporter = nodemailer.createTransport(env.SMTP_URL || "smtp://localhost:1025");
    const marketplace = templateKey?.startsWith("marketplace.");
    await transporter.sendMail({ from: env.EMAIL_FROM, to: destination, subject: isOtp ? "Your ServiceHub sign-in code" : marketplace ? "A ServiceHub update" : "Your ServiceHub technician application update", text: isOtp ? `Your code is ${code}. It expires in 5 minutes.` : code });
  }
}
