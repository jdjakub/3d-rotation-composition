e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
deg = degs => turn(degs/360);

renderer = new e3.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth*.99, window.innerHeight*.99);
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setClearColor(new e3.Color(0x05befc));

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

scene.add(newMesh('plane', 'Plane', { color: 0x43a33c, side: e3.DoubleSide }));

mesh.plane.scale.set(10,10,10);
mesh.plane.rotateX(deg(-90)); // X,Y in plane
mesh.plane.translateZ(-1);

thickness=0.02;
function newArrow(name, color, target, origin) {
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

  if (origin) arrow.setWorldPosition(origin);
  if (target) pointArrow(arrow, target);

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
  arrow.updateMatrixWorld();
}

axis_a = newArrow('axis_a', 0xff0000, v(1,0,0)); // world X
scene.add(axis_a);

axis_b = newArrow('axis_b', 0xff7700, v(0,0,1)); // world Z
scene.add(axis_b);

dependents = new Map();
updates = new Map();

function changed(obj) {
  let deps = dependents.get(obj);
  if (deps) {
    deps.forEach(d => {
      let update = updates.get(d);
      if (update) {
        update(d);
        changed(d);
      }
    });
  }
}

a_x_b = newArrow('a_x_b', 0xffff00, v(0,-1,0));
scene.add(a_x_b);
dependents.set(axis_a, new Set([a_x_b]));
dependents.set(axis_b, new Set([a_x_b]));

updates.set(a_x_b, function(arr) {
  let a = v(0,0,1); axis_a.localToWorld(a);
  let b = v(0,0,1); axis_b.localToWorld(b);
  a.cross(b);
  pointArrow(arr, a);
});

scene.add(newMesh('sphere', new e3.SphereBufferGeometry(1, 48, 48),
  { color: 0xaaaaaa, transparent: true, opacity: 0.3 }));

camera.position.set(1.5,1,1.5);
tmp = v(); mesh.sphere.getWorldPosition(tmp);
camera.lookAt(tmp);

directionalLight = new e3.DirectionalLight(0xffffff, 1);
directionalLight.position.copy(v(1,1,-1));
scene.add(directionalLight);

ambientLight = new e3.AmbientLight(0x333333);
scene.add(ambientLight);

function r() {
  renderer.render(scene, camera);
}

r();
