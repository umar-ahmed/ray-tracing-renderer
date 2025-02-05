export function makeFramebuffer(gl, { color, depth }) {
  const framebuffer = gl.createFramebuffer();

  function bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }

  function unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function init() {
    bind();

    const drawBuffers = [];

    for (let location in color) {
      const locationAsNumber = Number(location);

      if (locationAsNumber === undefined) {
        console.error("invalid location");
      }

      const tex = color[location];
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + locationAsNumber,
        tex.target,
        tex.texture,
        0,
      );
      drawBuffers.push(gl.COLOR_ATTACHMENT0 + locationAsNumber);
    }

    gl.drawBuffers(drawBuffers);

    if (depth) {
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        depth.target,
        depth.texture,
      );
    }

    unbind();
  }

  init();

  return {
    color,
    bind,
    unbind,
  };
}
