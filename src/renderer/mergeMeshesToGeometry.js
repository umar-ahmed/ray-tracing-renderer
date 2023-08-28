import { BufferGeometry, BufferAttribute } from 'three';

export function mergeMeshesToGeometry(meshes) {

  let vertexCount = 0;
  let indexCount = 0;

  const geometryAndMaterialIndex = [];
  const materialIndexMap = new Map();

  for (const mesh of meshes) {
    if (!mesh.visible) {
      continue;
    }

    const geometry = mesh.geometry.isBufferGeometry ?
      cloneBufferGeometry(mesh.geometry, ['position', 'normal', 'uv']) : // BufferGeometry object
      new BufferGeometry().fromGeometry(mesh.geometry); // Geometry object

    const index = geometry.getIndex();
    if (!index) {
      addFlatGeometryIndices(geometry);
    }

    geometry.applyMatrix4(mesh.matrixWorld);

    if (!geometry.getAttribute('normal')) {
      geometry.computeVertexNormals();
    } else {
      geometry.normalizeNormals();
    }

    vertexCount += geometry.getAttribute('position').count;
    indexCount += geometry.getIndex().count;

    const material = mesh.material;
    let materialIndex = materialIndexMap.get(material);
    if (materialIndex === undefined) {
      materialIndex = materialIndexMap.size;
      materialIndexMap.set(material, materialIndex);
    }

    geometryAndMaterialIndex.push({
      geometry,
      materialIndex
    });
  }

  const geometry = mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount);

  return {
    geometry,
    materials: Array.from(materialIndexMap.keys())
  };
}

function mergeGeometry(geometryAndMaterialIndex, vertexCount, indexCount) {
  const positionAttrib = new BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
  const normalAttrib = new BufferAttribute(new Float32Array(3 * vertexCount), 3, false);
  const uvAttrib = new BufferAttribute(new Float32Array(2 * vertexCount), 2, false);
  const materialMeshIndexAttrib = new BufferAttribute(new Int32Array(2 * vertexCount), 2, false);
  const indexAttrib = new BufferAttribute(new Uint32Array(indexCount), 1, false);

  const mergedGeometry = new BufferGeometry();
  mergedGeometry.setAttribute('position', positionAttrib);
  mergedGeometry.setAttribute('normal', normalAttrib);
  mergedGeometry.setAttribute('uv', uvAttrib);
  mergedGeometry.setAttribute('materialMeshIndex', materialMeshIndexAttrib);
  mergedGeometry.setIndex(indexAttrib);

  let currentVertex = 0;
  let currentIndex = 0;
  let currentMesh = 1;

  for (const { geometry, materialIndex } of geometryAndMaterialIndex) {
    const vertexCount = geometry.getAttribute('position').count;

    // @deprecated
    // mergedGeometry.merge(geometry, currentVertex);

    // Start of BufferGeometry.merge()

    {
      const offset = currentVertex

      if ( ! ( geometry && geometry.isBufferGeometry ) ) {
  
        console.error( 'THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.', geometry );
        return;
  
      }
  
      if ( offset === undefined ) {
  
        offset = 0;
  
        console.warn(
          'THREE.BufferGeometry.merge(): Overwriting original geometry, starting at offset=0. '
          + 'Use BufferGeometryUtils.mergeBufferGeometries() for lossless merge.'
        );
  
      }
  
      const attributes = mergedGeometry.attributes;
  
      for ( const key in attributes ) {
  
        if ( geometry.attributes[ key ] === undefined ) continue;
  
        const attribute1 = attributes[ key ];
        const attributeArray1 = attribute1.array;
  
        const attribute2 = geometry.attributes[ key ];
        const attributeArray2 = attribute2.array;
  
        const attributeOffset = attribute2.itemSize * offset;
        const length = Math.min( attributeArray2.length, attributeArray1.length - attributeOffset );
  
        for ( let i = 0, j = attributeOffset; i < length; i ++, j ++ ) {
  
          attributeArray1[ j ] = attributeArray2[ i ];
  
        }
  
      }  
    }
  

    // End of BufferGeometry.merge()


    const meshIndex = geometry.getIndex();
    for (let i = 0; i < meshIndex.count; i++) {
      indexAttrib.setX(currentIndex + i, currentVertex + meshIndex.getX(i));
    }

    for (let i = 0; i < vertexCount; i++) {
      materialMeshIndexAttrib.setXY(currentVertex + i, materialIndex, currentMesh);
    }

    currentVertex += vertexCount;
    currentIndex += meshIndex.count;
    currentMesh++;
  }

  return mergedGeometry;
}

// Similar to buffergeometry.clone(), except we only copy
// specific attributes instead of everything
function cloneBufferGeometry(bufferGeometry, attributes) {
  const newGeometry = new BufferGeometry();

  for (const name of attributes) {
    const attrib = bufferGeometry.getAttribute(name);
    if (attrib) {
      newGeometry.setAttribute(name, attrib.clone());
    }
  }

  const index = bufferGeometry.getIndex();
  if (index) {
    newGeometry.setIndex(index);
  }

  return newGeometry;
}

function addFlatGeometryIndices(geometry) {
  const position = geometry.getAttribute('position');

  if (!position) {
    console.warn('No position attribute');
    return;
  }

  const index = new Uint32Array(position.count);

  for (let i = 0; i < index.length; i++) {
    index[i] = i;
  }

  geometry.setIndex(new BufferAttribute(index, 1, false));

  return geometry;
}
