attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uMVPMatrix;
// uniform mat4 uModelViewMatrix;
// uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;
varying vec3 vWorldSpaceCoords;

void main() {
  gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);
  // gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
  vWorldSpaceCoords = aVertexPosition;
  vColor = aVertexColor; // for debugging
}
