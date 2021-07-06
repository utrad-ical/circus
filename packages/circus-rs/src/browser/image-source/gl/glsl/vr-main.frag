void main() {
  if(uDebugFlag == 0) {
    // - volume rendering
    gl_FragColor = getColorWithRayCasting(vWorldSpaceCoords);
  } else if(uDebugFlag == 1) {
    // - check volume box
    gl_FragColor = vColor;
  } else if(uDebugFlag == 2) {
    // - volume rendering with volume box
    vec4 color = getColorWithRayCasting(vWorldSpaceCoords);
    gl_FragColor = mix(color, vColor, 0.2);
  } else if(uDebugFlag == 3) {
    // - check transfer function texture
    gl_FragColor = texture2D(uTransferFunctionSampler, vec2(vWorldSpaceCoords.x / 256.0, vWorldSpaceCoords.y / 256.0));
  }
}
