e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
deg = degs => turn(degs/360);

renderer = new e3.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth*.99, window.innerHeight*.99);
renderer.setPixelRatio(window.devicePixelRatio || 1);

scene = new e3.Scene();
camera = new THREE.PerspectiveCamera(75, // Field-of-view
                                     window.innerWidth / window.innerHeight, // Aspect
                                     0.0001, 1000); // Near / far plane distance
scene.add(camera);

geometry = {};
material = {};
mesh = {}

function newMesh(name, geom, matParams) {
  if (typeof geom === 'string')
    geom = new e3[geom+'BufferGeometry']();
  geometry[name] = geom;

  let mat = new e3.MeshLambertMaterial(matParams);
  material[name] = mat;

  let m = new e3.Mesh(geom, mat);
  scene.add(m);
  mesh[name] = m;
  m.name = name;

  return m;
}

newMesh('plane', 'Plane', { color: 0x33ff33, side: e3.DoubleSide });

mesh.plane.scale.set(10,10,10);
mesh.plane.rotateX(deg(-90));
mesh.plane.translateZ(-1);

newMesh('line', 'Cylinder', { color: 0xff0000 });

mesh.line.rotateZ(deg(90));
mesh.line.scale.set(0.05, 0.9, 0.05);
mesh.line.translateY(0.5);

newMesh('cone', 'Cone', { color: 0xff0000 });

mesh.cone.rotateZ(deg(90));
mesh.cone.scale.set(0.1, 0.1, 0.1);
mesh.cone.translateY(0.95);

newMesh('sphere', new e3.SphereBufferGeometry(1, 32, 32),
  { color: 0xaaaaaa, transparent: true, opacity: 0.5 });

camera.position.set(-1.5,1,-1.5);
tmp = v(); mesh.sphere.getWorldPosition(tmp);
camera.lookAt(tmp);

directionalLight = new e3.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);

ambientLight = new e3.AmbientLight(0x222222);
scene.add(ambientLight);

function r() {
  renderer.render(scene, camera);
}

r();
