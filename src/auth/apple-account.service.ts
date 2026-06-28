import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

/**
 * Real Sign in with Apple credential management: exchanges the authorization
 * code for a refresh token at sign-in, and revokes it at account deletion.
 *
 * Requires Apple env config (Team ID, Key ID, Client ID, .p8 private key). When
 * not configured, methods are honest no-ops that LOG that revocation was skipped
 * — they never fake success. No secrets are committed.
 */
@Injectable()
export class AppleAccountService {
  private readonly logger = new Logger(AppleAccountService.name);

  private get teamId() { return process.env.APPLE_TEAM_ID; }
  private get keyId() { return process.env.APPLE_KEY_ID; }
  private get clientId() { return process.env.APPLE_CLIENT_ID ?? process.env.APPLE_BUNDLE_ID; }
  private get privateKey() {
    // Allow the .p8 contents in an env var with escaped newlines.
    return process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  }

  isConfigured(): boolean {
    return !!(this.teamId && this.keyId && this.clientId && this.privateKey);
  }

  /** Apple "client_secret": a short-lived ES256 JWT signed with the .p8 key. */
  private clientSecret(): string | null {
    if (!this.isConfigured()) return null;
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        iss: this.teamId,
        iat: now,
        exp: now + 60 * 30, // 30 min (Apple allows up to 6 months)
        aud: 'https://appleid.apple.com',
        sub: this.clientId,
      },
      this.privateKey as string,
      { algorithm: 'ES256', keyid: this.keyId },
    );
  }

  /** Exchange an authorization code for a refresh token (stored for revocation). */
  async exchangeAuthorizationCode(code: string): Promise<string | null> {
    const secret = this.clientSecret();
    if (!secret || !this.clientId) {
      this.logger.warn('Apple not configured — skipping code exchange.');
      return null;
    }
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: secret,
        grant_type: 'authorization_code',
        code,
      });
      const res = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        this.logger.warn(`Apple code exchange failed: ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { refresh_token?: string };
      return json.refresh_token ?? null;
    } catch (e) {
      this.logger.warn(`Apple code exchange error: ${String(e)}`);
      return null;
    }
  }

  /** Revoke the user's Apple refresh token. Returns whether revocation ran. */
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    const secret = this.clientSecret();
    if (!secret || !this.clientId) {
      this.logger.warn('Apple not configured — revocation skipped (not faked).');
      return false;
    }
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: secret,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      });
      const res = await fetch('https://appleid.apple.com/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        this.logger.warn(`Apple revoke failed: ${res.status}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`Apple revoke error: ${String(e)}`);
      return false;
    }
  }
}
