export class Role {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string | null,
    public readonly isActive: boolean,
  ) {}

  static ADMIN = 'admin';
  static USER = 'user';

  isAdmin(): boolean {
    return this.name === Role.ADMIN;
  }

  isUser(): boolean {
    return this.name === Role.USER;
  }

  equals(other: Role): boolean {
    return this.id === other.id && this.name === other.name;
  }
}