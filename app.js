log = (...args) => { console.log(...args); return args ? args[0] : undefined };
final = arr => arr[arr.length-1]
e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
deg = degs => turn(degs/360);
xtoz = angle => v(Math.cos(angle), 0, Math.sin(angle));

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

geometry.shaft = new e3.CylinderBufferGeometry();
geometry.tip = new e3.ConeBufferGeometry();

// want to use lookAt() to orient lines
// lookAt() aims +z towards target (or -z for a camera)
// but cone and cyl geometries point along their Y axis (why!?)
// So, we rotate all vertices (expensive operation) Y->Z
// i.e. afterwards, geom +Z is "forwards" (as it should be(!))
geometry.shaft.rotateX(deg(90));
geometry.tip.rotateX(deg(90));

// Next, geom vertices are *centered* at (0,0,0)
// however, for "pointing" lines and cones, it's nicer to have
// one end of line or the base of the cone as the "origin"
// So, we move vertices forwards by half length
// now, scaling will work from one endpoint instead of the center
geometry.shaft.translate(0, 0, 0.5);
geometry.tip.translate(0, 0, 0.5);

function newArrow(name, color, target, origin) {
  let shaft = newMesh(name+'_shaft', geometry.shaft, { color });
  let tip = newMesh(name+'_tip', geometry.tip, { color });

  shaft.scale.set(0, 0, 0.9);
  tip.scale.set(0, 0, 0.1);

  tip.translateZ(0.9);

  arrow = new e3.Group();
  arrow.name = name;
  arrow.arrowShaft = shaft;
  arrow.arrowTip = tip;
  arrow.add(shaft); arrow.add(tip);

  if (origin) arrow.setWorldPosition(origin);
  if (target) pointArrow(arrow, target);

  arrowThickness(arrow, 0.02);

  return arrow;
}

function arrowLength(arrow, length) {
  let shaftLength = Math.abs(length) - 0.1;
  arrow.visible = shaftLength > 0.0;
  arrow.arrowShaft.scale.setComponent(2, shaftLength);
  let zTip = v(0,0,1); zTip.applyQuaternion(arrow.arrowTip.quaternion);
  arrow.arrowTip.position.copy(zTip.multiplyScalar(shaftLength));
}

function arrowThickness(arrow, th) {
  let s = arrow.arrowShaft.scale;
  s.x = s.y = th;
  s = arrow.arrowTip.scale;
  s.x = s.y = th * 2;
}

function pointArrow(arrow, target) {
  let delta = v(); arrow.getWorldPosition(delta); delta.sub(target); delta.negate();
  arrow.lookAt(target);
  arrowLength(arrow, delta.length());
  arrow.updateMatrixWorld();
}

function asVector(arrow) {
  let target = v(0,0,1); arrow.arrowShaft.localToWorld(target);
  let shaftLength = target.length();
  if (shaftLength <= 0.1 && !arrow.visible) shaftLength *= -1;
  target.multiplyScalar((shaftLength+0.1)/shaftLength);
  let origin = v(); arrow.getWorldPosition(origin);
  target.sub(origin);
  return target;
}

axis_a = newArrow('axis_a', 0xff0000, v(1,0,0)); // world X
scene.add(axis_a);

axis_b = newArrow('axis_b', 0xff0000, v(0,0,1)); // world Z
scene.add(axis_b);

dependents = new Map();
updates = new Map();

function changed(obj) {
  let deps = dependents.get(obj);
  if (deps) {
    let to_notify = [];
    deps.forEach(d => {
      let update = updates.get(d);
      if (update) {
        update(d);
        //log('Updated '+d.name);
        to_notify.push(d);
      }
    });
    to_notify.forEach(changed);
  }
}

a_x_b = newArrow('a_x_b', 0xffff00, v(0,-1,0));
scene.add(a_x_b);
dependents.set(axis_a, new Set([a_x_b]));
dependents.set(axis_b, new Set([a_x_b]));

updates.set(a_x_b, function(arr) {
  let a = asVector(axis_a);
  let b = asVector(axis_b);
  a.cross(b);
  pointArrow(arr, a);
});

a_p_b = newArrow('a_p_b', 0xff7700, v(1,0,1));
scene.add(a_p_b);
dependents.get(axis_a).add(a_p_b);
dependents.get(axis_b).add(a_p_b);

updates.set(a_p_b, function(arr) {
  let a = asVector(axis_a);
  let b = asVector(axis_b);
  pointArrow(arr, a.add(b));
});

axis_c = newArrow('axis_c', 0x00ff00);
arrowThickness(axis_c, 0.025);
scene.add(axis_c);
dependents.set(a_x_b, new Set([axis_c]));
dependents.set(a_p_b, new Set([axis_c]));

c_path_vertices = [];
c_path = undefined;

updates.set(axis_c, function(arr) {
  let x = asVector(a_x_b);
  let p = asVector(a_p_b);
  x.add(p);
  pointArrow(arr, x.multiplyScalar(0.5));

  // Trace path
  if (c_path_vertices.length < 80) {
    let prev = final(c_path_vertices);
    if (prev !== undefined) {
      prev = v(...prev);
      if (prev.distanceTo(x) < 0.04) return;
    }
    c_path_vertices.push([x.x, x.y, x.z]);
  } else if (c_path === undefined) {
    c_path = new e3.Points(
      new e3.BufferGeometry().setAttribute('position',
        new e3.Float32BufferAttribute(c_path_vertices.flat(), 3),
      ),
      new e3.PointsMaterial({ color: 0x00ff00, size: 0.025 }),
    );
    scene.add(c_path);
  }
});

naxis_c = newArrow('naxis_c', 0x0000ff);
scene.add(naxis_c);
dependents.set(axis_c, new Set([naxis_c]));

updates.set(naxis_c, function(arr) {
  let c = asVector(axis_c);
  pointArrow(arr, c.normalize());
});

viz = degs => changed(axis_b, pointArrow(axis_b, xtoz(deg(-degs))));

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

doAnimate = true;
degPerS = 45;
lastTimeMs = undefined;
angle = 0;
tick = deltaS => { viz(angle); angle += degPerS * deltaS; angle = angle % 360; };

function r() {
  let timeMs = performance.now();
  if (lastTimeMs === undefined) lastTimeMs = timeMs;
  if (doAnimate) {
    //log('t', (timeMs - lastTimeMs) * 1e-3);
    //log('a', angle);
    tick((timeMs - lastTimeMs) * 1e-3);
    lastTimeMs = timeMs;
    requestAnimationFrame(r);
  } else lastTimeMs = undefined;

  renderer.render(scene, camera);
}

requestAnimationFrame(r);
