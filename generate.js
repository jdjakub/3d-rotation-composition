log = (...args) => { console.log(...args); return args ? args[0] : undefined };
e3 = THREE;
v = (...args) => new e3.Vector3(...args);
unv = vec => [vec.x, vec.y, vec.x];
turn = frac => 2*Math.PI * frac;
inTurn = rads => rads / (2*Math.PI);
deg = degs => turn(degs/360);
inDeg = rads => Math.round(360 * inTurn(rads));
unsin2 = x => Math.asin(x) * 2; // Get angle from a mod-axis

let data = []; // a,b,g
let exampleData = {
  a: [], // a,t
  b: [], // a,b,g,t
  c: [], // a,b,g,t
};

const dAlpha = deg(60);//15);
const dBeta = deg(60);//15);
const dGamma = deg(60);//15);

let indices = [-1,-1,-1,-1];
function newAlpha() {
  data.push([]);
  exampleData.a.push([]);
  exampleData.b.push([]);
  exampleData.c.push([]);
  indices[0]++;
  indices[1] = -1;
  indices[2] = -1;
  indices[3] = -1;
}
function newBeta() {
  let iAlpha = indices[0];
  data[iAlpha].push([]);
  exampleData.b[iAlpha].push([]);
  exampleData.c[iAlpha].push([]);
  indices[1]++;
  indices[2] = -1;
  indices[3] = -1;
}
function newGamma() {
  let iAlpha = indices[0];
  let iBeta = indices[1];
  data[iAlpha][iBeta].push([]);
  exampleData.b[iAlpha][iBeta].push([]);
  exampleData.c[iAlpha][iBeta].push([]);
  indices[2]++;
  indices[3] = -1;
}
function newTheta(axis) {
  indices[3]++;
}

function declare(name, ...rest) {
  // Efficiently store computed values by parameters...
  let iAlpha = indices[0];
  let iBeta  = indices[1];
  let iGamma = indices[2];
  let iTheta = indices[3];

  if (name === 'example') {
    const [theta, axis, vec_result] = rest;
    const arr_result = unv(vec_result);
    let alpha_slice = exampleData[axis][iAlpha];
    let dest;

    if (axis === 'a') // axis a: parametrized only on alpha and theta
      dest = alpha_slice;
    else // axis b, c: depends on alpha, beta, gamma and theta
      dest = alpha_slice[iBeta][iGamma];

    dest[iTheta] = arr_result;
  } else {
    let [result] = rest;
    data[iAlpha][iBeta][iGamma][name] = typeof(result) === 'number' ? result : unv(result);
  }
}

const example_vec = v(1,1,0).normalize();
let q = new e3.Quaternion();

function rotateUpTo(vec, axis, axisName, angle) {
  if (angle === 0) return example_vec; // 0 int - careful...!

  const dTheta = angle/3;
  let vec_rotated = v();
  for (let theta = dTheta; theta <= angle; theta += dTheta) {
    newTheta(axis); log(`            θ (${axisName})`, inDeg(theta));
    q.setFromAxisAngle(axis, theta);
    vec_rotated.copy(vec).applyQuaternion(q);
    declare('example', theta, axisName, vec_rotated);
  }
  return vec_rotated;
}

// Alpha is the angle around the first axis, axis a.
for (let alpha = 0; alpha <= deg(180); alpha += dAlpha) {
  newAlpha(); log('α', inDeg(alpha));
  const c_a2 = Math.cos(alpha/2);
  const s_a2 = Math.sin(alpha/2);
  const axis_a = v(1,0,0);
  const maxis_a = v(s_a2,0,0);

  // Record the rotation path of example vector around axis a
  const example_rot_a = rotateUpTo(
    example_vec, axis_a, 'a', alpha
  );

  // Beta is the angle around the second axis, axis b.
  for (let beta = 0; beta <= deg(180); beta += dBeta) {
    newBeta(); log('  β', inDeg(beta));
    const c_b2 = Math.cos(beta/2);
    const s_b2 = Math.sin(beta/2);

    // Gamma is the angle between the two axes.
    for (let gamma = 0; gamma <= deg(180); gamma += dGamma) {
      newGamma(); log(`α ${inDeg(alpha)} β ${inDeg(beta)} γ`, inDeg(gamma));
      const decl = (name, value) => declare(name, value);
      const c_g = Math.cos(gamma);
      const s_g = Math.sin(gamma);
      const axis_b = v(c_g, 0, s_g);
      const maxis_b = v(s_b2*c_g, 0, s_b2*s_g);
      decl('maxis_b', maxis_b);

      // After rotating around axis a, record rotation path around axis b
      rotateUpTo(example_rot_a, axis_b, 'b', beta);

      let a_p_b = maxis_a.clone().multiplyScalar(c_b2);
      a_p_b.add(maxis_b.clone().multiplyScalar(c_a2));
      decl('a_p_b', a_p_b);

      const a_x_b = maxis_a.clone().cross(maxis_b);
      decl('a_x_b', a_x_b);

      const maxis_c = a_p_b.add(a_x_b);
      decl('maxis_c', maxis_c);

      const axis_c = maxis_c.clone().normalize();
      decl('axis_c', axis_c);

      const angle_c = unsin2(maxis_c.length());
      decl('angle_c', angle_c);

      indices[3] = 0; // nasty
      // Record rotation path around the composite axis
      rotateUpTo(example_vec, axis_c, 'c', angle_c);
    }
  }
}
