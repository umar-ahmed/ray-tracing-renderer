import * as THREE from "three";

export class SoftDirectionalLight extends THREE.DirectionalLight {
  public softness: number;

  constructor(
    color: THREE.ColorRepresentation,
    intensity: number,
    softness: number = 0
  ) {
    super(color, intensity);
    this.softness = softness;
  }

  copy(source: this) {
    super.copy(source);
    this.softness = source.softness;
    return this;
  }
}
