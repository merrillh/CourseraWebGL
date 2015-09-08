window.onload = init;

var canvas;
var gl;

var eye;
var at;
var up;
var mat4_camera;
var mat4_perspective;
var ref_eyePosition;
var ref_camera;
var ref_perspective;

var g_modelList = [];
var g_selectedModel;
var g_lightList = [];
var g_textureList = [];

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
    var nPhi = 140;
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
        textureCoordData.push(vec2(i/nPhi, 1));
        textureCoordData.push(vec2(i/nPhi, 0));
        Phi += dPhi;
    }

    var i;
    for (i = 2; i < (nPhi) * 2; i += 2) {
        //draw the inside of the cylinder
        //top triangle
        indexData.push(i-2);
        indexData.push(i-1);
        indexData.push(i);
        //debug("(" + (i - 2) + ", " + (i - 1) + ", " + i + ")");
        //bottom triangle
        indexData.push(i);
        indexData.push(i-1);
        indexData.push(i + 1);
        //debug("(" + i  + ", " + (i - 1) + ", " + (i+1) + ")");

        //draw the outside of the cylinder
        //top triangle
        indexData.push(i-2);
        indexData.push(i);
        indexData.push(i-1);
        //bottom triangle
        indexData.push(i);
        indexData.push(i + 1);
        indexData.push(i - 1);
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
            makeConeData(vertexPositionData, normalData, textureCoordData, indexData, { r1: 1, r2: 1 });
        }
         else if (shape === "cone") {
            makeConeData(vertexPositionData, normalData, textureCoordData, indexData, {r1: 1, r2:0});
        }
        else if (shape === "triangle") {
            makeTriangleData(vertexPositionData, normalData, textureCoordData, indexData);
        }
        else { throw "no shape was given to the drawable"; }
        sendDataToGPU();
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);//TODO something on the sphere is reversed. culling the front makes clipping through other objects work correctly
        gl.enable(gl.DEPTH_TEST);
    }

    var vSize = 3; //three floats to a vertex
    var ref_vPosition = undefined;
    var ref_vNormal = undefined;
    var ref_vTexCoord = undefined;
    var ref_vIndex = undefined;
    var VBO_vertices = undefined;
    var VBO_normals = undefined;
    var VBO_texCoord = undefined;
    var VBO_index = undefined;
    var sendDataToGPU = function () {
        ref_vPosition = gl.getAttribLocation(program, "vPosition");
        if (ref_vPosition < 0) {
            throw "couldn't get the attribute vPosition";
        }
        VBO_vertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO_vertices);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexPositionData), gl.STATIC_DRAW);

        ref_vNormal = gl.getAttribLocation(program, "vNormal");
        if (ref_vPosition < 0) {
            throw "couldn't get the attribute vNormal";
        }
        VBO_normals = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO_normals);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalData), gl.STATIC_DRAW);

        ref_vTexCoord = gl.getAttribLocation(program, "vTexCoord");
        if (ref_vPosition < 0) {
            throw "couldn't get the attribute vTexCoord";
        }
        VBO_texCoord = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO_texCoord);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoordData), gl.STATIC_DRAW);

        VBO_index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VBO_index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    };

    this.draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, VBO_vertices);
        gl.enableVertexAttribArray(ref_vPosition);
        gl.vertexAttribPointer(ref_vPosition, vSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, VBO_normals);
        gl.enableVertexAttribArray(ref_vNormal);
        gl.vertexAttribPointer(ref_vNormal, vSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, VBO_texCoord);
        gl.enableVertexAttribArray(ref_vTexCoord);
        gl.vertexAttribPointer(ref_vTexCoord, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VBO_index);
        gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_SHORT, 0);
        //gl.drawElements(gl.LINE_LOOP, indexData.length, gl.UNSIGNED_SHORT, 0);
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

var Light = function (gl, program, position, color, lightType) {
    var enumLightType = {point:0, directional: 1};
    this.position = (position === undefined ? vec3(1,1,1) : position);
    this.color = (position === undefined ? vec4(.5, .5, .5, 1) : color);
    this.lightType = (position === undefined ? enumLightType.point : lightType);
    this.La = .31; // Ambient light intensity
    this.Ld = 1; // Diffuse light intensity
    this.Ls = 1; // Specular light intensity

    var ref_rotate = gl.getUniformLocation(program, "lightRotate");
    var ref_translate = gl.getUniformLocation(program, "lightTranslate");
    var mat4_rotate = mat4();
    var mat4_translate = mat4();

    var rotateX = 0;
    var rotateY = 0;
    var rotateZ = 0;
    this.draw = function () {
        rotateY += 1;
        var xAxis = vec3(1, 0, 0);
        var yAxis = vec3(0, 1, 0);
        var zAxis = vec3(0, 0, 1);
        var mat4_rotateX = rotate(rotateX, xAxis);
        var mat4_rotateY = rotate(rotateY, yAxis);
        var mat4_rotateZ = rotate(rotateZ, zAxis);
        mat4_rotate = mult(mat4_rotateZ, mult(mat4_rotateY, mat4_rotateX));
        gl.uniformMatrix4fv(ref_rotate, false, flatten(mat4_rotate));
        gl.uniformMatrix4fv(ref_translate, false, flatten(mat4_translate));
    };


}

function setUniformLightProperty(gl, property, ref_lightProperty, value) {
    switch (property) {
        case "position":
            gl.uniform3fv(ref_lightProperty, flatten(value));
            break;
        case "color":
            gl.uniform4fv(ref_lightProperty, flatten(value));
            break;
        case "lightType":
            gl.uniform1i(ref_lightProperty, value);
            break;
        case "La":
            gl.uniform1f(ref_lightProperty, value);
            break;
        case "Ld":
            gl.uniform1f(ref_lightProperty, value);
            break;
        case "Ls":
            gl.uniform1f(ref_lightProperty, value);
            break;
    }
}

function sendLightToShader(gl, program, lightList) {
    var ref_lightSourceArray = gl.getUniformLocation(program, "lightList");
    if (ref_lightSourceArray < 0) {
        throw "couldn't get the attribute lightList";
    }
    ref_numLights = gl.getUniformLocation(program, "numLights");
    gl.uniform1i(ref_numLights, lightList.length);
    for (var i = 0; i < lightList.length; i++) {
        for (property in lightList[i]) {
            var fullPropertyName = "lightList[" + i + "]";
            fullPropertyName += "." + property;
            //debug(fullPropertyName);
            var ref_property = gl.getUniformLocation(program, fullPropertyName);
            var value = lightList[i][property];
            setUniformLightProperty(gl, property, ref_property, value);
        }
    }

    //lightSourceArrayBufferId = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, lightSourceArrayBufferId);

    //gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);

}

function makeCheckerboard() {
    var numChecks = 32;
    var texSize = 512;
    var image1 = new Uint8Array(4 * texSize * texSize);
    for (var i = 0; i < texSize; i++) {
        for (var j = 0; j < texSize; j++) {
            var patchx = Math.floor(i / (texSize / numChecks));
            var patchy = Math.floor(j / (texSize / numChecks));
            if (patchx % 2 ^ patchy % 2) c = 255;
            else c = 0;
            //c = Math.floor(128 * Math.sin(i/20) + 128);
            image1[4 * i * texSize + 4 * j] = c;
            image1[4 * i * texSize + 4 * j + 1] = c;
            image1[4 * i * texSize + 4 * j + 2] = c;
            image1[4 * i * texSize + 4 * j + 3] = 255;
        }
    }
    image1.height = texSize;
    image1.width = texSize;
    image1.isGenerated = true;

    return image1;
}

function initTextureFromFile(gl, program, imageTexture, renderFunc) {
    var image = new Image();
    image.src = "moon.png";
    image.onload = function () {
        imageTexture = new Texture(gl, program, image);
        imageTexture.init();
        g_textureList.push(imageTexture);
        renderFunc();
    }
}

function Texture(gl, program, ref_Image) {
    var texture;
    var glTextureType = gl.TEXTURE_2D;

    this.init = function () {
        //Define an image as a texture
        var mipmapLevels = 0;
        var texWidth = ref_Image.width;
        var texHeight = ref_Image.height;
        var border = 0;
        var texelDesc = gl.RGBA;
        var imageDataType = gl.UNSIGNED_BYTE;
        texture = gl.createTexture();
        gl.bindTexture( glTextureType, texture);
        if (ref_Image.isGenerated){
            gl.texImage2D(glTextureType, mipmapLevels, texelDesc, texWidth, texHeight, border,
            texelDesc, imageDataType, ref_Image);
        }
        else{
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ref_Image);
        }
        gl.generateMipmap(glTextureType);
        gl.texParameteri(glTextureType, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(glTextureType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(gl.getUniformLocation(program, "textureSampler"), 0);
    }


    this.draw = function(){
        gl.bindTexture( glTextureType, texture);
    }
}

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

function createScene(gl, program) {
 
    model = new Model(gl, program, "cone");
    g_modelList.push(model);
    g_selectedModel = model;
    document.querySelector("#scaleValue").value = 100;
    document.querySelector("#rotateValueX").value = 10;
    document.querySelector("#rotateValueY").value = -35;
    document.querySelector("#rotateValueZ").value = 130;
    document.querySelector('#translateValueZ').value = -1.6;
    document.querySelector("#translateValueY").value = 0.30;
    document.querySelector('#translateValueX').value = -1.0;
    g_selectedModel.update();
   
    model = new Model(gl, program, "cylinder");
    g_modelList.push(model);
    g_selectedModel = model;
    document.querySelector("#scaleValue").value = 100;
    document.querySelector("#rotateValueX").value = -110;
    document.querySelector("#rotateValueY").value = -35;
    document.querySelector("#rotateValueZ").value = 360;
    document.querySelector('#translateValueX').value = 1.0;
    document.querySelector('#translateValueY').value = 0.9;
    document.querySelector('#translateValueZ').value = -1.0;
    g_selectedModel.update();
    
    var model = new Model(gl, program, "sphere");
    g_modelList.push(model);
    g_selectedModel = model;
    document.querySelector("#scaleValue").value = 100;
    document.querySelector('#translateValueZ').value = +.2;
    document.querySelector("#translateValueY").value = -1;
    document.querySelector('#translateValueX').value = +.40;
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

    //get the shaders from the HTML page and compile them
    var program = initShaders(gl, "vertexShader", "fragmentShader");
    gl.useProgram(program);

    //Add two lights by default
    g_lightList.push(new Light(gl, program, vec3(0, 0, -10), vec4(.2, .8, .2, 1), "point"));
    g_lightList.push(new Light(gl, program, vec3(1, 1, 10), vec4(.8, .1, .8, 1), "point"));
    //g_lightList.push(new Light(gl, program, vec3(0, 0, 10), vec4(1, 1, 1, 1), "point"));
    sendLightToShader(gl, program, g_lightList);

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

    ref_eyePosition = gl.getUniformLocation(program, "eyePosition");
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

    createScene(gl, program);

     var checkerBoardImage = makeCheckerboard();
     var generatedTexture = new Texture(gl, program, checkerBoardImage);
     generatedTexture.init();
     g_textureList.push(generatedTexture);

     var imageTexture;
     initTextureFromFile(gl, program, imageTexture, render);  //TODO find a better way to handle asynchronous image loading
}

function subtractVec3(v1, v2){
    var result = vec3(
        v1[0] - v2[0],
        v1[1] - v2[1],
        v1[1] - v2[2]
        );
    return result;
}

function render() {
    gl.uniform3fv(ref_eyePosition, flatten(eye));
    gl.uniformMatrix4fv(ref_camera, false, flatten(mat4_camera));
    gl.uniformMatrix4fv(ref_perspective, false, flatten(mat4_perspective));
    //debug("lookAt matrix: <br>" + lookAt(eye, at, up).toString());

    var radioValues = document.getElementsByName("textureType");
    for (var i = 0; i < radioValues.length; i++){
        if (radioValues[i].checked){
            var index = parseInt(radioValues[i].value);
            g_textureList[index].draw();
        }
    }



    gl.clearColor(1, 1, .7, 1);
    gl.clearDepth(1);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    for (var i = 0; i < g_modelList.length; i++) {
        g_modelList[i].draw();
    }

    for (var i = 0; i < g_lightList.length; i++) {
        g_lightList[i].draw();
    }

    //for (model in g_modelList) {
    //    model.draw(); //Uncaught TypeError: model.draw is not a function
    //}
    ////triangleDrawable.draw();
    //sphereDrawable.draw();
    //coneDrawable.draw();
    requestAnimationFrame(render);
}

