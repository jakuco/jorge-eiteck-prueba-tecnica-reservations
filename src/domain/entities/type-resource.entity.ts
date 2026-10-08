export class TypeResource {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string | null,
  ) {}
}