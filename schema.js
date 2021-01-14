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

exampleSchemas = [{
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
}];

function interpretIndex(index, schemaList) {
  let schemas = {};
  let params = {};
  for (let i=schemaList.length-1; i>=0; i--) {
    let schema = schemaList[i];
    schemas[schema.name] = schema;
    let {blockIndex, paramIndex} = factorIndex(index, schema);
    params[schema.name] = { index: paramIndex };
    index = blockIndex;
  }

  for (let i=0; i<schemaList.length; i++) {
    let schema = schemaList[i];
    interpretParam(schema.name, params, schemas);
  }

  return params;
};

function factorIndex(i, schema) { // bottom up
  // Goal: factor i as i = j*L + n, where L is the length of blocks at this
  // index level, j is the new index passed up, and n identifies the value of
  // the parameter.
  let blockSize = schema.howMany; // L
  if (blockSize === undefined) blockSize = schema.maxValue - schema.minValue + 1;

  let j = Math.floor(i / blockSize);
  let n = i % blockSize;

  return { blockIndex: j, paramIndex: n };
}

function interpretParam(name, params, schemas) { // top down
  let thisParam = params[name];
  let thisSchema = schemas[name];
  // Goal: figure out what value thisParam.index represents.
  if (thisSchema.howMany === undefined)
    thisParam.value = thisParam.index; // By default, value = index
  else {
    let L = thisSchema.howMany;

    let minVal = thisSchema.minValue;
    if (typeof minVal === 'string') // e.g. 'alpha' (current value thereof)
      minVal = params[minVal].value;

    let maxVal = thisSchema.maxValue;
    if (typeof maxVal === 'string') // e.g. 'alpha' (current value thereof)
      maxVal = params[maxVal].value;

    // f(0) = min, f(L-1) = max, f(x) = x*(max-min)/(L-1) + min
    let interpolateParam = (min, x, max) => x * (max-min) / (L-1) + min;

    thisParam.value = interpolateParam(minVal, thisParam.index, maxVal);
  }
}

exampleParams = interpretIndex(234, exampleSchemas);
console.log(exampleParams);

/*
components: 234 = 78 * 3 + 0 => x
theta: 78 = 11 * 7 + 1 =>
gamma: 11 = 2 * 5 + 1 => 36 deg
beta: 2 = 0 * 4 + 2 => 120 deg
alpha: 0 => 0
*/

// ((a1 * b2 + b1) * c2 + c1) * d2 + d1 ...
function paramsToIndex(params, schemaList) {
  return schemaList.reduce((acc, schema) => {
    let p = params[schema.name];
    let blockSize = schema.howMany; // repeated from above - refactor!
    if (blockSize === undefined) blockSize = schema.maxValue - schema.minValue + 1;
    return acc * blockSize + p.index;
  }, 0);
}

console.log(paramsToIndex(exampleParams, exampleSchemas));
