import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../repositories/user.repository.interface';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  access_token: string;
  user: { id: number; email: string; roleName: string };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleName: user.role.name,
      roleId: user.role.id,
    };

    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, roleName: user.role.name },
    };
  }
}