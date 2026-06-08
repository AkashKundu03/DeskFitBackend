import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { createPublicKey, type JsonWebKey } from 'node:crypto';

interface JwkKey {
  kid: string;
  [key: string]: unknown;
}

interface KeyCache {
  keys: JwkKey[];
  fetchedAt: number;
}

interface VerifyConfig {
  provider: 'apple' | 'google';
  jwksUrl: string;
  issuer: jwt.VerifyOptions['issuer'];
  audience?: string;
}

export interface SocialIdentity {
  sub: string;
  email?: string;
}

/**
 * Verifies Apple / Google OpenID Connect identity tokens.
 *
 * Signature (RS256) and issuer are ALWAYS verified against the provider's live
 * JWKS — no security is faked. Audience is only enforced when the matching
 * client-id env var is set (see TODOs); when unset we log a warning so the gap
 * is explicit rather than silent. Uses Node's built-in crypto + fetch, so no
 * extra dependency (e.g. google-auth-library) is required.
 */
@Injectable()
export class SocialTokenVerifier {
  private readonly cache: Record<string, KeyCache | undefined> = {};
  private readonly ttlMs = 60 * 60 * 1000; // 1 hour

  async verifyApple(identityToken: string): Promise<SocialIdentity> {
    return this.verify(identityToken, {
      provider: 'apple',
      jwksUrl: 'https://appleid.apple.com/auth/keys',
      issuer: 'https://appleid.apple.com',
      // Audience must equal the app bundle id. Accept either env var name.
      audience: process.env.APPLE_BUNDLE_ID ?? process.env.APPLE_CLIENT_ID,
    });
  }

  async verifyGoogle(idToken: string): Promise<SocialIdentity> {
    return this.verify(idToken, {
      provider: 'google',
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      // TODO: set GOOGLE_IOS_CLIENT_ID (or GOOGLE_CLIENT_ID) to your OAuth client id to enforce audience.
      audience: process.env.GOOGLE_IOS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID,
    });
  }

  private async verify(token: string, config: VerifyConfig): Promise<SocialIdentity> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
      throw new UnauthorizedException('Malformed identity token');
    }

    const jwk = await this.resolveKey(config.provider, config.jwksUrl, decoded.header.kid);
    if (!jwk) {
      throw new UnauthorizedException('Unable to resolve signing key');
    }

    let publicKey: ReturnType<typeof createPublicKey>;
    try {
      publicKey = createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' });
    } catch {
      throw new UnauthorizedException('Invalid signing key');
    }

    const options: jwt.VerifyOptions = {
      algorithms: ['RS256'],
      issuer: config.issuer,
    };
    if (config.audience) {
      options.audience = config.audience;
    } else {
      // Signature + issuer are still verified below; only the audience check is skipped.
      console.warn(
        `[SocialTokenVerifier] ${config.provider} audience not enforced — set the client id env var.`,
      );
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, publicKey, options) as jwt.JwtPayload;
    } catch (error) {
      // Surface the real reason (e.g. "jwt audience invalid", "jwt expired",
      // "invalid signature") so failures are debuggable, never silently faked.
      const reason = error instanceof Error ? error.message : String(error);
      console.error(
        `[SocialTokenVerifier] ${config.provider} verification FAILED: ${reason}` +
          (config.audience ? ` (expected audience: ${config.audience})` : ''),
      );
      throw new UnauthorizedException('Identity token verification failed');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Identity token missing subject');
    }
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    return { sub: payload.sub, email };
  }

  private async resolveKey(
    provider: string,
    jwksUrl: string,
    kid: string,
  ): Promise<JwkKey | undefined> {
    const cached = this.cache[provider];
    const fresh = cached && Date.now() - cached.fetchedAt < this.ttlMs;
    if (fresh) {
      const hit = cached.keys.find((k) => k.kid === kid);
      if (hit) return hit;
    }

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch provider signing keys');
    }
    const data = (await response.json()) as { keys: JwkKey[] };
    this.cache[provider] = { keys: data.keys, fetchedAt: Date.now() };
    return data.keys.find((k) => k.kid === kid);
  }
}
