attribute vec3 aVertexPosition;
attribute vec4 aVertexColor; // for debugging

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 vColor;
varying vec3 vWorldSpaceCoords;

void main() {
  vWorldSpaceCoords = aVertexPosition;
  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
  vColor = aVertexColor; // for debugging
}
