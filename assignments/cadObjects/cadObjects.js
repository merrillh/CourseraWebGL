window.onload = init;

var canvas;
var gl;

var eye;
var at;
var up;
var mat4_camera;
var mat4_perspective;
var ref_camera;
var ref_perspective;

var g_modelList = [];
var g_selectedModel;
//TODO these are global variables for testing purposes. change them back to local
var vPosition;

var keyPressedState = 0;
var keyCount = 0;
var arrowUp = 38;
var arrowDown = 40;
var arrowLeft = 37;
var arrowRight = 39;
var assignedKeys = {};
assignedKeys[arrowUp] = keyCount++;
assignedKeys[arrowDown] = keyCount++;
assignedKeys[arrowLeft] = keyCount++;
assignedKeys[arrowRight] = keyCount++;

function debug(message) {
    var debugTag = document.querySelector("#debug");
    debugTag.innerHTML += "<p>" + message + "</p>";
}

function debugDisplayTemporary(message) {
    var debugTag = document.querySelector("#debugDisplayTemporary");
    debugTag.innerHTML = "<p>" + message + "</p>";
}

function makeTriangleData(vertexPositionData, normalData, textureCoordData, indexData) {
    //////////////////////////////////////////old code to draw a triangle 
    ////load the data into the gpu
    //var vertices = [vec3(-1, -1, 0), vec3(0, 1, 0), vec3(1, -1, 0)];
    //var bufferId = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW);
    //vPosition = gl.getAttribLocation(program, "vPosition");
    ////gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    //gl.enableVertexAttribArray(vPosition);

    //gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    //gl.drawArrays(gl.TRIANGLES, 0, 3);

    vertexPositionData.push(vec3(-1, -1, 0));
    vertexPositionData.push(vec3(0, 1, 0));
    vertexPositionData.push(vec3(1, -1, 0));

    //http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-9-vbo-indexing/
    indexData.push(0);
    indexData.push(1);
    indexData.push(2);
}

//http://learningwebgl.com/cookbook/index.php/How_to_draw_a_sphere
function makeSphereData(vertexPositionData, normalData, textureCoordData, indexData) {
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 2;

    //create position, normal, and texture coordinates
    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitudeBands);
            var v = latNumber / latitudeBands;

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    //create the index data
    for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }
}

//http://www.ibiblio.org/e-notes/webgl/gpu/make_cone.htm
function makeConeData(vertexPositionData, normalData, textureCoordData, indexData, coneParamObj) {
    var nPhi = 100;
    var r1 = 1;
    var r2 = 1;
    var h = 2;

    for (value in coneParamObj){
        switch (value) {
            case 'r1':
                r1 = coneParamObj.r1;
                break;
            case 'r2':
                r2 = coneParamObj.r2;
                break;
            default:
                break;
        }
    }
    var Phi = 0, dPhi = 2 * Math.PI / (nPhi - 1),
      Nx = r1 - r2, Ny = h, N = Math.sqrt(Nx * Nx + Ny * Ny);
    Nx /= N; Ny /= N;
    for (var i = 0; i < nPhi; i++) {
        var cosPhi = Math.cos(Phi);
        var sinPhi = Math.sin(Phi);
        var cosPhi2 = Math.cos(Phi + dPhi / 2);
        var sinPhi2 = Math.sin(Phi + dPhi / 2);
        vertexPositionData.push(-h / 2, cosPhi * r1, sinPhi * r1);   // points
        normalData.push(Nx, Ny * cosPhi, Ny * sinPhi);         // normals
        vertexPositionData.push(h / 2, cosPhi2 * r2, sinPhi2 * r2);  // points
        normalData.push(Nx, Ny * cosPhi2, Ny * sinPhi2);       // normals
        Phi += dPhi;
    }
    for (var i = 2; i < nPhi * 2; i++) {
        indexData.push(i);
        indexData.push(i);
        indexData.push(i-2);

    }
}
var Drawable = function (gl, program, shape) {
    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    var indexData = [];
    var gl;

    var init = function (gl, program) {
        if (program === undefined) { throw "program is undefined"; }
        if (gl === undefined) { throw "gl context is undefined"; }
        var program = program;
        var gl = gl;

        if (shape === "sphere") {
            makeSphereData(vertexPositionData, normalData, textureCoordData, indexData);
        }
        else if (shape === "cylinder") {
            makeConeData(vertexPositionData, normalData, textureCoordData, indexData, {r1: 1, r2:1});
        }
         else if (shape === "cone") {
            makeConeData(vertexPositionData, normalData, textureCoordData, indexData, {r1: 1, r2:0});
        }
        else if (shape === "triangle") {
            makeTriangleData(vertexPositionData, normalData, textureCoordData, indexData);
        }
        else { throw "no shape was given to the drawable"; }
        sendDataToGPU();
        //gl.disable(gl.CULL_FACE);
    }

    //TODO make a single buffer to hold all the data?
    var vSize = 3; //three floats to a vertex
    var ref_vPosition = undefined;
    var ref_vNormal = undefined;
    var ref_vTexCoord = undefined;
    var ref_vIndex = undefined;
    var bufferId = undefined;
    var indexBufferId = undefined;
    var sendDataToGPU = function () {
        bufferId = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexPositionData), gl.STATIC_DRAW);
        ref_vPosition = gl.getAttribLocation(program, "vPosition");
        if (ref_vPosition < 0) {
            throw "couldn't get the attribute sphereVPosition";
        }
        gl.enableVertexAttribArray(ref_vPosition);

        indexBufferId = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        //TODO rewrite the flatten function in MV.js to handle int data?
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    };

    this.draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.vertexAttribPointer(ref_vPosition, vSize, gl.FLOAT, false, 0, 0);
        // Code to draw the vertex data directly
        //gl.drawArrays(gl.TRIANGLES, 0, vertexPositionData.length / vSize);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        //gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_SHORT, 0);
        gl.drawElements(gl.LINE_LOOP, indexData.length, gl.UNSIGNED_SHORT, 0);
    };

    init(gl, program);
};

var Model = function (gl, program, shape) {
    var ref_scale = gl.getUniformLocation(program, "modelScale");
    var ref_rotate = gl.getUniformLocation(program, "modelRotate");
    var ref_translate = gl.getUniformLocation(program, "modelTranslate");
    var mat4_scale = mat4();
    var mat4_rotate = mat4();
    var mat4_translate = mat4();

    var model = new Drawable(gl, program, shape);

    this.draw = function () {
        //per instance modelView matrices
        gl.uniformMatrix4fv(ref_scale, false, flatten(mat4_scale));
        gl.uniformMatrix4fv(ref_rotate, false, flatten(mat4_rotate));
        gl.uniformMatrix4fv(ref_translate, false, flatten(mat4_translate));
        //singleton model data
        model.draw();
    };

    this.update = function (updateValueObj) {
        var scale = document.querySelector("#scaleValue").value / 100;
        var scaleX = document.querySelector("#scaleValueX").value / 100;
        var scaleY = document.querySelector("#scaleValueY").value / 100; 
        var scaleZ = document.querySelector("#scaleValueZ").value / 100;
        mat4_scale = scalem(scale*scaleX, scale*scaleY, scale*scaleZ);

        var rotateX = document.querySelector("#rotateValueX").value;
        var rotateY = document.querySelector("#rotateValueY").value; 
        var rotateZ = document.querySelector("#rotateValueZ").value;
        var xAxis = vec3(1, 0, 0);
        var yAxis = vec3(0, 1, 0);
        var zAxis = vec3(0, 0, 1);
        var mat4_rotateX = rotate(rotateX, xAxis);
        var mat4_rotateY = rotate(rotateY, yAxis);
        var mat4_rotateZ = rotate(rotateZ, zAxis);
        mat4_rotate = mult(mat4_rotateZ, mult(mat4_rotateY, mat4_rotateX));

        var translateX = document.querySelector("#translateValueX").value;
        var translateY = document.querySelector("#translateValueY").value; 
        var translateZ = document.querySelector("#translateValueZ").value;
        mat4_translate = translate(translateX, translateY, translateZ);
    }
};

function showAllKeysPressed() {
    var state = keyPressedState;
    var keyNames = {};
    keyNames[arrowUp] = "up arrow <br>";
    keyNames[arrowDown] = "down arrow <br>";
    keyNames[arrowRight] = "right arrow <br>";
    keyNames[arrowLeft] = "left arrow <br>";
    var message = "";
    for (keyCode in assignedKeys) {
        if (isKeyPressed(keyCode)) {
            message += keyNames[keyCode];
        }
    }
    debugDisplayTemporary(message);
}

function isKeyPressed(keyCode) {
    var maskPos = assignedKeys[keyCode];
    return Boolean(keyPressedState & (1 << maskPos))
}

function setKey(keyCode) {
    var maskPos = assignedKeys[keyCode];
    if (typeof maskPos == "undefined") { return; }
    keyPressedState |= (1 << maskPos);
    //debug(keyPressedState);
    //("maskPos " + maskPos + " keyPressedState " + keyPressedState);
}

function unsetKey(keyCode) {
    var maskPos = assignedKeys[keyCode];
    keyPressedState &= ~(1 << maskPos);
}

function handleKeyDown(e) {
    setKey(e.keyCode);

    showAllKeysPressed();
}

function handleKeyUp(e) {
    unsetKey(e.keyCode);
}

function updateScale(scale) {
    document.querySelector('#scaleValue').value = scale;
    g_selectedModel.update();
}
function updateScaleX(scale) {
    document.querySelector('#scaleValueX').value = scale;
    g_selectedModel.update();
}
function updateScaleY(scale) {
    document.querySelector('#scaleValueY').value = scale;
    g_selectedModel.update();
}
function updateScaleZ(scale) {
    document.querySelector('#scaleValueZ').value = scale;
    g_selectedModel.update();
}

function updateRotateX(angle) {
    document.querySelector('#rotateValueX').value = angle;
    g_selectedModel.update();
}
function updateRotateY(angle) {
    document.querySelector('#rotateValueY').value = angle;
    g_selectedModel.update();
}
function updateRotateZ(angle) {
    document.querySelector('#rotateValueZ').value = angle;
    g_selectedModel.update();
}

function updateTranslateX(distance) {
    document.querySelector('#translateValueX').value = distance;
    g_selectedModel.update();
}
function updateTranslateY(distance) {
    document.querySelector('#translateValueY').value = distance;
    g_selectedModel.update();
}
function updateTranslateZ(distance) {
    document.querySelector('#translateValueZ').value = distance;
    g_selectedModel.update();
}


function init() {
    canvas = document.querySelector("#glCanvas");
    canvas.focus();
    canvas.addEventListener('keydown', handleKeyDown, false);
    canvas.addEventListener('keyup', handleKeyUp, false);

    //set up the openGL context
    gl = WebGLUtils.setupWebGL(canvas);

    //set up the canvas for drawing
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, .7, 1);

    //get the shaders from the HTML page and compile them
    var program = initShaders(gl, "vertexShader", "fragmentShader");
    gl.useProgram(program);

    //create the models
    sphereDrawable = new Drawable(gl, program, "sphere");
    triangleDrawable = new Drawable(gl, program, "triangle");
    coneDrawable = new Drawable(gl, program, "cone");

    //set up the camera
    eye = vec3(0, 0, 3);
    at = vec3(0, 0, 0);
    up = vec3(0, 1, 0);
    mat4_camera = lookAt(eye, at, up);
    //default near and far planes are set at -1 and 1
    mat4_perspective = perspective(45, canvas.height / canvas.width, .1, 100);

    ref_camera = gl.getUniformLocation(program, "camera");
    ref_perspective = gl.getUniformLocation(program, "perspective");

    //set up the UI event handlers
    document.getElementById('button_addCylinder').addEventListener('click', function (evt) {
        var model = new Model(gl, program, "cylinder");
        g_modelList.push(model);
        g_selectedModel = model;
    }, false);
     document.getElementById('button_addCone').addEventListener('click', function (evt) {
        var model = new Model(gl, program, "cone");
        g_modelList.push(model);
        g_selectedModel = model;
    }, false);
     document.getElementById('button_addSphere').addEventListener('click', function (evt) {
        var model = new Model(gl, program, "sphere");
        g_modelList.push(model);
        g_selectedModel = model;
    }, false);
    render();
}

function render() {
    gl.uniformMatrix4fv(ref_camera, false, flatten(mat4_camera));
    gl.uniformMatrix4fv(ref_perspective, false, flatten(mat4_perspective));
    //debug("lookAt matrix: <br>" + lookAt(eye, at, up).toString());

    gl.clear(gl.COLOR_BUFFER_BIT);

    for (var i = 0; i < g_modelList.length; i++) {
        g_modelList[i].draw();
    }

    //for (model in g_modelList) {
    //    model.draw(); //Uncaught TypeError: model.draw is not a function
    //}
    ////triangleDrawable.draw();
    //sphereDrawable.draw();
    //coneDrawable.draw();
    requestAnimationFrame(render);
}

