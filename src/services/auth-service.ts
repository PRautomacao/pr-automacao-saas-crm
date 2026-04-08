import { userRepository } from '@/repositories/user-repository';
import bcrypt from 'bcryptjs';

export class AuthService {
  /**
   * Valida as credenciais do usuário.
   * Lança um Error se as credenciais forem corrompidas ou erradas (repassado para o NextAuth tratar).
   */
  async validateCredentials(email?: string, password?: string) {
    if (!email || !password) {
      throw new Error('Credenciais inválidas');
    }

    const user = await userRepository.findByEmailWithCompany(email);

    if (!user || !user.isActive) {
      throw new Error('Usuário não encontrado ou inativo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Senha incorreta');
    }

    // Atualiza metadado de último login silenciosamente
    await userRepository.updateLastLogin(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      companySlug: user.company.slug,
      avatar: user.avatar,
    };
  }
}

export const authService = new AuthService();
