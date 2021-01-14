log = (...args) => { console.log(...args); return args ? args[0] : undefined };
e3 = THREE;
v = (...args) => new e3.Vector3(...args);
unv = vec => [vec.x, vec.y, vec.z];
turn = frac => 2*Math.PI * frac;
inTurn = rads => rads / (2*Math.PI);
deg = degs => turn(degs/360);
inDeg = rads => Math.round(360 * inTurn(rads));

let data = {};

// 0, 60, 120, 180 deg
const max_iAlpha = 12;
const max_iBeta  = 12
const max_iGamma = 24;
const max_iTheta = 12;

const num_iAlpha = max_iAlpha+1;
const num_iBeta  = max_iBeta+1;
const num_iGamma = max_iGamma+1;
const num_iTheta = max_iTheta+1;

let indices = [0,0,0,0]; // alpha, beta, gamma, theta

function lazy(obj, key, defaultVal) {
  if (obj[key] === undefined) obj[key] = defaultVal;
  return obj[key];
}

function declare(name, ...rest) {
  // Efficiently store computed values by parameters...
  let iAlpha = indices[0];
  let iBeta  = indices[1];
  let iGamma = indices[2];
  let iTheta = indices[3];

  if (name === 'example') {
    const [axis, vec_result] = rest;
    const arr_result = unv(vec_result);
    let root = lazy(data, name, {});
    let alpha_slice = lazy(lazy(root, axis, []), iAlpha, []);
    let dest;

    if (axis === 'a') // axis a: parametrized only on alpha and theta
      dest = alpha_slice;
    else // axis b, c: depends on alpha, beta, gamma and theta
      dest = lazy(lazy(alpha_slice, iBeta, []), iGamma, []);

    dest[iTheta] = arr_result;
  } else {
    let [result] = rest;
    let root = lazy(data, name, []);
    lazy(lazy(root, iAlpha, []), iBeta, [])[iGamma] =
      typeof(result) === 'number' ? result : unv(result);
  }
}

// Returns [vertex number of 1st vertex, count of vertices]
function getDrawRange(obj, iAlpha, iBeta, iGamma) {
  if (obj === data.example.a) {
    return [iAlpha * num_iTheta, num_iTheta];
  } else if (obj === data.example.b || obj === data.example.c) {
    return [ ((iAlpha * num_iBeta + iBeta) * num_iGamma + iGamma) * num_iTheta, num_iTheta ];
  } else {
    return [ (iAlpha * num_iBeta + iBeta) * num_iGamma, num_iGamma ];
  }
}

function exportData(objPath) {
  objPath = objPath.split('.');
  let o = data;
  objPath.forEach(key => {o = o[key]});
  const filename = objPath.join('-') + '.dat';

  let f32arr = new Float32Array(o.flat(4));
  download(f32arr, filename, 'application/octet-stream');
}

/*
EXAMPLE-A.DAT
α is the angle to rotate around the first rotation axis.
This axis is special in that it stays in the same place and doesn't change.

θ is the angle so far. As we gradually go from 0 to α around axis A,
we sample the coordinates at angle θ, forming a visible rotation path.

For each value of α, there are num_iTheta samples of θ.

As there are just 2 parameters here it's straightforward to flatten:
e.g. num α = 13 = num θ

  α | θ) 0  1  2  3  4  5  6  7  8  9 10 11 12
----|-----------------------------------------
  0 | 0*13 01 02 03 04 05 06 07 08 09 10 11 12
  1 | 1*13 14 15 16 17 18 19 20 21 22 23 24 25
  α | α*13 +1 +2 +3 ...      +θ

So in general, entry α,θ lives at index α*num_iTheta + θ
And index i represents α: floor(i/num_iTheta), θ: i % num_iTheta

EXAMPLE-{B,C}.DAT
β is the angle to rotate around axis 2 (hence we depend on γ, the inter-axis
angle), after already rotating around axis 1 (hence we depend on α).

As before, θ ticks along from 0 to β. But since α and β are selected via the UI
grid, while γ changes over time, order them as α, β, γ, θ.

So for each γ within a β within an α, there are num_iTheta θ samples.
For each β within an α, there are num_iGamma γ values, thus
num_iGamma*num_iTheta θ samples. etc.

αβγθ
e.g. num α = num β = num γ = num θ = 3

 α | β | γ | θ) 0  1  2
---|---|---|-----------
 0 | 0 | 0 |   00 01 02 | | | 3 θs per γ
 0 | 0 | 1 |   03 04 05 | |
 0 | 0 | 2 |   06 07 08 | | 9 = 3*3 θs per β
 0 | 1 | 0 |   09 10 11 |
 0 | 1 | 1 |   12 13 14 |
 0 | 1 | 2 |   15 16 17 |
 0 | 2 | 0 |   18 19 20 |
 0 | 2 | 1 |   21 22 23 |
 0 | 2 | 2 |   24 25 26 | 27 = 3*3*3 θs per α
 α | β | γ | 27α + 9β + 3γ + θ
           = 3(3(3α + β) + γ) + θ

So the index of α, β, γ, θ is
((α * num_iBeta + β) * num_iGamma + γ) * num_iTheta + θ
or
α * num_iBeta * num_iGamma * num_iTheta
          + β * num_iGamma * num_iTheta
                       + γ * num_iTheta
                                    + θ
And index i represents ... er... TBA
*/

// The Example Vector is rotated in order to concretely visualize the
// rotation paths around the first, second and composite axes.
const example_vec = v(1,1,0).normalize();
let q = new e3.Quaternion();

function rotateUpTo(vec, axis, axisName, angle) {
  const dTheta = angle/max_iTheta;
  let vec_rotated = vec.clone();
  for (indices[3] = 0; indices[3] <= max_iTheta; indices[3]++) {
    const theta = indices[3] * dTheta;
    log(`            θ (${axisName})`, inDeg(theta));
    q.setFromAxisAngle(axis, theta);
    vec_rotated.copy(vec).applyQuaternion(q);
    declare('example', axisName, vec_rotated);
  }
  return vec_rotated;
}

function rotate(vec, axis, angle) {
  let vec_rotated = vec.clone();
  q.setFromAxisAngle(axis, angle);
  vec_rotated.applyQuaternion(q);
  return vec_rotated;
}

// Alpha is the angle around the first axis, axis a.
for (indices[0] = 0; indices[0] <= max_iAlpha; indices[0]++) {
  const iAlpha = indices[0];
  const dAlpha = deg(180) / max_iAlpha;
  const alpha = iAlpha * dAlpha;
  log('α', inDeg(alpha));

  const c_a2 = Math.cos(alpha/2);
  const s_a2 = Math.sin(alpha/2);
  const axis_a = v(1,0,0);
  const maxis_a = v(s_a2,0,0);

  // Record the rotation path of example vector around axis a
  /*const example_rot_a = rotateUpTo(
    example_vec, axis_a, 'a', alpha
  );*/
  const example_rot_a = rotate(example_vec, axis_a, alpha);

  // Beta is the angle around the second axis, axis b.
  for (indices[1] = 0; indices[1] <= max_iBeta; indices[1]++) {
    const iBeta = indices[1];
    const dBeta = deg(180) / max_iBeta;
    const beta = iBeta * dBeta;
    log('  β', inDeg(beta));

    const c_b2 = Math.cos(beta/2);
    const s_b2 = Math.sin(beta/2);

    // Gamma is the angle between the two axes.
    for (indices[2] = 0; indices[2] <= max_iGamma; indices[2]++) {
      const iGamma = indices[2];
      const dGamma = deg(360) / max_iGamma;
      const gamma = iGamma * dGamma;
      log(`α ${inDeg(alpha)} β ${inDeg(beta)} γ`, inDeg(gamma));

      const decl = (name, value) => declare(name, value);
      const c_g = Math.cos(gamma);
      const s_g = Math.sin(gamma);
      const axis_b = v(c_g, 0, s_g);
      const maxis_b = v(s_b2*c_g, 0, s_b2*s_g);
      //decl('maxis_b', maxis_b);

      // After rotating around axis a, record rotation path around axis b
      //rotateUpTo(example_rot_a, axis_b, 'b', beta);
      const example_rot_ab = rotate(example_rot_a, axis_b, beta);

      // c(a/2) maxis_b + c(b/2) maxis_a
      let a_p_b = maxis_a.clone().multiplyScalar(c_b2);
      a_p_b.add(maxis_b.clone().multiplyScalar(c_a2));
      //decl('a_p_b', a_p_b);

      const a_x_b = maxis_a.clone().cross(maxis_b);
      a_x_b.negate(); // WHY is this necessary so that rot C = rot A then B !?
      // There's some ugly convention lurking somewhere here, I can smell it...
      // The Math Formula says that A then B maxis is (...) + a x b
      // Yet to make it WORK here it appears we need (...) + b x a
      // which would APPEAR to represent B then A rotation. Grrrrr
      //decl('a_x_b', a_x_b);

      // maxis_(a then b) = cos(a/2)maxis_b + cos(b/2)maxis_a + maxis_a x maxis_b
      // ... is how 3D rotations are *supposed* to compose
      const maxis_c = a_p_b.add(a_x_b);
      //decl('maxis_c', maxis_c);

      const axis_c = maxis_c.clone().normalize();
      //decl('axis_c', axis_c);

      const s_c2 = maxis_c.length();
      const c_c2 = c_a2 * c_b2 - s_a2 * s_b2 * c_g;
      const angle_c = 2 * Math.atan2(s_c2, c_c2);
      //decl('angle_c', angle_c);

      // Record rotation path around the composite axis
      const example_rot_c = rotateUpTo(example_vec, axis_c, 'c', angle_c);

      const diff = example_rot_c.clone();
      diff.sub(example_rot_ab);

      if (diff.length() >= 1) { // assertion that rot A then B = rot C
        throw [example_rot_c, example_rot_ab, diff];
      }
    }
  }
}
