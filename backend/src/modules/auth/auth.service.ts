import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../shared/utils/apiError';
import { JwtPayload } from '../../shared/types/common';
import { RegisterInput, LoginInput } from './auth.validation';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }

    // First user becomes ADMIN
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'VIEWER';

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokenPair(user.id, user.role);

    return { user, ...tokens };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || user.deletedAt) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      throw ApiError.tooManyRequests(
        `Account locked due to too many failed attempts. Try again in ${remainingMins} minutes`
      );
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedAttempts + 1;
      const updateData: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw ApiError.unauthorized('Invalid email or password');
    }

    // Reset failed attempts on successful login
    if (user.failedAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    const tokens = await this.generateTokenPair(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const hashedToken = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken) {
      // Possible token reuse attack — invalidate all tokens for the user
      // We can't identify the user here, so just reject
      throw ApiError.unauthorized('Invalid refresh token — possible token reuse detected');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw ApiError.unauthorized('Refresh token has expired');
    }

    if (!storedToken.user.isActive || storedToken.user.deletedAt) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Rotate: delete old token, create new pair
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const tokens = await this.generateTokenPair(storedToken.userId, storedToken.user.role);

    return {
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const hashedToken = hashToken(refreshToken);

    await prisma.refreshToken.deleteMany({
      where: { token: hashedToken },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  private async generateTokenPair(userId: string, role: string) {
    const accessToken = generateAccessToken({ userId, role } as JwtPayload);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    // Parse refresh expiry to milliseconds
    const expiryMatch = env.JWT_REFRESH_EXPIRY.match(/^(\d+)([dhms])$/);
    let expiryMs = 7 * 24 * 60 * 60 * 1000; // default 7 days
    if (expiryMatch) {
      const value = parseInt(expiryMatch[1]);
      const unit = expiryMatch[2];
      const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
      };
      expiryMs = value * (multipliers[unit] || multipliers.d);
    }

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId,
        expiresAt: new Date(Date.now() + expiryMs),
      },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
