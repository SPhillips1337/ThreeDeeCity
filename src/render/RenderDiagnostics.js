export function collectRendererDiagnostics(renderer) {
  return {
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  };
}

export function disposeObject3D(object) {
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material?.userData?.shared) continue;
      material?.dispose?.();
    }
  });
}
