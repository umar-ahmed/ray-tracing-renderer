import { PerspectiveCamera } from "three";

export class LensCamera extends PerspectiveCamera {
  public aperture: number;

  constructor(...args: any[]) {
    super(...args);
    this.aperture = 0.01;
  }

  copy(source: this, recursive: boolean) {
    super.copy(source, recursive);
    this.aperture = source.aperture;
    return this;
  }
}
