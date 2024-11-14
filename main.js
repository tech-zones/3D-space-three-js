import * as THREE from "https://cdn.skypack.dev/three@0.133.1";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.133.1/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/geometries/TextGeometry.js";

// Scene and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xa0a0a0 );
scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

// Raycaster and mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Lights
const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
hemiLight.position.set( 0, 20, 0 );
scene.add( hemiLight );

const dirLight = new THREE.DirectionalLight( 0xffffff );
dirLight.position.set( 3, 10, 10 );
dirLight.castShadow = true;
dirLight.shadow.camera.top = 2;
dirLight.shadow.camera.bottom = - 2;
dirLight.shadow.camera.left = - 2;
dirLight.shadow.camera.right = 2;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
scene.add( dirLight );

// Ground plane
const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
mesh.rotation.x = - Math.PI / 2;
mesh.receiveShadow = true;
scene.add( mesh );
const gridHelper = new THREE.GridHelper( 100, 100 );
scene.add( gridHelper );

// Container for both camera and person
const container = new THREE.Group();
scene.add(container);

// Camera and controls
const xAxis = new THREE.Vector3(1, 0, 0);
const tempCameraVector = new THREE.Vector3();
const tempModelVector = new THREE.Vector3();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.01, 1000 );
camera.position.set( 0, 2, -1 );
const cameraOrigin = new THREE.Vector3(0, 1.5, 0);
camera.lookAt(cameraOrigin);
container.add(camera);

// Model and animation actions
let model, skeleton, mixer, clock, numAnimations = 0,
    movingForward = false, mousedown = false;
clock = new THREE.Clock();
const allActions = [];
const baseActions = {
  idle: { weight: 1 },
  walk: { weight: 0 },
  run: { weight: 0 }
};
function setWeight( action, weight ) {
  action.enabled = true;
  action.setEffectiveTimeScale( 1 );
  action.setEffectiveWeight( weight );
}
function activateAction( action ) {
  const clip = action.getClip();
  const settings = baseActions[ clip.name ];
  setWeight( action, settings.weight );
  action.play();
}

const loader = new GLTFLoader();
loader.load( 'https://threejs.org/examples/models/gltf/Xbot.glb', function ( gltf ) {
  model = gltf.scene;
  container.add(model);
  model.traverse( function ( object ) {
    if ( object.isMesh ) {
      object.castShadow = true;
    }   
  });
  
  skeleton = new THREE.SkeletonHelper( model );
  skeleton.visible = false;
  container.add( skeleton );
  const animations = gltf.animations;
  mixer = new THREE.AnimationMixer( model );

  let a = animations.length;
  for ( let i = 0; i < a; ++ i ) {
    let clip = animations[ i ];
    const name = clip.name;
    if ( baseActions[ name ] ) {
      const action = mixer.clipAction( clip );
      activateAction( action );
      baseActions[ name ].action = action;
      allActions.push( action );
      numAnimations += 1;
    }
  }
});

// Add white 3D screen with a border, positioned higher
const screenGeometry = new THREE.PlaneGeometry(2, 1); 
const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const screen = new THREE.Mesh(screenGeometry, screenMaterial);
screen.position.set(0, 2, -3); // Higher position for the screen
screen.rotation.y = Math.PI;
scene.add(screen);

// Add border to the screen
const screenEdges = new THREE.EdgesGeometry(screenGeometry);
const screenBorder = new THREE.LineSegments(screenEdges, new THREE.LineBasicMaterial({ color: 0x000000 }));
screenBorder.position.copy(screen.position);
screenBorder.rotation.copy(screen.rotation);
scene.add(screenBorder);

// Add "Screen" text on the whiteboard
const fontLoader = new FontLoader();
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
  const textGeometry = new TextGeometry('Screen', {
    font: font,
    size: 0.2,
    height: 0.05,
  });
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(-0.4, 1.7, -3.1); // Position text on the screen
//  scene.add(textMesh);
});

// Talk Zone: a transparent plane that lights up
const talkZoneGeometry = new THREE.PlaneGeometry(2, 2);
const talkZoneMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
const talkZone = new THREE.Mesh(talkZoneGeometry, talkZoneMaterial);
talkZone.position.set(0, 0.01, -5); // Slightly above ground to avoid z-fighting
talkZone.rotation.x = -Math.PI / 2; // Make it horizontal
scene.add(talkZone);

let inTalkZone = false; // Track if the character is in the talk zone

// Add additional 3D shapes and make them clickable
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
cube.position.set(2, 0.5, 2);
cube.castShadow = true;
scene.add(cube);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
sphere.position.set(-2, 0.5, -2);
sphere.castShadow = true;
scene.add(sphere);

const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 32), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
cone.position.set(3, 0.5, -3);
cone.castShadow = true;
scene.add(cone);

const clickableObjects = [screen, cube, sphere, cone]; // Objects to make clickable

const animate = function () {
  requestAnimationFrame( animate );

  for ( let i = 0; i < numAnimations; i++ ) {
    const action = allActions[ i ];
    const clip = action.getClip();
    const settings = baseActions[clip.name];
  }

  if(mixer) {
    const mixerUpdateDelta = clock.getDelta();
    mixer.update( mixerUpdateDelta );
  }
  
  if(movingForward) {
    camera.getWorldDirection(tempCameraVector);
    const cameraDirection = tempCameraVector.setY(0).normalize();
    model.getWorldDirection(tempModelVector);
    const playerDirection = tempModelVector.setY(0).normalize();
    const cameraAngle = cameraDirection.angleTo(xAxis) * (cameraDirection.z > 0 ? 1 : -1);
    const playerAngle = playerDirection.angleTo(xAxis) * (playerDirection.z > 0 ? 1 : -1);
    const angleToRotate = playerAngle - cameraAngle;
    let sanitisedAngle = angleToRotate;
    if(angleToRotate > Math.PI) {
      sanitisedAngle = angleToRotate - 2 * Math.PI;
    }
    if(angleToRotate < -Math.PI) {
      sanitisedAngle = angleToRotate + 2 * Math.PI;
    }
    model.rotateY(Math.max(-0.05, Math.min(sanitisedAngle, 0.05)));
    container.position.add(cameraDirection.multiplyScalar(0.05));
    camera.lookAt(container.position.clone().add(cameraOrigin));
  }

  // Check if the character is inside the talk zone
  const characterPosition = container.position;
  const isInsideTalkZone = 
      Math.abs(characterPosition.x - talkZone.position.x) < 1 &&
      Math.abs(characterPosition.z - talkZone.position.z) < 1;

  // Trigger alert when entering the talk zone
  if (isInsideTalkZone && !inTalkZone) {
    alert("Call starts");
    inTalkZone = true;
  } else if (!isInsideTalkZone) {
    inTalkZone = false;
  }

  renderer.render( scene, camera );
};

animate();

// Key and mouse events for movement and camera rotation
window.addEventListener("keydown", (e) => {
  const { keyCode } = e;
  if(keyCode === 87 || keyCode === 38) { // 'W' or 'Up Arrow' key
    baseActions.idle.weight = 0;
    baseActions.run.weight = 5;   
    activateAction(baseActions.run.action);
    activateAction(baseActions.idle.action);
    movingForward = true;
  }
});

window.addEventListener("keyup", (e) => {
  const { keyCode } = e;
  if(keyCode === 87 || keyCode === 38) { // 'W' or 'Up Arrow' key
    baseActions.idle.weight = 1;
    baseActions.run.weight = 0;
    activateAction(baseActions.run.action);
    activateAction(baseActions.idle.action);
    movingForward = false;
  }
});

// Handle clicks to show alerts for clickable objects
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    if (clickedObject === cube) alert("Cube clicked!");
    else if (clickedObject === sphere) alert("Sphere clicked!");
    else if (clickedObject === cone) alert("Cone clicked!");
    else if (clickedObject === screen) alert("Screen clicked!");
  }
});

// Mouse controls for camera rotation
window.addEventListener("pointerdown", () => {
  mousedown = true;
});

window.addEventListener("pointerup", () => {
  mousedown = false;
});

window.addEventListener("pointermove", (e) => {
  if (mousedown) {
    const { movementX, movementY } = e;
    const offset = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(cameraOrigin)
    );
    const phi = offset.phi - movementY * 0.02;
    offset.theta -= movementX * 0.02;
    offset.phi = Math.max(0.01, Math.min(0.35 * Math.PI, phi));
    camera.position.copy(
      cameraOrigin.clone().add(new THREE.Vector3().setFromSpherical(offset))
    );
    camera.lookAt(container.position.clone().add(cameraOrigin));
  }
});
