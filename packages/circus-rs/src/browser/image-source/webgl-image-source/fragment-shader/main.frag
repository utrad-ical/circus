void main() {
  // - check volume box
  if (uDebugFlag == 1) {
    gl_FragColor = vColor;
  }
  // - volume rendering with volume box
  else if (uDebugFlag == 2) {
    vec4 color = getColorWithRayCasting(vWorldSpaceCoords);
    gl_FragColor = mix(color, vColor, 0.2);
  }
  // - check transfer function texture
  else if (uDebugFlag == 3) {
    gl_FragColor = texture2D(
      uTransferFunctionSampler,
      vec2(vWorldSpaceCoords.x / 256.0, vWorldSpaceCoords.y / 256.0)
    );
  }
  // - volume rendering
  else {
    gl_FragColor = getColorWithRayCasting(vWorldSpaceCoords);
  }
}
