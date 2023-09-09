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
} from "../lib";

const PARAMS = {
  bounces: 2,

  color: "#ff0055",
  roughness: 0.5,
  metalness: 0.0,
  transparent: false,
  solid: false,
};

const pane = new Pane();

pane.addBinding(PARAMS, "bounces", { min: 0, max: 10, step: 1 });

pane.addBinding(PARAMS, "color");
pane.addBinding(PARAMS, "roughness", { min: 0, max: 1 });
pane.addBinding(PARAMS, "metalness", { min: 0, max: 1 });
pane.addBinding(PARAMS, "transparent");
pane.addBinding(PARAMS, "solid");

pane.on("change", ({ last }) => {
  if (last) {
    updateMaterial();
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
camera.fov = 50;
camera.aperture = 0.01;

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

  renderer.bounces = PARAMS.bounces;
  renderer.needsUpdate = true;
}

function init() {
  const envmap = new RGBELoader()
    .setDataType(THREE.FloatType) // hackily setting byte type to float type
    .load("/envmap.hdr");
  envmap.colorSpace = THREE.LinearSRGBColorSpace;
  envLight = new EnvironmentLight(envmap);
  scene.add(envLight);

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
    //   const object = gltf.scene.children[0] as THREE.Object3D;
    //   object.position.set(0, 7, 0);
    //   object.scale.set(6, 6, 6);
    //   model.add(object);
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

  // smooth
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(-15);
  //   mesh.position.setZ(15);
  //   mesh.material.roughness = 0.0;
  //   mesh.material.metalness = 0.0;
  //   mesh.material.color.set(0xaa3333);
  //   model.add(mesh);
  // }

  // diffuse
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(-5);
  //   mesh.position.setZ(15);
  //   mesh.material.roughness = 1.0;
  //   mesh.material.metalness = 0.0;
  //   mesh.material.color.set(0x222288);
  //   model.add(mesh);
  // }

  // smooth metal
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(5);
  //   mesh.position.setZ(15);
  //   mesh.material.roughness = 0.0;
  //   mesh.material.metalness = 1.0;
  //   mesh.material.color.set(0xaaaa33);
  //   model.add(mesh);
  // }

  //rough metal
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(15);
  //   mesh.position.setZ(15);
  //   mesh.material.roughness = 1.0;
  //   mesh.material.metalness = 1.0;
  //   mesh.material.color.set(0x33aa33);
  //   model.add(mesh);
  // }

  // diffuse mapping
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(15);
  //   mesh.position.setZ(-15);
  //   mesh.material.roughness = 1.0;
  //   mesh.material.metalness = 0.0;
  //   mesh.material.map = new THREE.TextureLoader().load("/diffuse.png");
  //   mesh.material.map.colorSpace = THREE.SRGBColorSpace;
  //   model.add(mesh);
  // }

  // roughness/metalness mapping
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(5);
  //   mesh.position.setZ(-15);
  //   mesh.material.roughness = 1.0;
  //   mesh.material.metalness = 1.0;
  //   mesh.material.color.set(0x333333);
  //   mesh.material.roughnessMap = new THREE.TextureLoader().load(
  //     "/roughness.png"
  //   );
  //   mesh.material.metalnessMap = new THREE.TextureLoader().load(
  //     "/metalness.png"
  //   );
  //   model.add(mesh);
  // }

  // normal mapping
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(-5);
  //   mesh.position.setZ(-15);
  //   mesh.material.roughness = 0.1;
  //   mesh.material.metalness = 1.0;
  //   mesh.material.color.set(0xcccccc);
  //   mesh.material.normalMap = new THREE.TextureLoader().load("/normal.png");
  //   model.add(mesh);
  // }

  // combined mapping
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(-15);
  //   mesh.position.setZ(-15);
  //   mesh.material.roughness = 1.0;
  //   mesh.material.metalness = 1.0;
  //   mesh.material.map = new THREE.TextureLoader().load("/diffuse.png");
  //   mesh.material.map.colorSpace = THREE.SRGBColorSpace;
  //   mesh.material.normalMap = new THREE.TextureLoader().load("/normal.png");
  //   const metalrough = new THREE.TextureLoader().load("/metalrough.png");
  //   mesh.material.roughnessMap = metalrough;
  //   mesh.material.metalnessMap = metalrough;
  //   model.add(mesh);
  // }

  // hollow glass
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(-10);
  //   mesh.material.transparent = true;
  //   mesh.material.color.set(0xeeeeee);
  //   model.add(mesh);
  // }

  // solid glass
  // {
  //   const mesh = makeMesh();
  //   mesh.position.setX(10);
  //   mesh.material.transparent = true;
  //   mesh.material.solid = true;
  //   mesh.material.color.set(0x8888ee);
  //   model.add(mesh);
  // }

  // textured glass
  // {
  //   const mesh = makeMesh();
  //   mesh.material.transparent = true;
  //   mesh.material.solid = true;
  //   mesh.material.map = new THREE.TextureLoader().load("/glass_diffuse.png");
  //   mesh.material.map.colorSpace = THREE.SRGBColorSpace;
  //   mesh.material.normalMap = new THREE.TextureLoader().load(
  //     "/glass_normal.png"
  //   );
  //   mesh.material.normalScale.set(1.0, -1.0);
  //   model.add(mesh);
  // }

  // let unreadyMat;
  // {
  //   // Create a test (non-buffer) Geometry (Actually, since r125, this produces a BufferGeometry as well :P)
  //   const geo = new THREE.BoxGeometry(20, 6, 6);
  //   const mat = new THREE.MeshStandardMaterial();
  //   mat.roughness = 0.2;
  //   mat.metalness = 0.0;
  //   mat.color.set(0x993311);
  //   unreadyMat = mat;
  //   const mesh = new THREE.Mesh(geo, mat);
  //   mesh.position.set(0, 3, 30);
  //   model.add(mesh);
  // }

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

  // test box with .visible set to false
  // should not be visible in the scene
  // {
  //   const geo = new THREE.BoxGeometry(5, 5, 5);
  //   const mat = new THREE.MeshStandardMaterial();
  //   const mesh = new THREE.Mesh(geo, mat);
  //   mesh.position.set(0, 10, 0);
  //   mesh.visible = false;
  //   model.add(mesh);
  // }

  scene.add(model);

  THREE.DefaultLoadingManager.onLoad = () => {
    // give material an unloaded async texture. the renderer should handle this
    // unreadyMat.map = new THREE.TextureLoader().load("/diffuse.png");
    // unreadyMat.map.colorSpace = THREE.SRGBColorSpace;
    // unreadyMat.normalMap = new THREE.TextureLoader().load("/normal.png");
    // const metalrough = new THREE.TextureLoader().load("/metalrough.png");
    // unreadyMat.roughnessMap = metalrough;
    // unreadyMat.metalnessMap = metalrough;

    THREE.DefaultLoadingManager.onLoad = undefined;
    tick();
  };
}

init();
