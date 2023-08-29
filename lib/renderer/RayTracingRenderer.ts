import { loadExtensions } from "./gl/glUtil";
import { makeRenderingPipeline } from "./RenderingPipeline";
import * as THREE from "three";

const glRequiredExtensions = [
  "EXT_color_buffer_float", // enables rendering to float buffers
  "EXT_float_blend",
];

const glOptionalExtensions = [
  "OES_texture_float_linear", // enables gl.LINEAR texture filtering for float textures,
];

export class RayTracingRenderer {
  static isSupported() {
    const gl = document.createElement("canvas").getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
    });

    if (!gl) {
      return false;
    }

    const extensions = loadExtensions(gl, glRequiredExtensions);
    for (let e in extensions) {
      if (!extensions[e]) {
        return false;
      }
    }

    return true;
  }

  public bounces: number = 2;
  public domElement: HTMLCanvasElement;
  public maxHardwareUsage: boolean = false;
  public needsUpdate: boolean = true;
  public onSampleRendered = null;
  public renderWhenOffFocus: boolean = true;
  public toneMapping: THREE.ToneMapping = THREE.LinearToneMapping;
  public toneMappingExposure: number = 1;
  public toneMappingWhitePoint: number = 1;

  private pipeline = null;
  private size: THREE.Vector2 = new THREE.Vector2();
  private pixelRatio: number = 1;
  private isValidTime: number = 1;
  private currentTime: number = NaN;
  private syncWarning: boolean = false;
  private lastFocus: boolean = false;
  private gl: WebGL2RenderingContext;
  private requiredExtensions: any;
  private optionalExtensions: any;

  constructor(
    params: {
      canvas?: HTMLCanvasElement;
      bounces?: number;
      maxHardwareUsage?: boolean;
      onSampleRendered?: Function;
      renderWhenOffFocus?: boolean;
      toneMapping?: THREE.ToneMapping;
      toneMappingExposure?: number;
      toneMappingWhitePoint?: number;
    } = {}
  ) {
    this.domElement = params.canvas ?? document.createElement("canvas");
    this.bounces = params.bounces ?? this.bounces;
    this.maxHardwareUsage = params.maxHardwareUsage ?? this.maxHardwareUsage;
    this.onSampleRendered = params.onSampleRendered ?? this.onSampleRendered;
    this.renderWhenOffFocus =
      params.renderWhenOffFocus ?? this.renderWhenOffFocus;
    this.toneMapping = params.toneMapping ?? this.toneMapping;
    this.toneMappingExposure =
      params.toneMappingExposure ?? this.toneMappingExposure;
    this.toneMappingWhitePoint =
      params.toneMappingWhitePoint ?? this.toneMappingWhitePoint;

    this.gl = this.domElement.getContext("webgl2", {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true,
    });

    this.requiredExtensions = loadExtensions(this.gl, glRequiredExtensions);
    this.optionalExtensions = loadExtensions(this.gl, glOptionalExtensions);

    // Assume module.render is called using requestAnimationFrame.
    // This means that when the user is on a different browser tab, module.render won't be called.
    // Since the timer should not measure time when module.render is inactive,
    // the timer should be reset when the user switches browser tabs
    document.addEventListener("visibilitychange", this.restartTimer);
  }

  getTotalSamplesRendered() {
    if (this.pipeline) {
      return this.pipeline.getTotalSamplesRendered();
    }
  }

  sync(t?: number) {
    // the first call to the callback of requestAnimationFrame does not have a time parameter
    // use performance.now() in this case
    this.currentTime = t || performance.now();
  }

  initScene(scene) {
    scene.updateMatrixWorld();

    const toneMappingParams = {
      exposure: this.toneMappingExposure,
      whitePoint: this.toneMappingWhitePoint,
      toneMapping: this.toneMapping,
    };

    const bounces = this.bounces;

    this.pipeline = makeRenderingPipeline({
      gl: this.gl,
      optionalExtensions: this.optionalExtensions,
      scene,
      toneMappingParams,
      bounces,
    });

    this.pipeline.onSampleRendered = (...args) => {
      if (
        this.onSampleRendered &&
        typeof this.onSampleRendered === "function"
      ) {
        this.onSampleRendered(...args);
      }
    };

    this.setSize(this.size.width, this.size.height);
    this.needsUpdate = false;
  }

  render(scene, camera) {
    if (!this.renderWhenOffFocus) {
      const hasFocus = document.hasFocus();
      if (!hasFocus) {
        this.lastFocus = hasFocus;
        return;
      } else if (hasFocus && !this.lastFocus) {
        this.lastFocus = hasFocus;
        this.restartTimer();
      }
    }

    if (this.needsUpdate) {
      this.initScene(scene);
    }

    if (isNaN(this.currentTime)) {
      if (!this.syncWarning) {
        console.warn(
          "Ray Tracing Renderer warning: For improved performance, please call renderer.sync(time) before render.render(scene, camera), with the time parameter equalling the parameter passed to the callback of requestAnimationFrame"
        );
        this.syncWarning = true;
      }

      this.currentTime = performance.now(); // less accurate than requestAnimationFrame's time parameter
    }

    this.pipeline.time(this.isValidTime * this.currentTime);

    this.isValidTime = 1;
    this.currentTime = NaN;

    camera.updateMatrixWorld();

    if (this.maxHardwareUsage) {
      // render new sample for the entire screen
      this.pipeline.drawFull(camera);
    } else {
      // render new sample for a tiled subset of the screen
      this.pipeline.draw(camera);
    }
  }

  getPixelRatio() {
    return this.pixelRatio;
  }

  setPixelRatio(x: number) {
    if (!x) {
      return;
    }
    this.pixelRatio = x;
    this.setSize(this.size.width, this.size.height, false);
  }

  getSize(target?: THREE.Vector2) {
    if (!target) {
      target = new THREE.Vector2();
    }

    return target.copy(this.size);
  }

  setSize(width: number, height: number, updateStyle: boolean = true) {
    this.size.set(width, height);
    this.domElement.width = this.size.width * this.pixelRatio;
    this.domElement.height = this.size.height * this.pixelRatio;

    if (updateStyle) {
      this.domElement.style.width = `${this.size.width}px`;
      this.domElement.style.height = `${this.size.height}px`;
    }

    if (this.pipeline) {
      this.pipeline.setSize(
        this.size.width * this.pixelRatio,
        this.size.height * this.pixelRatio
      );
    }
  }

  restartTimer = () => {
    this.isValidTime = NaN;
  };

  dispose() {
    document.removeEventListener("visibilitychange", this.restartTimer);
    this.pipeline = null;
  }
}
