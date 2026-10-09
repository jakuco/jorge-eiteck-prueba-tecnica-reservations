import { TypeResource } from './type-resource.entity';

export type ResourceStatus = 'enabled' | 'disabled';

export class Resource {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string | null,
    public readonly type: TypeResource,
    public readonly status: ResourceStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isEnabled(): boolean {
    return this.status === 'enabled';
  }

  disable(): Resource {
    return new Resource(
      this.id,
      this.name,
      this.description,
      this.type,
      'disabled',
      this.createdAt,
      new Date(),
    );
  }

  enable(): Resource {
    return new Resource(
      this.id,
      this.name,
      this.description,
      this.type,
      'enabled',
      this.createdAt,
      new Date(),
    );
  }
}