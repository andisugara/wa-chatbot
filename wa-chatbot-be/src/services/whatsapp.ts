import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { processChatMessage } from './chatbot';
import { prisma } from '../lib/prisma';

// Helper to resolve the correct images directory
const getImagesDir = () => {
  const dockerPath = '/app/images';
  if (fs.existsSync(dockerPath)) {
    return dockerPath;
  }
  return path.resolve(__dirname, '../../../images');
};

export type WAConnectionStatus = 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'DISCONNECTED';

let connectionStatus: WAConnectionStatus = 'DISCONNECTED';
let currentQrCode: string | null = null;
let sock: ReturnType<typeof makeWASocket> | null = null;

const AUTH_DIR = path.resolve(__dirname, '../../wa_auth');

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function safeRemoveDir(dir: string, retries = 5, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return;
    } catch (err: any) {
      const code = err && err.code;
      if (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY') {
        console.warn(`[WhatsApp] remove dir attempt ${i + 1} failed (${code}). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      console.error('[WhatsApp] Failed to remove auth dir:', err);
      return;
    }
  }
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.error('[WhatsApp] Final remove attempt failed:', err);
  }
}

export const getWAStatus = () => {
  return { status: connectionStatus, qrCode: currentQrCode };
};

export const logoutWA = async () => {
  if (sock) {
    sock.logout();
    sock = null;
  }
  if (fs.existsSync(AUTH_DIR)) {
    await safeRemoveDir(AUTH_DIR);
  }
  connectionStatus = 'DISCONNECTED';
  currentQrCode = null;
  setTimeout(initWhatsApp, 1000); // Restart
};

class MessageQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  add(task: () => Promise<void>) {
    this.queue.push(task);
    this.processNext();
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('[WhatsApp] Queue execution error:', error);
      }
    }
    this.isProcessing = false;
    this.processNext();
  }
}

const messageQueue = new MessageQueue();

export const initWhatsApp = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`[WhatsApp] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

  connectionStatus = 'CONNECTING';

  sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: pino({ level: 'silent' }) as any, // Mute pino logs
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'QR_READY';
      currentQrCode = await QRCode.toDataURL(qr);
      console.log('[WhatsApp] QR Code Ready. Please scan.');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[WhatsApp] Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      connectionStatus = 'DISCONNECTED';
      currentQrCode = null;

      if (shouldReconnect) {
        initWhatsApp();
      } else {
        console.log('[WhatsApp] Logged out. Waiting for new login.');
        if (fs.existsSync(AUTH_DIR)) {
          await safeRemoveDir(AUTH_DIR);
        }
        initWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('[WhatsApp] Connected and ready to process messages!');
      connectionStatus = 'CONNECTED';
      currentQrCode = null;
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid) return;
    console.log("msg ", msg)
    // Only reply to standard text messages for now
    const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!messageContent) return;

    console.log(`[WhatsApp] Received message from ${jid}: ${messageContent}`);

    // Add to processing queue to prevent concurrent API requests dropping
    messageQueue.add(async () => {
      try {
        const phoneJid = (msg.key as any).remoteJidAlt || jid;
        const phoneNumber = phoneJid.split('@')[0];
        const contactName = msg.pushName || phoneNumber;

        // 1. Automatically save/update the contact in DB
        const contact = await prisma.contact.upsert({
          where: { phoneNumber },
          update: {}, // Keep existing customized contact name and AI status
          create: {
            phoneNumber,
            name: contactName,
            aiEnabled: true,
          },
        });

        // 2. If AI status is OFF (disabled), only record the incoming message and skip AI generation
        if (!contact.aiEnabled) {
          console.log(`[WhatsApp] AI is disabled for ${phoneNumber}. Skipping bot response for takeover.`);
          await (prisma as any).message.create({
            data: {
              phoneNumber,
              role: 'user',
              content: messageContent,
            },
          });
          return;
        }

        // Send a typing indicator
        await sock!.sendPresenceUpdate('composing', jid);

        // 3. Process chatbot message via AI (with phone context history)
        const reply = await processChatMessage(messageContent, phoneNumber);

        // 4. Check if AI requested sending specific images (supports multiple images)
        if (reply.includes('fetchImage')) {
          const imagesDir = getImagesDir();
          const filesToSend: string[] = [];

          // Find all fetchImage:<urls_or_filenames> matches
          const fetchImageRegex = /fetchImage:([^\s]+)/gi;
          let match;

          while ((match = fetchImageRegex.exec(reply)) !== null) {
            const list = match[1];
            // Split comma-separated URLs or filenames
            const parts = list.split(',');
            for (const part of parts) {
              const filename = path.basename(part.trim());
              if (filename) {
                const filePath = path.join(imagesDir, filename);
                if (fs.existsSync(filePath)) {
                  filesToSend.push(filePath);
                } else {
                  console.warn(`[WhatsApp] Image ${filename} does not exist in directory.`);
                }
              }
            }
          }

          if (filesToSend.length > 0) {
            // Extract caption by stripping all fetchImage instructions from response
            const caption = reply.replace(/fetchImage:[^\s]+/gi, '').trim();

            console.log(`[WhatsApp] Sending ${filesToSend.length} media images. Caption: "${caption}"`);

            for (let i = 0; i < filesToSend.length; i++) {
              const filePath = filesToSend[i];
              // Attach the caption to the first image, leave others without caption
              const imageCaption = i === 0 ? (caption || undefined) : undefined;

              await sock!.sendMessage(jid, {
                image: fs.readFileSync(filePath),
                caption: imageCaption,
              });
            }

            // Log the assistant response to database logs
            await (prisma as any).message.create({
              data: {
                phoneNumber,
                role: 'assistant',
                content: reply,
              },
            });
            return;
          }
        }

        // Send standard text response
        await sock!.sendMessage(jid, { text: reply });
      } catch (error) {
        console.error('[WhatsApp] Error processing message:', error);
        await sock!.sendMessage(jid, { text: 'Maaf, terjadi kesalahan saat memproses permintaan Anda' });
      }
    });
  });
};
