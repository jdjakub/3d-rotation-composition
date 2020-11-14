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
  mesh[name] = m;
  m.name = name;

  return m;
}

scene.add(newMesh('plane', 'Plane', { color: 0x33ff33, side: e3.DoubleSide }));

mesh.plane.scale.set(10,10,10);
mesh.plane.rotateX(deg(-90)); // X,Y in plane
mesh.plane.translateZ(-1);

function newArrow(name, color, thickness=0.02) {
  let shaft = newMesh(name+'_shaft', 'Cylinder', { color });
  let tip = newMesh(name+'_tip', 'Cone', { color });

  shaft.rotateX(deg(90)); // parent's -Z = its Y
  tip.rotateX(deg(90)); // so we can use lookAt()

  shaft.scale.set(thickness, 0.9, thickness);
  shaft.translateY(0.45);

  tip.scale.set(thickness*2, 0.1, thickness*2);
  tip.translateY(0.95);

  arrow = new e3.Group();
  arrow.name = name;
  arrow.add(shaft); arrow.add(tip);

  return arrow;
}

arrow1 = newArrow('arrow1', 0xff0000);
arrow1.lookAt(v(1,0,0)); // world X
scene.add(arrow1);

arrow2 = newArrow('arrow2', 0x00ff00);
arrow2.lookAt(v(0,1,0)); // world Y
scene.add(arrow2);

arrow3 = newArrow('arrow3', 0x0000ff);
arrow3.lookAt(v(0,0,1)); // world Z
scene.add(arrow3);

scene.add(newMesh('sphere', new e3.SphereBufferGeometry(1, 48, 48),
  { color: 0xaaaaaa, transparent: true, opacity: 0.3 }));

camera.position.set(1.5,1,1.5);
tmp = v(); mesh.sphere.getWorldPosition(tmp);
camera.lookAt(tmp);

directionalLight = new e3.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);

ambientLight = new e3.AmbientLight(0x333333);
scene.add(ambientLight);

function r() {
  renderer.render(scene, camera);
}

r();
