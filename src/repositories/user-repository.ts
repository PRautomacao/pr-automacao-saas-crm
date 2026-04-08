import prisma from '@/lib/prisma';
import { User, Company } from '@prisma/client';

export type UserWithCompany = User & { company: Company };

export class UserRepository {
  /**
   * Busca um usuário pelo email, trazendo as informações da empresa.
   */
  async findByEmailWithCompany(email: string): Promise<UserWithCompany | null> {
    return await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
  }

  /**
   * Atualiza o último login do usuário
   */
  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}

export const userRepository = new UserRepository();
