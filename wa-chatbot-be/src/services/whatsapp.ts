import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { processChatMessage } from './chatbot';

export type WAConnectionStatus = 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'DISCONNECTED';

let connectionStatus: WAConnectionStatus = 'DISCONNECTED';
let currentQrCode: string | null = null;
let sock: ReturnType<typeof makeWASocket> | null = null;

const AUTH_DIR = path.resolve(__dirname, '../../wa_auth');

export const getWAStatus = () => {
  return { status: connectionStatus, qrCode: currentQrCode };
};

export const logoutWA = async () => {
  if (sock) {
    sock.logout();
    sock = null;
  }
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
  connectionStatus = 'DISCONNECTED';
  currentQrCode = null;
  setTimeout(initWhatsApp, 1000); // Restart
};

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
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
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

    // Only reply to standard text messages for now
    const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!messageContent) return;

    console.log(`[WhatsApp] Received message from ${jid}: ${messageContent}`);

    try {
      // Send a typing indicator
      await sock!.sendPresenceUpdate('composing', jid);
      
      const reply = await processChatMessage(messageContent);
      
      await sock!.sendMessage(jid, { text: reply });
    } catch (error) {
      console.error('[WhatsApp] Error processing message:', error);
      await sock!.sendMessage(jid, { text: 'Sorry, I encountered an error while processing your request.' });
    }
  });
};
