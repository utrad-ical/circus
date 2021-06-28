void main() {
  if(uDebugFlag == 0) {
    // - MPR rendering
    float pixelValue = getPixelValue(vWorldSpaceCoords);
    float windowWidth = 658.0;
    float windowLevel = 329.0;
    gl_FragColor = getColorWithWindow(pixelValue, windowWidth, windowLevel);
    
    // gl_FragColor = getColorWithTransferFunction(pixelValue, uTransferFunctionSampler);

    // gl_FragColor = getColorForDebugging(pixelValue);

  }
  // - check volume box
  else if(uDebugFlag == 1) {
    gl_FragColor = vColor;
  }
  // - volume rendering with volume box
  else if(uDebugFlag == 2) {
    // gl_FragColor = getColorWithRayCasting(vWorldSpaceCoords);

    vec4 color = getColorWithRayCasting(vWorldSpaceCoords);
    gl_FragColor = mix(color, vColor, 0.2);
  }
  // - check transfer function texture
  else if(uDebugFlag == 3) {
    gl_FragColor = texture2D(uTransferFunctionSampler, vec2(vWorldSpaceCoords.x / 256.0, vWorldSpaceCoords.y / 256.0));
  } else {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
