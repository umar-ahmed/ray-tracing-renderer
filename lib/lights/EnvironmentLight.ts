import { DataTexture, Light } from "three";

export class EnvironmentLight extends Light {
  public map: DataTexture;
  public isEnvironmentLight: boolean;

  constructor(map: DataTexture, ...args: any[]) {
    super(...args);
    this.map = map;
    this.isEnvironmentLight = true;
  }

  copy(source: this) {
    super.copy(source);
    this.map = source.map;
    return this;
  }
}
