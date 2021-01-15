/* Metadata in file format to avoid hardcoded numbers in app.js

e.g. in the example-b example in generate.js, the very first float is interpreted thus:
- Alpha slices first. First alpha value. Alpha is [0 .. 180] degrees. So here
  alpha = 0 degrees.
- Beta slices second. First beta value. Beta is [0 .. 180] degrees. So here
  beta = 0 degrees.
- Gamma slices third. First gamma value. Gamma is [0 .. 180] degrees. So here
  gamma = 0 degrees.
- Theta slices fourth. First theta value. Theta is [0 .. alpha] ie 0 degrees.
- Vertex slices fifth. First vertex. Each vertex is three floats, x y z. Thus
  this float is the x. unit X is synonymous with the alpha axis i.e. axis 1.

Too easy. Say, for 0-based float index 123:
- Which vector component? 123 = 41*3 + 0, and 0 => x = v.axis1
- Which vector? 41
- Which theta-group? 3 theta in group => 41 = 13*3 + 2, so it's theta 2 of
  group 13; meaning depends on alpha (say)
- Which gamma-group? 3 gamma in group => 13 = 4*3 + 1, so it's gamma 1 of
  group 4; gamma is [0..180]deg, 3 in group => 90 degrees
- Which beta-group? 3 beta in group => 4 = 1*3 + 1, so it's beta 1 of group 1;
  beta is [0..180]deg, 3 in group => 90 degrees
- Only one alpha-group 'cos top-level. So, which alpha? 3 beta-groups per alpha
  so 1 = 0*3 + 1 so it's alpha value 0, ie 0 degrees, giving meaning to theta

Turn into Kaitai struct format?
*/

class ParamSchema {
  constructor(spec) {
    Object.assign(this, spec);
    this.blockSize = spec.howMany;
    this.howMany = undefined;
    if (this.blockSize === undefined)
      this.blockSize = this.maxValue+1 - this.minValue;
  }

  factorIndex(i) { // bottom up
    // Goal: factor i as i = j*L + n, where L is the length of blocks at this
    // index level, j is the new index passed up, and n identifies the value of
    // the parameter.
    const L = this.blockSize;

    const j = Math.floor(i / L);
    const n = i % L;

    return { blockIndex: j, paramIndex: n };
  }

  resolveValues(params) {
    // If minValue or maxValue is a string referring to a param e.g. 'alpha'
    // then resolve it to the actual value of the param
    if (typeof this.minValue === 'string') // e.g. 'alpha' (current value thereof)
      this.minValue = params[this.minValue].value;

    if (typeof this.maxValue === 'string') // e.g. 'alpha' (current value thereof)
      this.maxValue = params[this.maxValue].value;
  }
}

class NestedSchemas {
  constructor(list) {
    this.list = list;
    this.byName = {};
    list.forEach(schema => { this.byName[schema.name] = schema; });
  }

  interpretIndex(index) {
    let params = {};

    this.list.slice().reverse().forEach(schema => {
      const {blockIndex, paramIndex} = schema.factorIndex(index);
      params[schema.name] = { index: paramIndex };
      index = blockIndex;
    });

    this.list.forEach(schema => this.interpretParam(schema.name, params));

    return params;
  }

  interpretParam(name, params) { // top down
    let thisParam = params[name];
    let thisSchema = this.byName[name];
    // Goal: figure out what value thisParam.index represents.
    const L = thisSchema.blockSize;
    if (L === undefined)
      thisParam.value = thisParam.index; // By default, value = index
    else {
      thisSchema.resolveValues(params);
      // f(0) = min, f(L-1) = max, f(x) = x*(max-min)/(L-1) + min
      let interpolateParam = (min, x, max) => x * (max-min) / (L-1) + min;
      thisParam.value = interpolateParam(
        thisSchema.minValue, thisParam.index, thisSchema.maxValue
      );
    }
  }

  // ((a1 * b2 + b1) * c2 + c1) * d2 + d1 ...
  paramsToIndex(params) {
    return this.list.reduce((acc, schema) => {
      let p = params[schema.name];
      return acc * schema.blockSize + p.index;
    }, 0);
  }
}

exampleSchemas = new NestedSchemas([{
  name: 'alpha',
  desc: 'angle around axis A',
  howMany: 3, minValue: 0, maxValue: 180, units: 'deg',
}, {
  name: 'beta',
  desc: 'angle around axis 2',
  howMany: 4, minValue: 0, maxValue: 180, units: 'deg',
}, {
  name: 'gamma',
  desc: 'angle between axis 1 and axis 2',
  howMany: 5, minValue: 0, maxValue: 180, units: 'deg',
}, {
  name: 'theta',
  desc: 'angle from 0 to alpha',
  howMany: 7, minValue: 0, maxValue: 'alpha', units: 'deg'
}, {
  name: 'vectorComponent',
  desc: "0=x (projection onto axis A)\n" +
        "1=y (projection onto Y axis, orthonormal to axis A and the Z axis)\n" +
        "2=z (projection onto Z axis, where gamma = 90deg)",
  minValue: 0, maxValue: 2
}].map(s => new ParamSchema(s)));

exampleParams = exampleSchemas.interpretIndex(234);
console.log(exampleParams);

/*
components: 234 = 78 * 3 + 0 => x
theta: 78 = 11 * 7 + 1 =>
gamma: 11 = 2 * 5 + 1 => 36 deg
beta: 2 = 0 * 4 + 2 => 120 deg
alpha: 0 => 0
*/

console.log(exampleSchemas.paramsToIndex(exampleParams));
