e3 = THREE;
v = (...args) => new e3.Vector3(...args);
turn = frac => 2*Math.PI * frac;
deg = degs => turn(degs/360);

renderer = new e3.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth*.99, window.innerHeight*.99);
renderer.setPixelRatio(window.devicePixelRatio || 1);

scene = new e3.Scene();
camera = new THREE.PerspectiveCamera(75, // Field-of-view
                                     window.innerWidth / window.innerHeight, // Aspect
                                     0.0001, 1000); // Near / far plane distance
scene.add(camera);

pg = new e3.PlaneBufferGeometry();
pm = new e3.MeshLambertMaterial({ color: 0x33ff33, side: e3.DoubleSide });
plane = new e3.Mesh(pg, pm);
scene.add(plane);

plane.scale.set(10,10,10);
plane.rotateX(deg(-90));
plane.translateZ(-1);

lg = new e3.CylinderBufferGeometry();
lm = new e3.MeshLambertMaterial({ color: 0xff0000 });
line = new e3.Mesh(lg, lm);
scene.add(line);

line.rotateZ(deg(90));
line.scale.set(0.05, 0.9, 0.05);
line.translateY(0.5);

cg = new e3.ConeBufferGeometry();
cm = new e3.MeshLambertMaterial({ color: 0xff0000 });
cone = new e3.Mesh(cg, cm);
scene.add(cone);

cone.rotateZ(deg(90));
cone.scale.set(0.1, 0.1, 0.1);
cone.translateY(0.95);

geometry = new e3.SphereBufferGeometry(1, 32, 32);
material = new e3.MeshLambertMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });
sphere = new e3.Mesh(geometry, material);
scene.add(sphere);

camera.position.set(-1.5,1,-1.5);
tmp = v(); sphere.getWorldPosition(tmp);
camera.lookAt(tmp);

directionalLight = new e3.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);

ambientLight = new e3.AmbientLight(0x222222);
scene.add(ambientLight);

function r() {
  renderer.render(scene, camera);
}

r();
