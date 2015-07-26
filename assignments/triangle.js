"use strict";

var gl;
var points;
var vertices = [];


window.onload = function init()
{

    var canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if (!gl) { alert("WebGL isn't available"); }
    canvas.addEventListener("mousemove", function (event) {
        var x = (event.clientX -.5*canvas.width)/ canvas.width;
        var y = (-event.clientY + .5 * canvas.height) / canvas.height;
        vertices.push(x);
        vertices.push(y);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        var message = "x = " + x + " y = " + y;
        //alert(vertices);
        render()
    });



    

    //  Configure WebGL

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 0.7, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    //gl.drawArrays( gl.TRIANGLES, 0, 3 );
    
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length /2 );
}
