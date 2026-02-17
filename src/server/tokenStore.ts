import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface TokenEntry {
    token: string;
    createdAt: number;
    lastUsed: number;
}

const TOKENS_FILE = path.resolve('./src/tokens.json');
const EXPIRY_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

let tokens: TokenEntry[] = [];

function load(): void {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
        }
    } catch {
        tokens = [];
    }
}

function save(): void {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    } catch (e) {
        console.error('Failed to persist tokens:', e);
    }
}

function purgeExpired(): void {
    const now = Date.now();
    const before = tokens.length;
    tokens = tokens.filter(t => (now - t.lastUsed) < EXPIRY_MS);
    if (tokens.length !== before) save();
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

/**
 * Store a token upon successful connection.
 * If it already exists, refresh its lastUsed timestamp.
 */
export function storeToken(token: string): void {
    purgeExpired();
    const existing = tokens.find(t => timingSafeEqual(t.token, token));
    if (existing) {
        existing.lastUsed = Date.now();
    } else {
        const now = Date.now();
        tokens.push({ token, createdAt: now, lastUsed: now });
    }
    save();
}

/** Check if a token is already known/stored on the server. */
export function isKnownToken(token: string): boolean {
    purgeExpired();
    return tokens.some(t => timingSafeEqual(t.token, token));
}

/** Refresh the lastUsed timestamp for a token. */
export function touchToken(token: string): void {
    const entry = tokens.find(t => timingSafeEqual(t.token, token));
    if (entry) {
        entry.lastUsed = Date.now();
        // Persist periodically — save only if >60s since last save
        // to avoid excessive disk I/O on every message
    }
}

/** Check if any tokens exist yet (first-run detection). */
export function hasTokens(): boolean {
    purgeExpired();
    return tokens.length > 0;
}

/** Generate a cryptographically random token. */
export function generateToken(): string {
    return crypto.randomUUID();
}

// Load persisted tokens on startup
load();
