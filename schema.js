/* Metadata in file format to avoid hardcoded numbers in app.js

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

e.g. in the example-b, the very first float is interpreted thus:
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
    this.blockSize = spec.howMany; // how many values of this param are there?
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

  // Input format accepted from interpretParam ({alpha: {index: a1, value: ... }})
  // Also accepts manual shorthand ({alpha: aI, beta: bI, gamma: ... })
  // aI, bI etc = index; aS, bS etc = blockSize
  // -> ((aI * bS + bI) * cS + cI) * dS + dI ...
  paramsToIndex(params) {
    return this.list.reduce((acc, schema) => {
      let p = params[schema.name];
      if (p === undefined) return acc;
      const i = typeof p === 'number' ? p : p.index;
      return acc * schema.blockSize + i;
    }, 0);
  }
}

const testing = false;

if (testing) {
  exampleSchemas = new NestedSchemas([{
    name: 'alpha',
    desc: 'angle around axis 1',
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
    desc: "0=x (projection onto axis 1)\n" +
          "1=y (projection onto Y axis, orthonormal to axis 1 and the Z axis)\n" +
          "2=z (projection onto Z axis, where gamma = 90deg)",
    minValue: 0, maxValue: 2
  }].map(s => new ParamSchema(s)));

  exampleParams = exampleSchemas.interpretIndex(234);
  console.log(exampleParams);

  /*
  components: 234 = 78 * 3 + 0 => x
  theta: 78 = 11 * 7 + 1 =>
  gamma: 11 = 2 * 5 + 1 => 45 deg
  beta: 2 = 0 * 4 + 2 => 120 deg
  alpha: 0 => 0
  */

  console.log(exampleSchemas.paramsToIndex(exampleParams));
}

/*
DATA FILE FORMAT:

  +---------------->-----------------+
  |                                  |
0 |    1   2   3   4   5   6   7     8    (all units in DWORDs i.e. 4 bytes)
+-|-+--------------------------------+------------------+
| 8 | '{"example": "jsonString"}   ' | <many floats...> |
+---+--------------------------------+------------------+
 ^    ^ JSON desc of float array (space-padded)  ^ 32-bit floats
 Offset of float array

*/
function makeFormatAndFloatsArray(json, floats) {
  let format = JSON.stringify(json); // JSON to str
  format = new TextEncoder('utf-8').encode(format); // str to bytes
  format.dwordLength = Math.ceil(format.byteLength / 4); // align to dwords
  const floatsDwordOffset = 1 + format.dwordLength

  const barr = new Uint8Array((floatsDwordOffset + floats.length)*4);
  const dv = new DataView(barr.buffer);
  dv.setUint32(0, floatsDwordOffset, true); // set first dword to floats offset

  dv.setUint32((floatsDwordOffset-1)*4, 0x20202020, true); // pad end spaces
  barr.set(format, 4); // write format bytes after first dword

  const farr = new Float32Array(barr.buffer, floatsDwordOffset*4);
  farr.set(floats); // dump float data right after

  return barr;
}

function getMeaningfulFloatArray(arrayBuf) {
  const barr = new Uint8Array(arrayBuf);
  const dv = new DataView(barr.buffer);
  const floatsDwordOffset = dv.getUint32(0, true);
  let schemas = barr.subarray(4, floatsDwordOffset*4); // as bytes
  schemas = new TextDecoder('utf-8').decode(schemas); // as str
  schemas = JSON.parse(schemas); // as JSON
  schemas = new NestedSchemas(schemas.nested.map(s => new ParamSchema(s)));

  const farr = new Float32Array(barr.buffer, floatsDwordOffset*4);
  return [schemas, farr];
}
