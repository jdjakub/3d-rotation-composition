# 3d-rotation-composition
Visualising how 3D rotations compose!

![TwoRightAngles](TwoRightAngles.png)

Key:

* The **red** circle is the path traced by the second sin-half-rotation axis (`axis_b`) as it itself rotates. Thus the angle between `axis_b` and the fixed `axis_a` (also red) is changing over time.
* The **orange** vector is roughly the "a plus b" vector (`a_p_b`). *(Actually, it is cos-half-angle-b times `axis_a` + cos-half-angle-a times `axis_b`)*
* The **yellow** vector is the cross of `axis_a` and `axis_b`.
* The **blue** vector is the **composite axis** (a followed by b); it is the *normalised* green vector.
* The **green** vector is the sin-half-composite-angle composite-axis.

(I will explain more soon)
