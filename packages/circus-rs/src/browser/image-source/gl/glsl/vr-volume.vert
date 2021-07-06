attribute vec3 aVertexPosition;
attribute vec4 aVertexColor; // for debugging

uniform mat4 uMVPMatrix;

varying vec4 vColor;
varying vec3 vWorldSpaceCoords;

void main() {
  gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);
  vWorldSpaceCoords = aVertexPosition;
  vColor = aVertexColor; // for debugging
}
