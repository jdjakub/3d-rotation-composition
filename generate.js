e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
deg = degs => turn(degs/360);
unsin2 = x => Math.asin(x) * 2; // Get angle from a mod-axis

function declare() {
  // Efficiently store computed values by parameters...
}

const example_vec = v(1,1,0).normalize();
let q = new e3.Quaternion();

function rotateExampleUpTo(axis, angle) {
  const dTheta = angle/12;
  for (let theta = dTheta; theta <= angle; theta += dTheta) {
    q.setFromAxisAngle(axis, theta);
    let example_rotated = example_vec.clone().applyQuaternion(q);
    declare('example', axis, theta, example_rotated);
  }
}

// Alpha is the angle around the first axis, axis a.
for (let alpha = 0; alpha <= deg(180); alpha += deg(15)) {
  const c_a2 = Math.cos(alpha/2);
  const s_a2 = Math.sin(alpha/2);
  const axis_a = v(1,0,0);
  const maxis_a = v(s_a2,0,0);

  rotateExampleUpTo(axis_a, alpha);

  // Beta is the angle around the second axis, axis b.
  for (let beta = 0; beta <= deg(180); beta += deg(15)) {
    const c_b2 = Math.cos(beta/2);
    const s_b2 = Math.sin(beta/2);

    // Gamma is the angle between the two axes.
    for (let gamma = 0; gamma <= deg(180); gamma += deg(15)) {
      const decl = (name, value) => declare(name, alpha, beta, gamma, value);
      const c_g = Math.cos(gamma);
      const s_g = Math.sin(gamma);
      const axis_b = v(c_g, 0, s_g);
      const maxis_b = v(s_b2*c_g, 0, s_b2*s_g);
      decl('maxis_b', maxis_b);

      let a_p_b = maxis_a.copy().multiplyScalar(c_b2);
      a_p_b.add(maxis_b.copy().multiplyScalar(c_a2));
      decl('a_p_b', a_p_b);

      const a_x_b = maxis_a.copy().cross(maxis_b);
      decl('a_x_b', a_x_b);

      const maxis_c = a_p_b.add(a_x_b);
      decl('maxis_c', maxis_c);

      const axis_c = maxis_c.clone().normalize();
      decl('axis_c', axis_c);

      const angle_c = unsin2(maxis_c.length());
      decl('angle_c', angle_c);

      rotateExampleUpTo(axis_c, angle_c);

    }
  }
}
