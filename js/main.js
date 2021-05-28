import * as THREE from "/build/three.module.js";
import Stats from "/js/jsm/libs/stats.module.js";
import {OrbitControls} from "/js/jsm/controls/OrbitControls.js";
import {PLYLoader} from "/js/jsm/loaders/PLYLoader.js";
import {OBJLoader} from "/js/jsm/loaders/OBJLoader.js";
import {MTLLoader} from "/js/jsm/loaders/MTLLoader.js";
import * as dat from "/js/jsm/libs/dat.gui.module.js";
import { PointerLockControls } from '/js/jsm/controls/PointerLockControls.js';
import { RectAreaLightHelper }  from '../js/jsm/helpers/RectAreaLightHelper.js';

"using strict";


let renderer, scene, camera, camera2, camera3, camera4, skybox, stats, mesh, start, sprint, blockBox;
let texture1, texture2, texture3, texture4, texture5, texture6;
let geometry, model; 

let spotLightHelper, cameraHelper;

var multiview = false;

var deceleration = 1.15;
var forback = 0; // 1 = forward, -1 = backward
var rightleft = 0; // 1 = right, -1 = left
var sprintSpeedInc = 1.3; // 30% faster than walking

var movingSpeed = 0.7;
var ySpeed = 0;
var acc = 0.065;

camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

class Mesh extends THREE.Mesh {
    constructor() {
        super();
    }
    setWireframe(value) {
        this.material.wireframe = value;
    }
    callback = function () {
        mesh = this;
        model.name = this.name;
        model.wireframe = this.material.wireframe;
        model.posX = this.position.x;
        model.posY = this.position.y;
        model.posZ = this.position.z;
        model.rotX = (this.rotation.x * 180) / Math.PI;
        model.rotY = (this.rotation.y * 180) / Math.PI;
        model.rotZ = (this.rotation.z * 180) / Math.PI;
        model.colorPalette = [
        mesh.material.color.r * 255,
        mesh.material.color.g * 255,
        mesh.material.color.b * 255,
        ];
    };
}

class Window extends Mesh {
    constructor(){
        super();
        //CUBE
        let vertices = [-2.5,-2.5,-1,    
                        2.5,-2.5,-1,    
                        2.5, 2.5,-1,    
                        -2.5, 2.5,-1,
                        -2.5,-2.5, 1,    
                        2.5,-2.5, 1,    
                        2.5, 2.5, 1,    
                        -2.5, 2.5, 1];
        let indices = [2,1,0,    0,3,2,
                        0,4,7,    7,3,0,
                        0,1,5,    5,4,0,
                        1,2,6,    6,5,1,
                        2,3,7,    7,6,2,
                        4,5,6,    6,7,4];
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.geometry.setIndex(indices);
        this.material = new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        });
    }
}

var player = {
    w : 0.6, // width
    h : 8, // height
    d : 0.5, // depth
    x : camera.position.x,
    y : camera.position.y,
    z : camera.position.z,
    forward : function(speed){
        controls.moveForward(speed);
        this.updatePosition();
    },
    backward : function(speed){
        controls.moveForward(-1 * speed);
        this.updatePosition();
    },
    right : function(speed){
        controls.moveRight(speed);
        this.updatePosition();
    },
    left : function(speed){
        controls.moveRight(-1 * speed);
        this.updatePosition();
    },
    updatePosition : function(){
        this.x = camera.position.x;
        this.y = camera.position.y - (this.h / 2);
        this.z = camera.position.z;
    }
};

var keys = [];
var canJump = true;
var controlOptions = {
    forward : "w",
    backward : "s",
    right : "d",
    left : "a",
    jump : " ", // " " = space
    placeBlock : "q" 
};

function Block(x, y, z, material, placed){
    this.x = x;
    this.y = y;
    this.z = z;
    this.material = material;
    this.placed = placed;
    
}

var chunks = [];
var amplitude = 30 + (Math.random() * 70);
var renderDistance = 5;
var chunkSize = 10;
var placedBlocks = [];
var instancedChunk = [];
var chunkMap = [];

function init(){

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setScissorTest(true);
    document.body.appendChild(renderer.domElement);

    let fov = 75;
    let aspect = window.innerWidth / window.innerHeight;
    let near = 0.1;
    let far = 1000;
    
    camera.position.x = renderDistance * chunkSize / 2 * 5;
    camera.position.z = renderDistance * chunkSize / 2 * 5;
    camera.position.y = 50;

    let cwidth = renderDistance * chunkSize / 2 * 5;
    let cheight = renderDistance * chunkSize / 2 * 5;

     // CAMERA 2 (Top View)
     camera2 = new THREE.OrthographicCamera( -cwidth, cwidth, cheight, -cheight, near, far );
     camera2.position.set(cwidth, 10, cwidth);
     camera2.lookAt(cwidth, 0, cwidth);
     camera2.up.set(0, 0, 1);

     // CAMERA 3 (Front View)
     camera3 = new THREE.OrthographicCamera( -cwidth, cwidth, 120, 0, near, far );
     camera3.position.set(cwidth, 0, 0);
     camera3.lookAt(cwidth, 0, cwidth);
     camera3.up.set(0, 0, 1);

     // CAMERA 4 (Side View)
     camera4 = new THREE.OrthographicCamera( -cwidth, cwidth, 120, 0, near, far );
     camera4.position.set(0, 0, cwidth);
     camera4.lookAt(cwidth, 0, cwidth);
     camera4.up.set(0, 0, 1);

     //LIGHTS

    //AmbientLight
    let ambientLight = new THREE.AmbientLight();

    //HemisphereLight
    let skyColor = 0xB1E1FF;  // light blue
    let groundColor = 0xB97A20;  // brownish orange
    let intensity = 1;
    let hemispherelight = new THREE.HemisphereLight(skyColor, groundColor, intensity);

    //DirectionalLight
    let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
    directionalLight.position.set(renderDistance * chunkSize / 2 * 5,10,renderDistance * chunkSize / 2 * 5);
    directionalLight.target.position.set(renderDistance * chunkSize / 2 * 5,5,renderDistance * chunkSize / 2 * 5);
    let directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight);
    directionalLight.castShadow = true;
    
    //PointLight
    let pointLightColor = "white";
    intensity = 1;
    let distance = 0;
    let decay = 1; 
    let pointLight = new THREE.PointLight(pointLightColor, intensity, distance, decay);
    pointLight.position.set(renderDistance * chunkSize / 2 * 5, 10, renderDistance * chunkSize / 2 * 5);
    let pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
    pointLight.castShadow = true;
    
    //RectAreaLight
    let color = 0xFFFFFF;
    intensity = 5;
    let width = 12;
    let height = 4;
    let rectLight = new THREE.RectAreaLight(color, intensity, width, height);
    rectLight.position.set(0, 20, 0);
    rectLight.rotation.x = THREE.MathUtils.degToRad(-90);
    let rectAreaLightHelper = new RectAreaLightHelper(rectLight);

    //SpotLight
    color = 0xFFFFFF;
    intensity = 1;
    let spotLight = new THREE.SpotLight(color, intensity);
    spotLight.position.set(renderDistance * chunkSize / 2 * 5,10,renderDistance * chunkSize / 2 * 5);
    spotLight.target.position.set(renderDistance * chunkSize / 2 * 5,5,renderDistance * chunkSize / 2 * 5);
    let spotLightHelper = new THREE.SpotLightHelper(spotLight);
    spotLight.castShadow = true;

    var loader = new THREE.TextureLoader();
    let materialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/grid.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grid.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grid.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grid.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grid.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grid.jpg")}),
    ];

    let grassMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/grass.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grass.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grass.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grass.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grass.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/grass.jpg")}),
    ];

    let dirtMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/dirt.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/dirt.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/dirt.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/dirt.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/dirt.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/dirt.jpg")}),
    ];

    let woodMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/wood.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/wood.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/wood.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/wood.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/wood.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/wood.jpg")}),
    ];

    let tileMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/tile.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/tile.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/tile.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/tile.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/tile.jpg")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/tile.jpg")}),
    ];

    let brickMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/brick.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/brick.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/brick.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/brick.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/brick.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/brick.png")}),
    ];

    let stoneMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/stone.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/stone.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/stone.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/stone.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/stone.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/stone.png")}),
    ];

    let metalMaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png")}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png")}),
    ];

    let metal2MaterialArray = [
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png"), metalness: 1.0, roughness: 0.5}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png"), metalness: 1.0, roughness: 0.5}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png"), metalness: 1.0, roughness: 0.5}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png"), metalness: 1.0, roughness: 0.5}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png"), metalness: 1.0, roughness: 0.5}),
        new THREE.MeshStandardMaterial({map : loader.load("texture/metal.png"), metalness: 1.0, roughness: 0.5}),
    ];

    let glassMaterialArray = [
        new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        }),
        new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        }),
        new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        }),
        new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        }),
        new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        }),
        new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        }),
    ];

    //material gui 
    let gui = new dat.GUI();

    let listSkys = ["None", "Blue Clouds", "Blue", "Yellow", "Gray", "Brown", "Interestelar", "Red Dark", "Blue Dark", "Blue Light", "Nebulas", "Space", "Tron"];

    model = {
        selectedMaterial: grassMaterialArray,
        selectedMaterialName: 'grass',
        materialList: ["grass", "dirt", "wood", "stone", "metal", "metal (shader)", "glass", "brick", "tile", "grid", "door", "window"],
        listSkys,
        defaultSky: listSkys[0],
        colorPalette: [0, 0, 0],
        ambientColor: [0, 0, 0],
        directionalColor: [0, 0, 0],
        pointColor: [0, 0, 0],
        rectColor: [0, 0, 0],
        spotColor: [0, 0, 0],
    }

    //General Menu
    let generalMenu = gui.addFolder("General Menu Anem");
    generalMenu.open();

    //Lights Menu
    let skyMenu = gui.addFolder("Sky Box Appereance");

    //Sky Box Appereance Menu
    let lightsMenu = gui.addFolder("Lights");
    lightsMenu.open();
    let ambientLightMenu = lightsMenu.addFolder("Ambient Light");
    let hemisLightMenu = lightsMenu.addFolder("Hemisphere Light");
    let direcLightMenu = lightsMenu.addFolder("Directional Light");
    let pointLightMenu = lightsMenu.addFolder("Point Light");
    let rectLightMenu = lightsMenu.addFolder("Rect Area Light");
    let spotLightMenu = lightsMenu.addFolder("Spot Light");

    let listMaterial = gui.add(model, 'selectedMaterialName', model.materialList).name("Material List").listen().onChange((item) => {
        switch(item){
            case 'grass':
                model.selectedMaterial = grassMaterialArray; 
                break;
            case 'dirt':
                model.selectedMaterial = dirtMaterialArray; 
                break;
            case 'wood':
                model.selectedMaterial = woodMaterialArray; 
                break;
            case 'stone':
                model.selectedMaterial = stoneMaterialArray; 
                break;
            case 'metal':
                model.selectedMaterial = metalMaterialArray; 
                break;
            case 'metal (shader)':
                model.selectedMaterial = metal2MaterialArray; 
                break;
            case 'glass':
                model.selectedMaterial = glassMaterialArray; 
                break;
            case 'grid':
                model.selectedMaterial = gridMaterialArray; 
                break;
            case 'brick':
                model.selectedMaterial = brickMaterialArray; 
                break;
            case 'tile':
                model.selectedMaterial = tileMaterialArray; 
                break;
            default:
                model.selectedMaterial = materialArray; 
        }
    });

    scene.add(ambientLight);
    scene.add(hemispherelight);
    scene.add(directionalLight);
    scene.add(directionalLight.target);
    scene.add(directionalLightHelper);
    scene.add(pointLight);
    scene.add(pointLightHelper);
    scene.add(rectLight);
    scene.add(rectAreaLightHelper);
    scene.add(spotLight);
    scene.add(spotLight.target);
    scene.add(spotLightHelper);

     //LIGHTS

    //Ambient Light
    ambientLightMenu.add(ambientLight, "visible").name("Ambient Light").setValue(true).listen().onChange(function(value) { });
    ambientLightMenu.add(ambientLight, "intensity").min(0).max(2).step(0.1).name("Intensidad").listen().onChange(function(value){ });
    ambientLightMenu.addColor(model, "ambientColor").name("Ambient Color").listen().onChange(function(color){
        ambientLight.color = new THREE.Color(color[0]/256, color[1]/256, color[2]/256);
    });
    
    //Hemisphere Light
    class ColorHelper {
        constructor(object, prop) {
          this.object = object;
          this.prop = prop;
        }
        get value() {
          return `#${this.object[this.prop].getHexString()}`;
        }
        set value(hexString) {
          this.object[this.prop].set(hexString);
        }
    }
    hemisLightMenu.add(hemispherelight, "visible").name("Hemisphere Light").setValue(false).listen().onChange(function(value) { });
    hemisLightMenu.addColor(new ColorHelper(hemispherelight, 'color'), 'value').name('skyColor');
    hemisLightMenu.addColor(new ColorHelper(hemispherelight, 'groundColor'), 'value').name('groundColor');
    hemisLightMenu.add(hemispherelight, 'intensity', 0, 2, 0.01);

    //Directional Light
    function makeXYZGUI(gui, vector3, name, onChangeFn) {
        let folder = gui.addFolder(name);
        folder.add(vector3, 'x', 0, 250).step(5.0).onChange(onChangeFn);
        folder.add(vector3, 'y', -250, 200).step(5.0).onChange(onChangeFn);
        folder.add(vector3, 'z', 0, 250).step(5.0).onChange(onChangeFn);
        folder.open();
    }
    function updateLight() {
        directionalLight.target.updateMatrixWorld();
        directionalLightHelper.update();
    }
    updateLight();
    direcLightMenu.add(directionalLight, "visible").name("Directional Light").setValue(false).listen().onChange(function(value) { });
    direcLightMenu.add(directionalLightHelper, "visible").name("Helper").setValue(false).listen().onChange(function(value) { });
    direcLightMenu.add(directionalLight, "intensity").min(0).max(10).step(0.1).name("Intensidad").listen().onChange(function(value){ });
    makeXYZGUI(direcLightMenu, directionalLight.position, 'position', updateLight);
    makeXYZGUI(direcLightMenu, directionalLight.target.position, 'target', updateLight);
    direcLightMenu.addColor(model, "directionalColor").name("Directional Color").listen().onChange(function(color){
        directionalLight.color = new THREE.Color(color[0]/256, color[1]/256, color[2]/256);
    });

    //Point Light
    pointLightMenu.add(pointLight, "visible").name("Point Light").setValue(false).listen().onChange(function(value) { });
    pointLightMenu.add(pointLightHelper, "visible").name("Helper").setValue(false).listen().onChange(function(value) { });
    pointLightMenu.add(pointLight, "intensity").min(0).max(10).step(0.1).name("Intensidad").listen().onChange(function(value){ });
    pointLightMenu.add(pointLight, "decay").min(0).max(4).step(0.1).name("Decay").listen().onChange(function(value){ });
    pointLightMenu.add(pointLight, "power").min(0).max(1220).step(0.1).name("Power").listen().onChange(function(value){ });
    pointLightMenu.add(pointLight, "distance").min(0).max(20).step(0.1).name("Distance").listen().onChange(function(value){ });
    pointLightMenu.add(pointLight.position, "x").min(0).max(250).step(5.0).setValue(125).name("Point Light X").listen().onChange(function(value){ });
    pointLightMenu.add(pointLight.position, "y").min(4).max(150).step(2.0).setValue(15).name("Point Light Y").listen().onChange(function(value){ });
    pointLightMenu.add(pointLight.position, "z").min(0).max(250).step(5.0).setValue(125).name("Point Light Z").listen().onChange(function(value){ });
    pointLightMenu.addColor(model, "pointColor").name("Point Color").listen().onChange(function(color){
        pointLight.color = new THREE.Color(color[0]/256, color[1]/256, color[2]/256);
        pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
    });

    //RectAreaLight
    class DegRadHelper {
        constructor(obj, prop) {
          this.obj = obj;
          this.prop = prop;
        }
        get value() {
          return THREE.MathUtils.radToDeg(this.obj[this.prop]);
        }
        set value(v) {
          this.obj[this.prop] = THREE.MathUtils.degToRad(v);
        }
    }
    rectLightMenu.add(rectLight, "visible").name("Rect Area Light").setValue(false).listen().onChange(function(value) { });
    rectLightMenu.add(rectAreaLightHelper, "visible").name("Helper").setValue(false).listen().onChange(function(value) { });
    rectLightMenu.add(rectLight, "intensity").min(0).max(10).step(0.1).name("Intensidad").listen().onChange(function(value){ });
    rectLightMenu.add(rectLight, 'width', 0, 20);
    rectLightMenu.add(rectLight, 'height', 0, 20);

    rectLightMenu.add(new DegRadHelper(rectLight.rotation, 'x'), 'value', -180, 180).name('x rotation');
    rectLightMenu.add(new DegRadHelper(rectLight.rotation, 'y'), 'value', -180, 180).name('y rotation');
    rectLightMenu.add(new DegRadHelper(rectLight.rotation, 'z'), 'value', -180, 180).name('z rotation');

    rectLightMenu.add(rectLight.position, "x").min(0).max(250).step(5).setValue(125).name("Rect Light X").listen().onChange(function(value){ });
    rectLightMenu.add(rectLight.position, "y").min(0).max(150).step(5).setValue(15).name("Rect Light Y").listen().onChange(function(value){ });
    rectLightMenu.add(rectLight.position, "z").min(0).max(250).step(5).setValue(125).name("Rect Light Z").listen().onChange(function(value){ });
    rectLightMenu.addColor(model, "rectColor").name("Rect Color").listen().onChange(function(color){
        rectLight.color = new THREE.Color(color[0]/256, color[1]/256, color[2]/256);
    });

    //Spot light
    spotLightMenu.add(spotLight, "visible").name("Point Light").setValue(false).listen().onChange(function(value) {

    });
    spotLightMenu.add(spotLightHelper, "visible").name("Helper").setValue(false).listen().onChange(function(value) {

    });
    function updateSpotLight() {
        spotLight.target.updateMatrixWorld();
        spotLightHelper.update();
    }
    updateSpotLight();
    spotLightMenu.add(spotLight, 'intensity', 0, 2, 0.01);
    spotLightMenu.add(spotLight, 'distance', 0, 40).onChange(updateSpotLight);
    spotLightMenu.add(new DegRadHelper(spotLight, 'angle'), 'value', 0, 90).name('angle').onChange(updateSpotLight);
    spotLightMenu.add(spotLight, 'penumbra', 0, 1, 0.01);

    makeXYZGUI(spotLightMenu, spotLight.position, 'position', updateSpotLight);
    makeXYZGUI(spotLightMenu, spotLight.target.position, 'target', updateSpotLight);

    spotLightMenu.addColor(model, "spotColor").name("Spot Color").listen().onChange(function(color){
        spotLight.color = new THREE.Color(color[0]/256, color[1]/256, color[2]/256);
    });

    function skyChange(texture1, texture2, texture3, texture4, texture5, texture6) {

        scene.remove(skybox);

        // MODELS
        geometry = new THREE.BoxGeometry(500, 500, 500);

        let cubeMaterials = [
            new THREE.MeshBasicMaterial({map:texture1, side: THREE.DoubleSide}),
            new THREE.MeshBasicMaterial({map:texture2, side: THREE.DoubleSide}),
            new THREE.MeshBasicMaterial({map:texture3, side: THREE.DoubleSide}),
            new THREE.MeshBasicMaterial({map:texture4, side: THREE.DoubleSide}),
            new THREE.MeshBasicMaterial({map:texture5, side: THREE.DoubleSide}),
            new THREE.MeshBasicMaterial({map:texture6, side: THREE.DoubleSide})
        ]
        // MESH
        skybox = new THREE.Mesh(geometry, cubeMaterials);
        skybox.position.set(renderDistance * chunkSize / 2 * 5, 10, renderDistance * chunkSize / 2 * 5)

        // SCENE HIERARCHY
        scene.add(skybox);
    }

    let colorPalette = skyMenu.addColor(model, "colorPalette").name("Sky Color Palette").listen().onChange(function(color){
        scene.background = new THREE.Color(color[0]/256, color[1]/256, color[2]/256);
    });


    texture1 = new THREE.TextureLoader().load('./../texture/bluecloud_ft.jpg');
    texture2 = new THREE.TextureLoader().load('./../texture/bluecloud_bk.jpg');
    texture3 = new THREE.TextureLoader().load('./../texture/bluecloud_up.jpg');
    texture4 = new THREE.TextureLoader().load('./../texture/bluecloud_dn.jpg');
    texture5 = new THREE.TextureLoader().load('./../texture/bluecloud_rt.jpg');
    texture6 = new THREE.TextureLoader().load('./../texture/bluecloud_lf.jpg');
    skyChange(texture1, texture2, texture3, texture4, texture5, texture6);

    let listSky = skyMenu.add(model, "defaultSky", model.listSkys).name("Sky list options").setValue("Blue").listen().onChange(function(item){
        console.log(item);
        if(item=="None"){
            scene.remove(skybox);
        }else if (item=="Blue Clouds"){
            texture1 = new THREE.TextureLoader().load('./../texture/clouds1_east.bmp');
            texture2 = new THREE.TextureLoader().load('./../texture/clouds1_west.bmp');
            texture3 = new THREE.TextureLoader().load('./../texture/clouds1_up.bmp');
            texture4 = new THREE.TextureLoader().load('./../texture/clouds1_down.bmp');
            texture5 = new THREE.TextureLoader().load('./../texture/clouds1_north.bmp');
            texture6 = new THREE.TextureLoader().load('./../texture/clouds1_south.bmp');
            
            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if(item=="Blue"){
            texture1 = new THREE.TextureLoader().load('./../texture/bluecloud_ft.jpg');
            texture2 = new THREE.TextureLoader().load('./../texture/bluecloud_bk.jpg');
            texture3 = new THREE.TextureLoader().load('./../texture/bluecloud_up.jpg');
            texture4 = new THREE.TextureLoader().load('./../texture/bluecloud_dn.jpg');
            texture5 = new THREE.TextureLoader().load('./../texture/bluecloud_rt.jpg');
            texture6 = new THREE.TextureLoader().load('./../texture/bluecloud_lf.jpg');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if(item=="Yellow"){
            texture1 = new THREE.TextureLoader().load('./../texture/yellowcloud_ft.jpg');
            texture2 = new THREE.TextureLoader().load('./../texture/yellowcloud_bk.jpg');
            texture3 = new THREE.TextureLoader().load('./../texture/yellowcloud_up.jpg');
            texture4 = new THREE.TextureLoader().load('./../texture/yellowcloud_dn.jpg');
            texture5 = new THREE.TextureLoader().load('./../texture/yellowcloud_rt.jpg');
            texture6 = new THREE.TextureLoader().load('./../texture/yellowcloud_lf.jpg');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if(item=="Gray"){
            texture1 = new THREE.TextureLoader().load('./../texture/graycloud_ft.jpg');
            texture2 = new THREE.TextureLoader().load('./../texture/graycloud_bk.jpg');
            texture3 = new THREE.TextureLoader().load('./../texture/graycloud_up.jpg');
            texture4 = new THREE.TextureLoader().load('./../texture/graycloud_dn.jpg');
            texture5 = new THREE.TextureLoader().load('./../texture/graycloud_rt.jpg');
            texture6 = new THREE.TextureLoader().load('./../texture/graycloud_lf.jpg');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if(item=="Brown"){
            texture1 = new THREE.TextureLoader().load('./../texture/browncloud_ft.jpg');
            texture2 = new THREE.TextureLoader().load('./../texture/browncloud_bk.jpg');
            texture3 = new THREE.TextureLoader().load('./../texture/browncloud_up.jpg');
            texture4 = new THREE.TextureLoader().load('./../texture/browncloud_dn.jpg');
            texture5 = new THREE.TextureLoader().load('./../texture/browncloud_rt.jpg');
            texture6 = new THREE.TextureLoader().load('./../texture/browncloud_lf.jpg');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Red Dark"){

            texture1 = new THREE.TextureLoader().load('./../texture/bkg1_rt.png');
            texture2 = new THREE.TextureLoader().load('./../texture/bkg1_lf.png');
            texture3 = new THREE.TextureLoader().load('./../texture/bkg1_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/bkg1_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/bkg1_ft.png');
            texture6 = new THREE.TextureLoader().load('./../texture/bkg1_bk.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Blue Dark"){

            texture1 = new THREE.TextureLoader().load('./../texture/bkg2_rt.png');
            texture2 = new THREE.TextureLoader().load('./../texture/bkg2_lf.png');
            texture3 = new THREE.TextureLoader().load('./../texture/bkg2_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/bkg2_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/bkg2_ft.png');
            texture6 = new THREE.TextureLoader().load('./../texture/bkg2_bk.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Blue Light"){

            texture1 = new THREE.TextureLoader().load('./../texture/bkg_rt.png');
            texture2 = new THREE.TextureLoader().load('./../texture/bkg_lf.png');
            texture3 = new THREE.TextureLoader().load('./../texture/bkg_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/bkg_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/bkg_ft.png');
            texture6 = new THREE.TextureLoader().load('./../texture/bkg_bk.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Interestelar"){

            texture1 = new THREE.TextureLoader().load('./../texture/interstellar_ft.png');
            texture2 = new THREE.TextureLoader().load('./../texture/interstellar_bk.png');
            texture3 = new THREE.TextureLoader().load('./../texture/interstellar_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/interstellar_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/interstellar_rt.png');
            texture6 = new THREE.TextureLoader().load('./../texture/interstellar_lf.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Nebulas"){
            texture1 = new THREE.TextureLoader().load('./../texture/nebulas_lf.png');
            texture2 = new THREE.TextureLoader().load('./../texture/nebulas_rt.png');
            texture3 = new THREE.TextureLoader().load('./../texture/nebulas_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/nebulas_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/nebulas_ft.png');
            texture6 = new THREE.TextureLoader().load('./../texture/nebulas_bk.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Space"){
            texture1 = new THREE.TextureLoader().load('./../texture/space_ft.png');
            texture2 = new THREE.TextureLoader().load('./../texture/space_bk.png');
            texture3 = new THREE.TextureLoader().load('./../texture/space_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/space_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/space_rt.png');
            texture6 = new THREE.TextureLoader().load('./../texture/space_lf.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }else if (item=="Tron"){
            texture1 = new THREE.TextureLoader().load('./../texture/tron_ft.png');
            texture2 = new THREE.TextureLoader().load('./../texture/tron_bk.png');
            texture3 = new THREE.TextureLoader().load('./../texture/tron_up.png');
            texture4 = new THREE.TextureLoader().load('./../texture/tron_dn.png');
            texture5 = new THREE.TextureLoader().load('./../texture/tron_rt.png');
            texture6 = new THREE.TextureLoader().load('./../texture/tron_lf.png');

            skyChange(texture1, texture2, texture3, texture4, texture5, texture6);
        }
    });


    blockBox = new THREE.BoxGeometry(5, 5, 5)
    var count = 0;
    for(var i = 0; i < renderDistance; i++){
        for(var j = 0; j < renderDistance; j++){
            var chunk = [];
            for(var x = i * chunkSize; x < (i * chunkSize) + chunkSize; x++){
                for(var z = j * chunkSize; z < (j * chunkSize) + chunkSize; z++){
                    var v = 0;
                    chunk.push(new Block(x * 5, v, z * 5, materialArray, false));
                    instancedChunk[count] = new THREE.Mesh(blockBox, materialArray);
                    instancedChunk[count].position.set(x * 5 ,v,z * 5);
                    count++;
                }
            }
            chunks.push(chunk);
        }
    }

    instancedChunk.forEach(element => {
        scene.add(element);
    });

    for(var x = 0; x < renderDistance; x++){
        for(var z = 0; z < renderDistance; z++){
            chunkMap.push({x : x, z : z});
        }
    }


    start = 0;
    sprint = false; 

    stats = new Stats();
    stats.showPanel(0); // 0:fps, 1:ms, 2:mb, 3+:custom
    document.body.appendChild(stats.dom);

    // RENDER LOOP
    renderLoop();
}

function identifyChunk(x, z){
    var lowestX = lowestXBlock();
    var lowestZ = lowestZBlock();
    var difX = x - lowestX;
    var difZ = z - lowestZ;
    var divX = Math.floor(difX / (chunkSize * 5));
    var divZ = Math.floor(difZ / (chunkSize * 5));
    var index = undefined;
    for(var i = 0; i < chunkMap.length; i++){
        if(chunkMap[i].x == divX && chunkMap[i].z == divZ){
            index = i;
            break;
        }
    }
    return index; // Identified the chunks!!!
}


document.addEventListener("keydown", function(e){
    if(e.key == "esc"){
        controls.unlock();
    }
    if(e.key == "w") {
        var elapsed = new Date().getTime();
        if(elapsed - start <= 300){
            sprint = true;
        }
        start = elapsed;
    }

    keys.push(e.key);

    if(e.key == 'e'){
        multiview = !multiview;
    }

    if(e.key == controlOptions.jump && canJump == true){
        ySpeed = -1;
        canJump = false;
    }
    if(e.key == controlOptions.placeBlock){
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        pointer.x = (0.5) * 2 - 1;
        pointer.y = -1 * (0.5) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        var intersection = raycaster.intersectObjects(instancedChunk, true);

        if(intersection[0] != undefined && intersection[0].distance < 40){

            var materialIndex = intersection[0].face.materialIndex;
            var position = intersection[0].point; // object with x, y and z coords
            var x = 0;
            var y = 0;
            var z = 0;
            const inc = 2.5; 
            switch(materialIndex){
                case 0: // right
                    x = position.x + inc;
                    y = Math.round(position.y / 5) * 5;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 1: // left
                    x = position.x - inc;
                    y = Math.round(position.y / 5) * 5;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 2: // top
                    x = Math.round(position.x / 5) * 5;
                    y = position.y + inc;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 3: // bottom
                    x = Math.round(position.x / 5) * 5;
                    y = position.y - inc;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 4: // front
                    x = Math.round(position.x / 5) * 5;
                    y = Math.round(position.y / 5) * 5;
                    z = position.z + inc;
                    break;
                case 5: // back
                    x = Math.round(position.x / 5) * 5;
                    y = Math.round(position.y / 5) * 5;
                    z = position.z - inc;
                    break;
            }
            y = Math.round(y); // sometimes, y is for some reason e.g 4.999999999999
            var b = {x : x, y : y, z : z};
            if(!intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d)){
                if(model.selectedMaterialName == 'door'){
                    let mtlLoader = new MTLLoader();
                    mtlLoader.load('./assets/obj/door.obj', function(materials) {
                        materials.preload();
                        var objLoader = new OBJLoader();
                        objLoader.setMaterials(materials);
                        objLoader.load('./assets/obj/door.obj', function (object) {
                            var texture = new THREE.TextureLoader().load('./assets/obj/wood.jpg');
                            
                            object.traverse( function ( child ) {
                                if ( child instanceof THREE.Mesh ) {
                                    child.material.map = texture;
                                }
                            } );

                            object.position.set(x, y - 2.5, z);
                            object.scale.set(.55, .333, .35)
                            object.rotation.y = object.rotation.y - (Math.PI/2);
                            
                            console.log(object);
                            instancedChunk.push(object);
                            scene.add(instancedChunk[instancedChunk.length -1]);
                        });
                    });
                }
                else if (model.selectedMaterialName == 'window'){
                    chunks[identifyChunk(x, z)].push(new Block(x, y, z, model.selectedMaterial, true));
                    placedBlocks.push(b);
                    let addedBlock = new Window();
                    addedBlock.position.set(x, y, z);
                    instancedChunk.push(addedBlock);
                    scene.add(instancedChunk[instancedChunk.length -1]);
                }
                else{
                    chunks[identifyChunk(x, z)].push(new Block(x, y, z, model.selectedMaterial, true));
                    placedBlocks.push(b);
                    let addedBlock = new  THREE.Mesh(blockBox, model.selectedMaterial);
                    addedBlock.position.set(x, y, z);
                    instancedChunk.push(addedBlock);
                    scene.add(instancedChunk[instancedChunk.length -1]);
                }
            }		
        }
    }
});
document.addEventListener("keyup", function(e){
    var newArr = [];
    for(var i = 0; i < keys.length; i++){
        if(keys[i] != e.key){
            newArr.push(keys[i]);
        }
    }
    keys = newArr;
    if(!keys.includes("w")){
        sprint = false;
    }
});

var controls = new PointerLockControls(camera, document.body);
var brokenBlocks = [];

document.body.addEventListener("click", function(){
    controls.lock();
    // Breaking blocks
    if(controls.isLocked){
        // Shooting a ray
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        pointer.x = (0.5) * 2 - 1;
        pointer.y = -1 * (0.5) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        var intersection = raycaster.intersectObjects(instancedChunk, true);
        
        if(intersection[0] != undefined && intersection[0].distance < 40){
            if(intersection[0].object.parent.type == 'Group'){
                intersection[0].object = intersection[0].object.parent;
            };
            // finding x, y, z positions of that 
            var materialIndex = intersection[0].face.materialIndex;
            var position = intersection[0].point; // object with x, y and z coords
            var x = 0;
            var y = 0;
            var z = 0;
            const inc = 2.5; 
            switch(materialIndex){ // finding x, y, z positions of block
                case 0: // right
                    x = position.x - inc;
                    y = Math.round(position.y / 5) * 5;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 1: // left
                    x = position.x + inc;
                    y = Math.round(position.y / 5) * 5;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 2: // top
                    x = Math.round(position.x / 5) * 5;
                    y = position.y - inc;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 3: // bottom
                    x = Math.round(position.x / 5) * 5;
                    y = position.y + inc;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 4: // front
                    x = Math.round(position.x / 5) * 5;
                    y = Math.round(position.y / 5) * 5;
                    z = position.z - inc;
                    break;
                case 5: // back
                    x = Math.round(position.x / 5) * 5;
                    y = Math.round(position.y / 5) * 5;
                    z = position.z + inc;
                    break;
            }
            // Find block with those x, y, z positions
            // More efficient by finding it inside it's chunk
            var index1 = identifyChunk(x, z);
            var chunk = chunks[index1];
            y = Math.round(y); // sometimes, y is for some reason e.g 4.999999999999
            for(var i = 0; i < chunk.length; i++){
                if(chunk[i].x == x && chunk[i].y == y && chunk[i].z == z && chunk[i].placed){
                    // Found the block!
                    if(chunk[i].placed){
                        // find the placedBlock and remove it
                        for(var j = 0; j < placedBlocks.length; j++){
                            if(placedBlocks[j].x == x && placedBlocks[j].y == y && placedBlocks[j].z == z){
                                placedBlocks.splice(j, 1);
                                break;
                            }
                        }
                    } else { // if it is a normal block
                        brokenBlocks.push({x : x, y : y, z : z});
                    }
                    chunks[index1].splice(i, 1); // block is removed from chunks variable

                    break;
                }
            }

            // update chunks, array.splice(index, 1);
            instancedChunk.forEach((element, i) => {
                if(element.position == intersection[0].object.position && intersection[0].object.position.y != 0){
                    instancedChunk.splice(i, 1);
                }
            }); 
            if(intersection[0].object.position.y != 0){
                scene.remove(intersection[0].object);
            }
        }
    }
});
controls.addEventListener("lock", function(){

});
controls.addEventListener("unlock", function(){
    keys = [];
});

function intersect(x1, y1, z1, w1, h1, d1, x2, y2, z2, w2, h2, d2){
    var a = {
        minX : x1 - (w1/2),
        maxX : x1 + (w1/2),
        minZ : z1 - (d1/2),
        maxZ : z1 + (d1/2),
        minY : y1 - (h1/2),
        maxY : y1 + (h1/2),
    };
    var b = {
        minX : x2 - (w2/2),
        maxX : x2 + (w2/2),
        minZ : z2 - (d2/2),
        maxZ : z2 + (d2/2),
        minY : y2 - (h2/2),
        maxY : y2 + (h2/2),
    };
    return (a.minX <= b.maxX && a.maxX >= b.minX) &&
            (a.minY <= b.maxY && a.maxY >= b.minY) &&
            (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
}

function update(){	
    player.updatePosition();

    if(keys.includes(controlOptions.forward)){
        player.forward(movingSpeed * (sprint ? sprintSpeedInc : 1));
        forback = 1 * movingSpeed;
        for(var i = 0; i < chunks.length; i++){
            for(var j = 0; j < chunks[i].length; j++){
                var b = chunks[i][j];
                var c = intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d);
                if(c && (b.y - 2.5 < player.y + (player.h / 2) && b.y + 2.5 > player.y - (player.h / 2))){
                    player.backward((movingSpeed * (sprint ? sprintSpeedInc : 1)));
                    forback = 0;
                    rightleft = 0;
                    sprint = false;
                }
            }
        }
    }
    if(keys.includes(controlOptions.backward)){
        player.backward(movingSpeed * (sprint ? sprintSpeedInc : 1));
        forback = -1 * movingSpeed;
        for(var i = 0; i < chunks.length; i++){
            for(var j = 0; j < chunks[i].length; j++){
                var b = chunks[i][j];
                var c = intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d);
                if(c && (b.y - 2.5 < player.y + (player.h / 2) && b.y + 2.5 > player.y - (player.h / 2))){
                    player.forward(movingSpeed * (sprint ? sprintSpeedInc : 1));
                    forback = 0;
                    rightleft = 0;
                    sprint = false;
                }
            }
        }
    }
    if(keys.includes(controlOptions.right)){
        player.right(movingSpeed * (sprint ? sprintSpeedInc : 1));
        rightleft = 1 * movingSpeed;
        for(var i = 0; i < chunks.length; i++){
            for(var j = 0; j < chunks[i].length; j++){
                var b = chunks[i][j];
                var c = intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d);
                if(c && (b.y - 2.5 < player.y + (player.h / 2) && b.y + 2.5 > player.y - (player.h / 2))){
                    player.left(movingSpeed * (sprint ? sprintSpeedInc : 1));
                    forback = 0;
                    rightleft = 0;
                    sprint = false;
                }
            }
        }
    }
    if(keys.includes(controlOptions.left)){
        player.left(movingSpeed * (sprint ? sprintSpeedInc : 1));
        rightleft = -1 * movingSpeed;
        for(var i = 0; i < chunks.length; i++){
            for(var j = 0; j < chunks[i].length; j++){
                var b = chunks[i][j];
                var c = intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d);
                if(c && (b.y - 2.5 < player.y + (player.h / 2) && b.y + 2.5 > player.y - (player.h / 2))){
                    player.right(movingSpeed * (sprint ? sprintSpeedInc : 1));
                    forback = 0;
                    rightleft = 0;
                    sprint = false;
                }
            }
        }
    }

    // Decceleration part
    if(!keys.includes(controlOptions.forward) && !keys.includes(controlOptions.backward) && !keys.includes(controlOptions.right) && !keys.includes(controlOptions.left)){
        forback /= deceleration;
        rightleft /= deceleration;
        for(var i = 0; i < chunks.length; i++){
            for(var j = 0; j < chunks[i].length; j++){
                var b = chunks[i][j];
                var c = intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d);
                if(c && (b.y - 2.5 < player.y + (player.h / 2) && b.y + 2.5 > player.y - (player.h / 2))){
                    var br = true;
                    forback /= -deceleration;
                    rightleft /= -deceleration;
                    sprint = false;
                    break;
                }
            }
            if(br){
                break;
            }
        }
        player.forward(forback * (sprint ? sprintSpeedInc : 1));
        player.right(rightleft * (sprint ? sprintSpeedInc : 1));
    }
    
    camera.position.y = camera.position.y - ySpeed;
    ySpeed = ySpeed + acc;

    // Not falling through a block or above a block (above collision)
    for(var i = 0; i < chunks.length; i++){
        for(var j = 0; j < chunks[i].length; j++){
            var b = chunks[i][j];
            var c = intersect(b.x, b.y + 10, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d);
            if(c && camera.position.y <= chunks[i][j].y + 2.5 + player.h && camera.position.y >= chunks[i][j].y){
                camera.position.y = chunks[i][j].y + 2.5 + player.h;
                ySpeed = 0;
                canJump = true;
            }
            var c = intersect(b.x, b.y, b.z, 5, 5, 5, player.x, player.y, player.z, player.w, player.h, player.d); // this one doesn't have a + 10 in the b.y
            if(c && camera.position.y >= chunks[i][j].y - 2.5 && camera.position.y <= chunks[i][j].y){
                ySpeed = 0.5;
            }
        }
    }
}

function lowestXBlock(){
    var xPosArray = [];
    for(var i = 0; i < chunks.length; i++){
        for(var j = 0; j < chunks[i].length; j++){
            xPosArray.push(chunks[i][j].x);
        }
    }
    return Math.min.apply(null, xPosArray);
}

function highestXBlock(){
    var xPosArray = [];
    for(var i = 0; i < chunks.length; i++){
        for(var j = 0; j < chunks[i].length; j++){
            xPosArray.push(chunks[i][j].x);
        }
    }
    return Math.max.apply(null, xPosArray);
}

function lowestZBlock(){
    var zPosArray = [];
    for(var i = 0; i < chunks.length; i++){
        for(var j = 0; j < chunks[i].length; j++){
            zPosArray.push(chunks[i][j].z);
        }
    }
    return Math.min.apply(null, zPosArray);
}

function highestZBlock(){
    var zPosArray = [];
    for(var i = 0; i < chunks.length; i++){
        for(var j = 0; j < chunks[i].length; j++){
            zPosArray.push(chunks[i][j].z);
        }
    }
    return Math.max.apply(null, zPosArray);
}

// Resize Window
window.addEventListener("resize", function(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
pointer.x = (0.5) * 2 - 1;
pointer.y = -1 * (0.5) * 2 + 1;

var plane;
function render(){
    raycaster.setFromCamera(pointer, camera);
    var intersection = raycaster.intersectObjects(instancedChunk, true);
    if(intersection[0] != undefined && intersection[0].distance < 40){
        if(!scene.children.includes(plane)){
            var planeG = new THREE.PlaneGeometry(5, 5);
            var planeM = new THREE.MeshBasicMaterial({color : 0xffffff, side : THREE.DoubleSide});
            planeM.transparent = true;
            planeM.opacity = 0.5;
            plane = new THREE.Mesh(planeG, planeM);
            scene.add(plane);
        } else {
            plane.visible = true;
            var materialIndex = intersection[0].face.materialIndex;
            var position = intersection[0].point; // object with x, y and z coords
            var x = 0;
            var y = 0;
            var z = 0;
            const inc = 0.1; 
            switch(materialIndex){
                case 0: // right
                    plane.rotation.x = 0;
                    plane.rotation.y = (Math.PI / 2);
                    plane.rotation.z = 0;
                    x = position.x + inc;
                    y = Math.round(position.y / 5) * 5;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 1: // left
                    plane.rotation.x = 0;
                    plane.rotation.y = (Math.PI / 2);
                    plane.rotation.z = 0;
                    x = position.x - inc;
                    y = Math.round(position.y / 5) * 5;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 2: // top
                    plane.rotation.x = (Math.PI / 2);
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / 5) * 5;
                    y = position.y + inc;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 3: // bottom
                    plane.rotation.x = (Math.PI / 2);
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / 5) * 5;
                    y = position.y - inc;
                    z = Math.round(position.z / 5) * 5;
                    break;
                case 4: // front
                    plane.rotation.x = 0;
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / 5) * 5;
                    y = Math.round(position.y / 5) * 5;
                    z = position.z + inc;
                    break;
                case 5: // back
                    plane.rotation.x = 0;
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / 5) * 5;
                    y = Math.round(position.y / 5) * 5;
                    z = position.z - inc;
                    break;
            }
            plane.position.x = x;
            plane.position.y = y;
            plane.position.z = z;
        }
    } else {
        if(plane){
            plane.visible = false;
        }
    }

    renderer.render(scene, camera);
}

function renderLoop() {
    stats.begin();
    if(!multiview){
        // CAMERA 1
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
        renderer.render(scene, camera); // DRAW SCENE
    }else{
        // CAMERA 1
        camera4.aspect = window.innerWidth / window.innerHeight;
        camera4.updateProjectionMatrix();
        renderer.setViewport(window.innerWidth / 2, window.innerHeight / 2, window.innerWidth / 2, window.innerHeight / 2);
        renderer.setScissor(window.innerWidth / 2, window.innerHeight / 2, window.innerWidth / 2, window.innerHeight / 2);
        renderer.render(scene, camera4); // DRAW SCENE
        // CAMERA 2
        camera2.aspect = window.innerWidth / window.innerHeight;
        camera2.updateProjectionMatrix();
        renderer.setViewport(0, window.innerHeight / 2, window.innerWidth / 2, window.innerHeight / 2);
        renderer.setScissor(0, window.innerHeight / 2, window.innerWidth / 2, window.innerHeight / 2);
        renderer.render(scene, camera2); // DRAW SCENE

        // CAMERA 3
        camera3.aspect = window.innerWidth / window.innerHeight;
        camera3.updateProjectionMatrix();
        renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight / 2);
        renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight / 2);
        renderer.render(scene, camera3); // DRAW SCENE

        // CAMERA 4
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight / 2);
        renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight / 2);
        renderer.render(scene, camera); // DRAW SCENE
    }
    update();
    stats.end();
    stats.update();
    render();
    requestAnimationFrame(renderLoop);
}

// EVENT LISTENERS & HANDLERS
document.addEventListener("DOMContentLoaded", init);