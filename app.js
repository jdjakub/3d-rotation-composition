// ### UTILITIES

log = (...args) => { console.log(...args); return args ? args[0] : undefined };
final = arr => arr[arr.length-1]
e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
inTurn = rads => rads / (2*Math.PI);
deg = degs => turn(degs/360);
inDeg = rads => 360 * inTurn(rads);
xtoz = angle => v(Math.cos(angle), 0, Math.sin(angle));
unsin2 = x => inDeg(Math.asin(x) * 2); // Get angle from a mod-axis

// ### SVG UTILITIES (from my OROM / Id work)
attr_single = (elem, key, val_or_func) => {
  let old;
  if (key === 'textContent') old = elem.textContent;
  else old = elem.getAttribute(key);

  let value = typeof(val_or_func) === 'function' ? val_or_func(old) : val_or_func;
  if (key === 'textContent') elem.textContent = value;
  else if (value !== undefined) elem.setAttribute(key, value);

  return old;
};

// e.g. attr(rect, {stroke_width: 5, stroke: 'red'})
//      attr(rect, 'stroke', 'red')
//      attr(rect, 'height', h => h+32)
//      attr(rect, {fill: 'orange', height: h => h+32})
attr = (elem, key_or_dict, val_or_nothing) => {
  if (typeof(key_or_dict) === 'string') {
    let key = key_or_dict;
    let value = val_or_nothing;
    return attr_single(elem, key, value);
  } else {
    let dict = key_or_dict;
    for (let [k,v_or_f] of Object.entries(dict)) {
      let key = k.replace('_','-');
      attr_single(elem, key, v_or_f);
    }
  }
}

nums = (arr) => arr.map(x => +x);
attrs = (el, ...keys) => keys.map(k => attr(el, k));
props = (o,  ...keys) => keys.map(k => o[k]);

create_element = (tag, attrs, parent, namespace) => {
  let elem = document.createElementNS(namespace, tag);
  if (attrs !== undefined) attr(elem, attrs);
  if (parent === undefined) parent = window.svg;
  parent.appendChild(elem);
  return elem;
};

// e.g. rect = svgel('rect', {x: 5, y: 5, width: 5, height: 5}, svg)
svgel = (tag, attrs, parent) => create_element(tag, attrs, parent, 'http://www.w3.org/2000/svg');

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
  arrow.updateMatrixWorld();
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

// ### CHANGE PROPAGATION & MANAGEMENT

dependOutputs = new Map();
dependInputs = new Map();
function dependsOn(node, ...dependencies) {
  // Represent each relation node <-- dependency
  let dIns = dependInputs.get(node);
  if (dIns === undefined) {
    dIns = new Set();
    dependInputs.set(node, dIns);
  }
  dependencies.forEach(d => dIns.add(d));

  // Represent each relation dependency --> node
  dependencies.forEach(d => {
    let dOuts = dependOutputs.get(d);
    if (dOuts === undefined) {
      dOuts = new Set();
      dependOutputs.set(d, dOuts);
    }
    dOuts.add(node);
  });
}

function feedsInto(dependency, ...nodes) {
  nodes.forEach(n => dependsOn(n, dependency));
}

updates = new Map(); // Registry of per-node update functions

// Builds up a copy of the sub-DAG rooted at `node`
function discoverInputsFrom(node, scratchInputs) {
  let outs = dependOutputs.get(node);
  if (outs) outs.forEach(out => {
    sInps = scratchInputs.get(out);
    if (sInps === undefined) {
      sInps = new Set();
      scratchInputs.set(out, sInps);
    }
    sInps.add(node);
    // depth-first traversal
    discoverInputsFrom(out, scratchInputs);
  });
}

function changed(obj) {
  let scratchInputs = new Map(); // Disposable subset of the "inputs" relation
  discoverInputsFrom(obj, scratchInputs);
  traverseAndUpdateFrom(scratchInputs)(obj);
}

// Propagates changes, making sure to only call each node's update() once
let traverseAndUpdateFrom = scratchInputs => obj => {
  let outs = dependOutputs.get(obj); // Who depends on me as input?
  if (outs) {
    let toNotify = []; // Whom to recurse on at the end
    outs.forEach(out => { // In addition to me, it might depend on others
      let sInps = scratchInputs.get(out);
      if (sInps.size > 1) { // If there are other inputs remaining...
        sInps.delete(obj); // remove ourselves from consideration
        return; // and eventually the final input can trigger the update
      }
      // Otherwise ... we can finally update the node - ONCE!

      let update = updates.get(out);
      if (update) {
        update(out);
        //log('Updated '+out.name);
        toNotify.push(out);
      }
    });
    // recurse on the nodes that were updated
    toNotify.forEach(traverseAndUpdateFrom(scratchInputs));
  }
};

// ### ANGLES AND AXES SETUP

angle_a = [deg(90), 'angle_a'];
angle_b = [deg(90), 'angle_b'];
s_a2 = [Math.sin(angle_a[0]/2), 's_a2'];
s_b2 = [Math.sin(angle_b[0]/2), 's_b2'];
c_a2 = [Math.cos(angle_a[0]/2), 'c_a2'];
c_b2 = [Math.cos(angle_b[0]/2), 'c_b2'];

feedsInto(angle_a, s_a2, c_a2);
feedsInto(angle_b, s_b2, c_b2);

updates.set(s_a2, function(sine) {
  sine[0] = Math.sin(angle_a[0]/2);
});
updates.set(s_b2, function(sine) {
  sine[0] = Math.sin(angle_b[0]/2);
});
updates.set(c_a2, function(cosine) {
  cosine[0] = Math.cos(angle_a[0]/2);
});
updates.set(c_b2, function(cosine) {
  cosine[0] = Math.cos(angle_b[0]/2);
});

axis_a = newArrow('axis_a', 0xff0000, v(s_a2[0],0,0)); // world X
scene.add(axis_a);
feedsInto(s_a2, axis_a);

updates.set(axis_a, function(arr) {
  arrowLength(arr, s_a2[0]);
});

axis_b = newArrow('axis_b', 0xff0000, v(0,0,s_b2[0])); // world Z
scene.add(axis_b);
feedsInto(s_b2, axis_b);

updates.set(axis_b, function(arr) {
  arrowLength(arr, s_b2[0]);
});

a_x_b = newArrow('a_x_b', 0xffff00, v(0,-s_a2[0]*s_b2[0],0));
scene.add(a_x_b);
dependsOn(a_x_b, axis_a, axis_b);

updates.set(a_x_b, function(arr) {
  let a = asVector(axis_a);
  let b = asVector(axis_b);
  a.cross(b);
  pointArrow(arr, a);
});

a_p_b = newArrow('a_p_b', 0xff7700, v(1,0,1));
scene.add(a_p_b);
dependsOn(a_p_b, axis_a, axis_b, c_a2, c_b2);

// ### INDEPENDENTLY VARIABLE ANGLES UI

svg = document.getElementById('angle-controls');
gls = document.getElementById('gridlines');
egls = document.getElementById('emph-gridlines');
const GRANULARITY = 12;
for (let i=1; i<GRANULARITY; i++) {
  let g = i % 4 === 0 ? egls : gls;
  // neg vertical
  svgel('line', { x1: -i/GRANULARITY, x2: -i/GRANULARITY, y1: -1, y2: +1 }, g);
  // neg horizontal
  svgel('line', { y1: -i/GRANULARITY, y2: -i/GRANULARITY, x1: -1, x2: +1 }, g);
  // pos vertical
  svgel('line', { x1: i/GRANULARITY, x2: i/GRANULARITY, y1: -1, y2: +1 }, g);
  // pos horizontal
  svgel('line', { y1: i/GRANULARITY, y2: i/GRANULARITY, x1: -1, x2: +1 }, g);
}

angleMarker = document.getElementById('curr-angles');
gridPosition = [[6,6]]; // Goddamn initial conditions setup!
feedsInto(gridPosition, angle_a, angle_b);
updates.set(angle_a, function(angle) {
  angle[0] = gridPosition[0][0] * Math.PI / GRANULARITY;
});
updates.set(angle_b, function(angle) {
  angle[0] = gridPosition[0][1] * Math.PI / GRANULARITY;
});

function angles(a,b) {
  if (a > 180) a -= 360;
  if (b > 180) b -= 360;
  a *= GRANULARITY/180;
  b *= GRANULARITY/180;
  a = Math.round(a); b = Math.round(b); // Snap to grid
  changed(gridPosition, gridPosition[0] = [a,b]);
}

svg.onclick = e => {
  let r = svg.getBoundingClientRect();
  let [halfW, halfH] = [r.width/2, r.height/2];
  let pos = v(e.clientX, e.clientY, 0);
  let center = v(r.left+r.right, r.top+r.bottom, 0).multiplyScalar(0.5);
  pos.sub(center); // from center
  pos.multiply(v(GRANULARITY/halfW, -GRANULARITY/halfH, 0)); // in (-12, +12) with Y up
  pos.x = Math.round(pos.x); pos.y = Math.round(pos.y); // snap to grid
  changed(gridPosition, gridPosition[0] = [pos.x, pos.y]);
};

const KEY_TO_DIR = {
  q: [-1,+1], w: [ 0,+1], e:[+1,+1],
  a: [-1, 0], s: [ 0,-1], d:[+1, 0],
  z: [-1,-1], x: [ 0,-1], c:[+1,-1]
};
document.body.onkeydown = ({key}) => {
  key = key.toLowerCase();
  let dir = KEY_TO_DIR[key];
  if (dir !== undefined) {
    let currPos = gridPosition[0];
    let newPos = [currPos[0]+dir[0], currPos[1]+dir[1]];
    changed(gridPosition, gridPosition[0] = newPos);
  }
};

feedsInto(gridPosition, angleMarker);
updates.set(angleMarker, function(circ) {
  attr(angleMarker, {
    cx: gridPosition[0][0] / GRANULARITY,
    cy: gridPosition[0][1] / GRANULARITY,
  });
});

// ### PATH TRACING

pathMaterials = {};
paths = [];
for (let i=0; i<2*GRANULARITY+1; i++) {
  paths[i] = []; // Row for angle a = (i-GRANULARITY)th value in grid
  for (let j=0; j<2*GRANULARITY+1; j++)
    paths[i][j] = {paths: {}}; // Col for angle b = (j-GRANULARITY)th value in grid
}
PATH_LENGTH = 100;

currPathSet = [ paths[gridPosition[0][0]][gridPosition[0][1]].paths ];
feedsInto(gridPosition, currPathSet);
updates.set(currPathSet, function() {
  Object.entries(currPathSet[0]).forEach(([k,p]) => {
    scene.remove(p);
  });
  currPathSet[0] = paths[gridPosition[0][0]][gridPosition[0][1]].paths;
});

updates.set(a_p_b, function(arr) {
  let a = asVector(axis_a).multiplyScalar(c_b2[0]);
  let b = asVector(axis_b).multiplyScalar(c_a2[0]);
  pointArrow(arr, a.add(b));
  tracePath('p_path', a, 0xff7700, PATH_LENGTH);
});

function tracePath(name, currPos, color, pathLen) {
  let activePaths = paths[gridPosition[0][0]][gridPosition[0][1]].paths;
  let path = activePaths[name];
  if (path === undefined) {
    let mat = pathMaterials[color];
    if (mat === undefined)
      pathMaterials[color] = mat = new e3.PointsMaterial({ color, size: 0.025 });

    activePaths[name] = path = new e3.Points(
      new e3.BufferGeometry().setAttribute('position',
        new e3.BufferAttribute(
          new Float32Array(pathLen*3), 3
        ).setUsage(e3.DynamicDrawUsage)
      ), mat);
    path.geometry.setDrawRange(0, 0);
    path.angleAtStart = interAxisAngle;
    path.prevAngleValue = 0;
    path.finishedTrace = false;
  }
  if (path.parent !== scene) {
    scene.add(path);
  }

  if (path.finishedTrace) return;

  // Figure out whether we've covered a full turn from when we started tracing
  let angleSoFar = (interAxisAngle-path.angleAtStart + 360) % 360;
  if (angleSoFar < path.prevAngleValue) {
    path.finishedTrace = true;
  } else
    path.prevAngleValue = angleSoFar;

  // Fill in geometry
  let geom = path.geometry;
  let currPathLen = geom.drawRange.count;
  let ps = geom.getAttribute('position');

  if (currPathLen < pathLen) {

    let cpl1 = currPathLen-1;
    if (currPathLen > 0) {
      let prevPos = v(ps.getX(cpl1), ps.getY(cpl1), ps.getZ(cpl1));
      if (prevPos.distanceTo(currPos) < 0.04) return;
    }
    ps.setXYZ(currPathLen, currPos.x, currPos.y, currPos.z);
    ps.needsUpdate = true;
    ps.updateRange = { offset: currPathLen*3, count: 3 };
    geom.setDrawRange(0, currPathLen+1);
  }
}

axis_c = newArrow('axis_c', 0x00ff00);
arrowThickness(axis_c, 0.025);
scene.add(axis_c);
dependsOn(axis_c, a_x_b, a_p_b);

updates.set(axis_c, function(arr) {
  let x = asVector(a_x_b);
  let p = asVector(a_p_b);
  x.add(p);
  pointArrow(arr, x);
  tracePath('c_path', x, 0x00ff00, PATH_LENGTH);
});

naxis_c = newArrow('naxis_c', 0x0000ff);
scene.add(naxis_c);
feedsInto(axis_c, naxis_c);

updates.set(naxis_c, function(arr) {
  let c = asVector(axis_c);
  pointArrow(arr, c.normalize());
  tracePath('path_nc', c, 0x0000ff, PATH_LENGTH);
});

// ### SPHERE, CAMERA, LIGHTS

scene.add(newMesh('sphere', new e3.SphereBufferGeometry(1, 48, 48),
  { color: 0xaaaaaa, transparent: true, opacity: 0.3 }));

camera.position.set(1.25,1,1.25);
tmp = v(); mesh.sphere.getWorldPosition(tmp);
camera.lookAt(tmp);

directionalLight = new e3.DirectionalLight(0xffffff, 1);
directionalLight.position.copy(v(1,1,-1));
scene.add(directionalLight);

ambientLight = new e3.AmbientLight(0x333333);
scene.add(ambientLight);

// ### ANIMATION

animating = true;
degPerS = 90;
lastTimeMs = undefined;
interAxisAngle = 0;

viz = degs => changed(axis_b, pointArrow(axis_b, xtoz(deg(-degs)).multiplyScalar(s_b2[0])));

function tick(deltaS) {
  viz(interAxisAngle);
  tracePath('b_path', asVector(axis_b), 0xff0000, PATH_LENGTH);
  interAxisAngle += degPerS * deltaS;
  interAxisAngle = interAxisAngle % 360;
}

function r() {
  let timeMs = performance.now();
  if (lastTimeMs === undefined) lastTimeMs = timeMs;
  if (animating) {
    //if (timeMs - lastTimeMs > 1000) {
      //log('t', (timeMs - lastTimeMs) * 1e-3);
      //log('a', interAxisAngle);
      tick((timeMs - lastTimeMs) * 1e-3);
      lastTimeMs = timeMs;
    //}
    requestAnimationFrame(r);
  } else lastTimeMs = undefined;

  renderer.render(scene, camera);
}

requestAnimationFrame(r);

function toggleAnimate() {
  if (!animating) {
    requestAnimationFrame(r);
  }
  animating = !animating;
}
