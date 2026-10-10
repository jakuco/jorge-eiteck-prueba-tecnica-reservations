import { Role } from './role.entity';

export class User {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name: string,
    public readonly role: Role,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
