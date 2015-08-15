"use strict";

var canvas;
var gl;

var points = [];

var NumTimesToSubdivide = 5;

var theta = 0;

var vertices = [
    vec2(-1, -1),
    vec2(0, 1),
    vec2(1, -1)
];

function printError(message) {
    var errorDivTag = document.querySelector('#errorMessage');
    errorDivTag.innerHTML = "<p>" + message + "<br/></p>";
}

function updatePointsAndRender(){
    points = [];
    divideTriangle(vertices[0], vertices[1], vertices[2],
                    NumTimesToSubdivide);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.DYNAMIC_DRAW);
    render();
}

function outputSubdivisionUpdate(subdivisions) {
    document.querySelector('#numberOfSubdivisions').value = subdivisions;
    NumTimesToSubdivide = subdivisions;

    updatePointsAndRender();
}

function outputThetaUpdate(angle) {
    document.querySelector('#angle').value = angle;
    theta = angle / 180 * Math.PI; // convert to radians
    printError(theta);

    updatePointsAndRender();
}

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.

    divideTriangle( vertices[0], vertices[1], vertices[2],
                    NumTimesToSubdivide);

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.DYNAMIC_DRAW );

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};

function rotateAllPoints(points) {
    points.forEach(function (point) { rotateByTheta(point); });

}

function rotateByTheta(point) {
    var x;
    var y;
    var xNew;
    var yNew;
    var d;
    var newPoint = vec2(0, 0);

    //sin(a+b) = sin(a)cos(b) + sin(b)cos(a)
    //cos(a+b) = cos(a)cos(b) - sin(a)sin(b)

    x = point[0];
    y = point[1];
    d = Math.sqrt(x * x + y * y);
    xNew = x * Math.cos(d*theta) - y * Math.sin(d*theta);
    yNew = x * Math.sin(d*theta) + y * Math.cos(d*theta);
    newPoint[0] = xNew;
    newPoint[1] = yNew;

    return newPoint;
}
function triangle( a, b, c )
{

    points.push( a, b, c );
}

function divideTriangle( a, b, c, count )
{

    // check for end of recursion

    if ( count === 0 ) {
        triangle( rotateByTheta(a), rotateByTheta(b), rotateByTheta(c) );
    }
    else {

        //bisect the sides

        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var bc = mix( b, c, 0.5 );

        --count;

        // three new triangles

        divideTriangle( a, ab, ac, count );
        divideTriangle( c, ac, bc, count );
        divideTriangle(b, bc, ab, count);

        // middle triangle -- remove to create gasket
        divideTriangle(ab, ac, bc, count);
    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
}
