import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import Stats from "stats.js";
import { Pane } from "tweakpane";

import {
  RayTracingRenderer,
  RayTracingMaterial,
  EnvironmentLight,
  LensCamera,
  SoftDirectionalLight,
} from "../lib";

const PARAMS = {
  bounces: 2,
  cameraFov: 50,
  cameraFocus: 10,
  cameraAperture: 0.01,

  color: "#ff0055",
  roughness: 0.5,
  metalness: 0.0,
  transparent: false,
  solid: false,
};

const pane = new Pane();

pane.addBinding(PARAMS, "bounces", { min: 0, max: 10, step: 1 });
pane.addBinding(PARAMS, "cameraFov", { min: 0, max: 180 });
pane.addBinding(PARAMS, "cameraFocus", { min: 0, max: 30 });
pane.addBinding(PARAMS, "cameraAperture", { min: 0, max: 100 });

pane.addBinding(PARAMS, "color");
pane.addBinding(PARAMS, "roughness", { min: 0, max: 1 });
pane.addBinding(PARAMS, "metalness", { min: 0, max: 1 });
pane.addBinding(PARAMS, "transparent");
pane.addBinding(PARAMS, "solid");

pane.on("change", ({ last }) => {
  if (last) {
    updateMaterial();
    updateCamera();

    renderer.bounces = PARAMS.bounces;
    renderer.needsUpdate = true;
  }
});

const renderer = new RayTracingRenderer();
renderer.setPixelRatio(1.0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.toneMappingWhitePoint = 5;
renderer.maxHardwareUsage = true;
renderer.renderWhenOffFocus = false;

document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.left = "0px";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

const camera = new LensCamera();
camera.fov = PARAMS.cameraFov;
camera.aperture = PARAMS.cameraAperture;
camera.focus = PARAMS.cameraFocus;

const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();

function resize() {
  if (renderer.domElement.parentElement) {
    const width = renderer.domElement.parentElement.clientWidth;
    const height = renderer.domElement.parentElement.clientHeight;
    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

window.addEventListener("resize", resize);
resize();

const tick = (time?: number) => {
  controls.update();
  camera.focus = controls.target.distanceTo(camera.position);
  stats.begin();
  renderer.sync(time);
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(tick);
};

const geo = new THREE.SphereGeometry(1, 24, 24);

function makeMesh() {
  const mat = new RayTracingMaterial();
  const mesh = new THREE.Mesh(geo, mat);

  // test setting scale and position on mesh
  mesh.position.set(0, 4, 0);
  mesh.scale.set(4, 4, 4);
  return mesh;
}

const group = new THREE.Group();
let envLight: EnvironmentLight;

function updateMaterial() {
  group.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      child.material.color.set(PARAMS.color);
      child.material.roughness = PARAMS.roughness;
      child.material.metalness = PARAMS.metalness;
      child.material.transparent = PARAMS.transparent;
      child.material.solid = PARAMS.solid;

      child.material.needsUpdate = true;
    }
  });
}

function updateCamera() {
  camera.fov = PARAMS.cameraFov;
  camera.focus = PARAMS.cameraFocus;
  camera.aperture = PARAMS.cameraAperture;
  camera.updateProjectionMatrix();
}

function init() {
  const envmap = new RGBELoader()
    .setDataType(THREE.FloatType) // hackily setting byte type to float type
    .load("/envmap.hdr");
  envmap.colorSpace = THREE.LinearSRGBColorSpace;
  envLight = new EnvironmentLight(envmap);
  scene.add(envLight);

  const light = new SoftDirectionalLight(0xffffff, 1.0, 0.5);
  light.position.set(10, 10, 0);
  light.lookAt(0, 0, 0);
  scene.add(light);

  const model = new THREE.Object3D();
  model.rotateY(-Math.PI / 2);

  controls.target.set(0, 2, 0);
  camera.position.set(31, 21, -1);

  // load gltf model
  {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderConfig({ type: "js" });
    draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    loader.setDRACOLoader(draco);
    // loader.load("/911-porsche.glb", (gltf) => {
    //   gltf.scene.children.forEach((child) => {
    //     if (child instanceof THREE.Mesh) {
    //       child.material = new RayTracingMaterial();
    //       child.material.color.set(PARAMS.color);
    //       child.material.roughness = PARAMS.roughness;
    //       child.material.metalness = PARAMS.metalness;
    //       child.material.transparent = PARAMS.transparent;
    //       child.material.solid = PARAMS.solid;
    //     }
    //     group.add(child);
    //   });
    //   group.position.set(0, 7, 0);
    //   group.scale.set(6, 6, 6);
    //   group.updateMatrixWorld();
    //   model.add(group);
    // });
    loader.load("/shader-ball.glb", (gltf) => {
      gltf.scene.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new RayTracingMaterial();
          child.material.color.set(PARAMS.color);
          child.material.roughness = PARAMS.roughness;
          child.material.metalness = PARAMS.metalness;
          child.material.transparent = PARAMS.transparent;
          child.material.solid = PARAMS.solid;
        }
        group.add(child);
      });
      group.position.set(0, 0, 0);
      group.scale.set(0.05, 0.05, 0.05);
      model.add(group);
    });
  }

  // background mirror
  // verifies BVH used in reflections
  {
    const geo = new THREE.PlaneGeometry(40, 16);
    const mat = new THREE.MeshStandardMaterial();
    mat.roughness = 0.0;
    mat.metalness = 1.0;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 8, 40);
    model.add(mesh);
  }

  // ground plane
  {
    const geo = new THREE.PlaneGeometry(1000, 1000);
    const mat = new THREE.MeshStandardMaterial();
    (mat as RayTracingMaterial).shadowCatcher = true;
    mat.roughness = 0.5;
    mat.metalness = 0.0;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotateX(Math.PI / 2);
    model.add(mesh);
  }

  scene.add(model);

  THREE.DefaultLoadingManager.onLoad = () => tick();
}

init();
