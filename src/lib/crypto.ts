/**
 * E2E Encryption Utilities for Bleeps Private Chats
 *
 * Uses Web Crypto API:
 * - AES-256-GCM for message encryption (symmetric, shared key per chat)
 * - ECDH P-256 for @bleeps key exchange (asymmetric, server public key)
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM

// Storage key for chat encryption keys
const STORAGE_KEY = 'bleeps_chat_keys';

// ============================================
// Key Generation & Import/Export
// ============================================

/**
 * Generate a new AES-256 key for a chat
 */
export async function generateChatKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to base64 string for storage/sharing
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a base64 string back to CryptoKey
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// ============================================
// Encryption / Decryption
// ============================================

/**
 * Encrypt a message with the chat's symmetric key
 */
export async function encryptMessage(
  message: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Generate random IV for each message
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a message with the chat's symmetric key
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedData = base64ToArrayBuffer(ciphertext);
  const ivData = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ivData,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ============================================
// @bleeps Server Encryption (ECDH + AES)
// ============================================

/**
 * Import server's ECDH public key
 */
export async function importServerPublicKey(pemBase64: string): Promise<CryptoKey> {
  // Server sends PEM-encoded key in base64
  const pem = atob(pemBase64);

  // Extract the base64 content between headers
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const keyBuffer = base64ToArrayBuffer(pemContents);

  return crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Encrypt a message for the server using ECDH key exchange
 * Used for @bleeps mentions in private chats
 */
export async function encryptForServer(
  message: string,
  serverPublicKey: CryptoKey
): Promise<{ ciphertext: string; iv: string; ephemeralPublicKey: string }> {
  // Generate ephemeral keypair for this message
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits']
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: serverPublicKey,
    },
    ephemeralKeyPair.privateKey,
    256
  );

  // Use shared secret as AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt']
  );

  // Encrypt the message
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    aesKey,
    data
  );

  // Export ephemeral public key to send with message
  const ephemeralPublicKeyExported = await crypto.subtle.exportKey(
    'spki',
    ephemeralKeyPair.publicKey
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    ephemeralPublicKey: arrayBufferToBase64(ephemeralPublicKeyExported),
  };
}

// ============================================
// Key Storage (localStorage)
// ============================================

interface ChatKeys {
  [chatId: string]: string;
}

/**
 * Get all stored chat keys
 */
function getChatKeys(): ChatKeys {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Store a chat's encryption key
 */
export function storeChatKey(chatId: string, key: string): void {
  if (typeof window === 'undefined') return;
  const keys = getChatKeys();
  keys[chatId] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

/**
 * Get a chat's encryption key
 */
export function getChatKey(chatId: string): string | null {
  const keys = getChatKeys();
  return keys[chatId] || null;
}

/**
 * Remove a chat's encryption key (when leaving chat)
 */
export function removeChatKey(chatId: string): void {
  if (typeof window === 'undefined') return;
  const keys = getChatKeys();
  delete keys[chatId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

/**
 * Check if we have the key for a chat
 */
export function hasChatKey(chatId: string): boolean {
  return getChatKey(chatId) !== null;
}

// ============================================
// Utility Functions
// ============================================

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================
// URL Key Handling
// ============================================

/**
 * Extract encryption key from invite URL hash
 * URL format: https://bleeps.ai/join/ABC123#key=base64EncodedKey
 */
export function extractKeyFromHash(hash: string): string | null {
  if (!hash || !hash.includes('key=')) return null;
  const keyPart = hash.split('key=')[1];
  if (!keyPart) return null;
  // Handle case where there might be other hash params
  return keyPart.split('&')[0];
}

/**
 * Create invite URL hash with encryption key
 */
export function createKeyHash(key: string): string {
  return `#key=${encodeURIComponent(key)}`;
}

// ============================================
// Message Processing Helpers
// ============================================

/**
 * Check if a message mentions @bleeps
 */
export function mentionsBleeps(message: string): boolean {
  return /@bleeps/i.test(message);
}

/**
 * Encrypt a message for a private chat
 * If @bleeps is mentioned, also encrypt for server
 */
export async function encryptForPrivateChat(
  message: string,
  chatKey: CryptoKey,
  serverPublicKey?: CryptoKey
): Promise<{
  content: string;
  iv: string;
  encrypted: true;
  bleepsContent?: string;
  bleepsIv?: string;
  bleepsEphemeralKey?: string;
}> {
  // Always encrypt for the group
  const { ciphertext, iv } = await encryptMessage(message, chatKey);

  const result: {
    content: string;
    iv: string;
    encrypted: true;
    bleepsContent?: string;
    bleepsIv?: string;
    bleepsEphemeralKey?: string;
  } = {
    content: ciphertext,
    iv,
    encrypted: true,
  };

  // If @bleeps mentioned and we have server key, also encrypt for server
  if (mentionsBleeps(message) && serverPublicKey) {
    const serverEncrypted = await encryptForServer(message, serverPublicKey);
    result.bleepsContent = serverEncrypted.ciphertext;
    result.bleepsIv = serverEncrypted.iv;
    result.bleepsEphemeralKey = serverEncrypted.ephemeralPublicKey;
  }

  return result;
}

/**
 * Decrypt messages for display
 * Returns decrypted content or error indicator
 */
export async function decryptMessagesForDisplay(
  messages: Array<{
    id: string;
    content: string;
    iv?: string;
    encrypted?: boolean;
    [key: string]: unknown;
  }>,
  chatKey: CryptoKey | null
): Promise<Array<{
  id: string;
  content: string;
  decryptionError?: boolean;
  [key: string]: unknown;
}>> {
  return Promise.all(
    messages.map(async (msg) => {
      if (!msg.encrypted || !msg.iv) {
        // Not encrypted, return as-is
        return msg;
      }

      if (!chatKey) {
        // No key available
        return {
          ...msg,
          content: '[Encrypted message - key not available]',
          decryptionError: true,
        };
      }

      try {
        const decrypted = await decryptMessage(msg.content, msg.iv, chatKey);
        return {
          ...msg,
          content: decrypted,
        };
      } catch {
        return {
          ...msg,
          content: '[Decryption failed]',
          decryptionError: true,
        };
      }
    })
  );
}
