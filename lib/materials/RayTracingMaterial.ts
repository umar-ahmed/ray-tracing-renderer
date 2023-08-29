import { MeshStandardMaterial } from "three";

export class RayTracingMaterial extends MeshStandardMaterial {
  public solid: boolean;
  public shadowCatcher: boolean;

  constructor(...args: any[]) {
    super(...args);
    this.solid = false;
    this.shadowCatcher = false;
  }

  copy(source: this) {
    super.copy(source);
    this.solid = source.solid;
    this.shadowCatcher = source.shadowCatcher;
    return this;
  }
}
