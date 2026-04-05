import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/apiError';
import { parsePagination, buildPaginationMeta, getPrismaSkip } from '../../shared/utils/pagination';
import { clearActiveStatusCache } from '../../middleware/authorize';
import { CreateUserInput, UpdateUserInput } from './users.validation';
import { Prisma } from '../../generated/prisma/client';

export class UsersService {
  async findAll(query: {
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    isActive?: string;
  }) {
    const { page, limit } = parsePagination(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role as Prisma.EnumRoleFilter['equals'];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: getPrismaSkip(page, limit),
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u: typeof users[number]) => ({
        ...u,
        transactionCount: u._count.transactions,
        _count: undefined,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { transactions: true } },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      ...user,
      transactionCount: user._count.transactions,
      _count: undefined,
    };
  }

  async create(data: CreateUserInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
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

    return user;
  }

  async update(id: string, data: UpdateUserInput, currentUserId: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prevent demoting the last admin
    if (data.role && data.role !== 'ADMIN' && user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', deletedAt: null, isActive: true },
      });
      if (adminCount <= 1) {
        throw ApiError.badRequest('Cannot demote the last admin');
      }
    }

    // Prevent deactivating the last admin
    if (data.isActive === false && user.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', deletedAt: null, isActive: true },
      });
      if (activeAdminCount <= 1) {
        throw ApiError.badRequest('Cannot deactivate the last admin');
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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

    // Clear cached active status
    clearActiveStatusCache(id);

    return updated;
  }

  async softDelete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prevent deleting the last admin
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', deletedAt: null },
      });
      if (adminCount <= 1) {
        throw ApiError.badRequest('Cannot delete the last admin');
      }
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidate all refresh tokens for this user
    await prisma.refreshToken.deleteMany({ where: { userId: id } });

    clearActiveStatusCache(id);

    return { message: 'User deleted successfully' };
  }
}

export const usersService = new UsersService();
