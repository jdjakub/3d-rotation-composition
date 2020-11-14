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

  // want to use lookAt() to orient lines
  // lookAt() aims +z towards target (or -z for a camera)
  // but cone and cyl geometries point along their Y axis (why!?)
  // So, we rotate all vertices (expensive operation) Y->Z
  // i.e. afterwards, geom +Z is "forwards" (as it should be(!))
  shaft.geometry.rotateX(deg(90));
  tip.geometry.rotateX(deg(90));

  // Next, geom vertices are *centered* at (0,0,0)
  // however, for "pointing" lines and cones, it's nicer to have
  // one end of line or the base of the cone as the "origin"
  // So, we move vertices forwards by half length
  // now, scaling will work from one endpoint instead of the center
  shaft.geometry.translate(0, 0, 0.5);
  tip.geometry.translate(0, 0, 0.5);

  shaft.scale.set(thickness, thickness, 0.9);

  tip.scale.set(thickness*2, thickness*2, 0.1);
  tip.translateZ(0.9);

  arrow = new e3.Group();
  arrow.name = name;
  arrow.arrowShaft = shaft;
  arrow.arrowTip = tip;
  arrow.add(shaft); arrow.add(tip);

  return arrow;
}

function arrowLength(arrow, length) {
  arrow.arrowShaft.scale.setComponent(2, length-0.1);
  let zTip = v(0,0,1); zTip.applyQuaternion(arrow.arrowTip.quaternion);
  arrow.arrowTip.position.copy(zTip.multiplyScalar(length-0.1));
}

function pointArrow(arrow, target) {
  let delta = v(); arrow.getWorldPosition(delta); delta.sub(target); delta.negate();
  arrow.lookAt(target);
  arrowLength(arrow, delta.length());
}

arrow1 = newArrow('arrow1', 0xff0000);
pointArrow(arrow1, v(1,0,0)); // world X
scene.add(arrow1);

arrow2 = newArrow('arrow2', 0x00ff00);
pointArrow(arrow2, v(0,1,0)); // world Y
scene.add(arrow2);

arrow3 = newArrow('arrow3', 0x0000ff);
pointArrow(arrow3, v(0,0,1)); // world Z
scene.add(arrow3);

arrow4 = newArrow('arrow4', 0xffff00);
pointArrow(arrow4, v(0,1,-1));
scene.add(arrow4);

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
