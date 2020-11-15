// ### UTILITIES

log = (...args) => { console.log(...args); return args ? args[0] : undefined };
final = arr => arr[arr.length-1]
e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
deg = degs => turn(degs/360);
xtoz = angle => v(Math.cos(angle), 0, Math.sin(angle));

// ### THREE.JS SETUP

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

// ### GROUND PLANE

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

// ### ARROW MANAGEMENT

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

// ### CHANGE TRACKING

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

// ### ANGLES AND AXES SETUP

angle_a = [deg(90)];
angle_b = [deg(90)];
s_a2 = [Math.sin(angle_a[0]/2)];
s_b2 = [Math.sin(angle_b[0]/2)];
c_a2 = [Math.cos(angle_a[0]/2)];
c_b2 = [Math.cos(angle_b[0]/2)];

dependents.set(angle_a, new Set([s_a2, c_a2]));
dependents.set(angle_b, new Set([s_b2, c_b2]));

updates.set(s_a2, function(angle) {
  angle[0] = Math.sin(angle_a[0]/2);
});
updates.set(s_b2, function(angle) {
  angle[0] = Math.sin(angle_b[0]/2);
});
updates.set(c_a2, function(angle) {
  angle[0] = Math.cos(angle_a[0]/2);
});
updates.set(c_b2, function(angle) {
  angle[0] = Math.cos(angle_b[0]/2);
});

axis_a = newArrow('axis_a', 0xff0000, v(s_a2[0],0,0)); // world X
scene.add(axis_a);
dependents.set(s_a2, new Set([axis_a]));

updates.set(axis_a, function(arr) {
  arrowLength(arr, s_a2[0]);
});

axis_b = newArrow('axis_b', 0xff0000, v(0,0,s_b2[0])); // world Z
scene.add(axis_b);
dependents.set(s_b2, new Set([axis_b]));

updates.set(axis_b, function(arr) {
  arrowLength(arr, s_b2[0]);
});

a_x_b = newArrow('a_x_b', 0xffff00, v(0,-s_a2[0]*s_b2[0],0));
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
dependents.set(c_a2, new Set([a_p_b]));
dependents.set(c_b2, new Set([a_p_b]));

// ### PATH TRACING

paths = {};

updates.set(a_p_b, function(arr) {
  let a = asVector(axis_a).multiplyScalar(c_b2);
  let b = asVector(axis_b).multiplyScalar(c_a2);
  pointArrow(arr, a.add(b));
  tracePath('p_path', a, 0xff7700, 120);
});

function tracePath(name, currPos, color, pathLen) {
  if (paths[name] === undefined) paths[name] = [];
  let vertices = paths[name];
  if (vertices instanceof Array) { // if still adding vertices
    if (vertices.length < pathLen) {
      let prevPos = final(vertices);
      if (prevPos !== undefined) {
        prevPos = v(...prevPos);
        if (prevPos.distanceTo(currPos) < 0.04) return;
      }
      vertices.push([currPos.x, currPos.y, currPos.z]);
    } else {
      paths[name] = new e3.Points( // replace with Object3D
        new e3.BufferGeometry().setAttribute('position',
          new e3.Float32BufferAttribute(vertices.flat(), 3),
        ),
        new e3.PointsMaterial({ color, size: 0.025 }),
      );
      scene.add(paths[name]);
    }
  }
}

axis_c = newArrow('axis_c', 0x00ff00);
arrowThickness(axis_c, 0.025);
scene.add(axis_c);
dependents.set(a_x_b, new Set([axis_c]));
dependents.set(a_p_b, new Set([axis_c]));

updates.set(axis_c, function(arr) {
  let x = asVector(a_x_b);
  let p = asVector(a_p_b);
  x.add(p);
  pointArrow(arr, x);
  tracePath('c_path', x, 0x00ff00, 80);
});

naxis_c = newArrow('naxis_c', 0x0000ff);
scene.add(naxis_c);
dependents.set(axis_c, new Set([naxis_c]));

updates.set(naxis_c, function(arr) {
  let c = asVector(axis_c);
  pointArrow(arr, c.normalize());
  tracePath('path_nc', c, 0x0000ff, 80);
});

// ### SPHERE, CAMERA, LIGHTS

scene.add(newMesh('sphere', new e3.SphereBufferGeometry(1, 48, 48),
  { color: 0xaaaaaa, transparent: true, opacity: 0.3 }));

camera.position.set(1.5,1,1.5);
tmp = v(); mesh.sphere.getWorldPosition(tmp);
camera.lookAt(tmp);
camera.translateZ(0.3);

directionalLight = new e3.DirectionalLight(0xffffff, 1);
directionalLight.position.copy(v(1,1,-1));
scene.add(directionalLight);

ambientLight = new e3.AmbientLight(0x333333);
scene.add(ambientLight);

// ### ANIMATION

doAnimate = true;
degPerS = 45;
lastTimeMs = undefined;
angle = 0;

viz = degs => changed(axis_b, pointArrow(axis_b, xtoz(deg(-degs)).multiplyScalar(s_b2[0])));

function tick(deltaS) {
  viz(angle);
  tracePath('b_path', asVector(axis_b), 0xff0000, 120);
  angle += degPerS * deltaS;
  angle = angle % 360;
}

function retrace() {
  Object.entries(paths).forEach(([k,p]) => {
    if (!(p instanceof Array)) {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    }
    paths[k] = undefined;
  });
}

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
