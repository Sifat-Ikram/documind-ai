import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { publicUserSelect } from '../users/user.select';
import type { LoginDto, RegisterDto } from './auth.schemas';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await hash(dto.password, 10),
      },
      select: publicUserSelect,
    });

    return {
      user,
      tokens: await this.sessions.issueSession(user.id, user.email),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const valid = user ? await compare(dto.password, user.password) : false;

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      tokens: await this.sessions.issueSession(user.id, user.email),
    };
  }
}
