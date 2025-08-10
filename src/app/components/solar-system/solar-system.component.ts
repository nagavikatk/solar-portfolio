// @ts-ignore: Suppress module not found error for 'three'
import * as THREE from 'three';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
// @ts-ignore: Suppress module not found error for 'three/examples/jsm/controls/OrbitControls'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// Import FBXLoader
// @ts-ignore
import { FBXLoader } from 'three-stdlib';

@Component({
  selector: 'app-solar-system',
  standalone: true,
  templateUrl: './solar-system.component.html',
  styleUrls: ['./solar-system.component.scss'],
  imports: [CommonModule],
})
export class SolarSystemComponent implements OnInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef<HTMLDivElement>;

  popupOpen = false;
  activePlanet: string | null = null;
  popupStyle: any = {};
  loading = true;

  private renderer: any;
  private scene: any;
  private camera: any;
  private animationId: any; 
  private controls: any;
  private planets: any[] = [];
  private planetData: any = {};
  private revolutionPaused = false;

  // Shooting stars
  private shootingStars: any[] = [];
  private shootingStarTimer = 0;
  private shootingStarInterval = 600 + Math.random() * 600; // 0.6s to 1.2s

  ngOnInit() {
    this.initThree();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.dispose?.();
    }
  }

  initThree() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Milky Way background sphere (vibrant, visible texture)
    const galaxyTexture = new THREE.TextureLoader().load('https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/images/eso0932a.jpg');
    const galaxyGeometry = new THREE.SphereGeometry(1000, 64, 64);
    const galaxyMaterial = new THREE.MeshBasicMaterial({ map: galaxyTexture, side: THREE.BackSide });
    const galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
    this.scene.add(galaxy);

    // Remove previous streakConfigs and streaks
    // Add Milky Way as a group of colored particles, denser in the XZ plane
    const milkyWayParticleCount = 60000; // 500% more points
    const milkyWayGeometry = new THREE.BufferGeometry();
    const milkyWayPositions = [];
    const milkyWayColors = [];
    const milkyWayColorPalette = [
      new THREE.Color('#fff'),
      new THREE.Color('#ffb6ff'), // light pink
      new THREE.Color('#d580ff'), // purple
      new THREE.Color('#a259ff'), // deep purple
      new THREE.Color('#b6b6ff'), // blueish
      new THREE.Color('#e0e7ff')  // pale blue
    ];
    for (let i = 0; i < milkyWayParticleCount; i++) {
      // Denser near the XZ plane (y ~ 0), sparser as |y| increases
      const r = 900 + Math.random() * 400;
      const theta = Math.random() * 2 * Math.PI;
      let y = (Math.random() - 0.5) * 2;
      y = y * y * y;
      y = y * 180;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      milkyWayPositions.push(x, y, z);
      let color;
      if (Math.abs(y) < 40) {
        color = milkyWayColorPalette[Math.floor(Math.random() * 3)];
      } else if (Math.abs(y) < 100) {
        color = milkyWayColorPalette[2 + Math.floor(Math.random() * 2)];
      } else {
        color = milkyWayColorPalette[4 + Math.floor(Math.random() * 2)];
      }
      milkyWayColors.push(color.r, color.g, color.b);
    }
    milkyWayGeometry.setAttribute('position', new THREE.Float32BufferAttribute(milkyWayPositions, 3));
    milkyWayGeometry.setAttribute('color', new THREE.Float32BufferAttribute(milkyWayColors, 3));
    const milkyWayMaterial = new THREE.PointsMaterial({ size: 5, vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false });
    const milkyWayPoints = new THREE.Points(milkyWayGeometry, milkyWayMaterial);
    this.scene.add(milkyWayPoints);

    // Remove bright white square points

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 120, 400);

    // OrbitControls for user camera movement
    this.controls = new OrbitControls(this.camera, this.rendererContainer.nativeElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 1200;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minPolarAngle = 0;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xfff7ae, 2, 2000);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    // Axial tilt values in degrees (approximate)
    const axialTilts: { [key: string]: number } = {
      mercury: 0.03,
      venus: 177.4,
      earth: 23.4,
      mars: 25.2,
      jupiter: 3.1,
      saturn: 26.7,
      uranus: 97.8,
      neptune: 28.3,
      sun: 7.25
    };

    // Planet textures
    const planetTextures: { [key: string]: string } = {
      mercury: 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg',
      venus: 'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
      earth: 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
      mars: 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
      jupiter: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
      saturn: 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
      uranus: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
      neptune: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
    };

    // Planets (slowed revolution by 75%)
    const planetConfigs = [
      { name: 'sun', orbit: 0, size: 32, speed: 0 },
      { name: 'mercury', orbit: 60, size: 6, speed: 0.004375 },
      { name: 'venus', orbit: 90, size: 10, speed: 0.0035 },
      { name: 'earth', orbit: 120, size: 12, speed: 0.00275 },
      { name: 'mars', orbit: 150, size: 9, speed: 0.00225 },
      { name: 'jupiter', orbit: 190, size: 22, speed: 0.0015 },
      { name: 'saturn', orbit: 240, size: 18, speed: 0.001125 },
      { name: 'uranus', orbit: 280, size: 14, speed: 0.000875 },
      { name: 'neptune', orbit: 320, size: 13, speed: 0.000625 }
    ];

    // Helper to add glow
    function addGlow(mesh: any, color: string, size: number) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('/assets/circle.png'),
        color: color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(size, size, 1.0);
      mesh.add(sprite);
    }

    // Preload all planet textures
    const loadingManager = new THREE.LoadingManager();
    const loadedTextures: { [key: string]: THREE.Texture } = {};
    let texturesToLoad = Object.keys(planetTextures).length + 1; // +1 for sun
    loadingManager.onLoad = () => {
      // Sun
      const sunGeometry = new THREE.SphereGeometry(32, 64, 64);
      const sunMaterial = new THREE.MeshBasicMaterial({ map: loadedTextures['sun'] });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.name = 'sun';
      sun.rotation.z = THREE.MathUtils.degToRad(axialTilts['sun']);
      this.scene.add(sun);
      this.planets.push({ mesh: sun, name: 'sun', orbitRadius: 0, angle: 0, speed: 0, selfRotation: 0.002 });
      addGlow(sun, '#fff8b0', 120);
      // Planets
      let uranusLoaded = false;
      planetConfigs.forEach(cfg => {
        console.log('Planet config name:', cfg.name);
        if (cfg.name === 'uranus') {
          // Load FBX model for Uranus
          const fbxLoader = new FBXLoader();
          console.log('Loading Uranus FBX...');
          fbxLoader.load(
            '/assets/uranus/source/uranus.fbx',
            (object: any) => {
              console.log('Uranus FBX loaded', object);
              object.name = 'uranus';
              object.traverse((child: any) => {
                if (child.isMesh) {
                  child.castShadow = false;
                  child.receiveShadow = false;
                  child.visible = true;
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((mat: any, idx: number) => {
                        mat.opacity = 1;
                        mat.transparent = false;
                        // Remove debug color, restore original
                        // mat.color = new THREE.Color(0x00ff00);
                        if (!mat.map) {
                          const tex = new THREE.TextureLoader().load('/assets/uranus/source/Uv1_uranus1_diff.png');
                          mat.map = tex;
                          mat.needsUpdate = true;
                        }
                        console.log('Uranus mesh:', child.name, 'material['+idx+']:', mat);
                      });
                    } else {
                      child.material.opacity = 1;
                      child.material.transparent = false;
                      // Remove debug color, restore original
                      // child.material.color = new THREE.Color(0x00ff00);
                      if (!child.material.map) {
                        const tex = new THREE.TextureLoader().load('/assets/uranus/source/Uv1_uranus1_diff.png');
                        child.material.map = tex;
                        child.material.needsUpdate = true;
                      }
                      console.log('Uranus mesh:', child.name, 'material:', child.material);
                    }
                  }
                }
              });
              // Center the model geometry
              const box = new THREE.Box3().setFromObject(object);
              const center = new THREE.Vector3();
              box.getCenter(center);
              object.position.sub(center); // Move model so its center is at (0,0,0)
              object.scale.set(0.0007, 0.0007, 0.0007); // Slightly smaller
              object.position.x += cfg.orbit;
              console.log('Uranus bounding box min:', box.min, 'max:', box.max, 'center:', center);
              this.scene.add(object);
              this.planets.push({ mesh: object, name: 'uranus', orbitRadius: cfg.orbit, angle: Math.random() * Math.PI * 2, speed: cfg.speed, selfRotation: 0.01 + Math.random() * 0.01 });
              this.loading = false;
              this.animate();
            },
            undefined,
            (error: any) => {
              console.error('Failed to load Uranus FBX', error);
              this.loading = false;
              this.animate();
            }
          );
        } else if (cfg.name.toLowerCase() === 'sun' || cfg.name.toLowerCase() === 'unstablestar' || cfg.name.toLowerCase().includes('sun')) {
          console.log('Entering Sun FBX loader branch for:', cfg.name);
          // Load FBX model for Sun
          console.log('Attempting to load Sun FBX...');
          const fbxLoader = new FBXLoader();
          fbxLoader.load(
            '/assets/sun/UnstableStar.fbx',
            (object: any) => {
              console.log('Sun FBX loaded', object);
              object.name = 'sun';
              object.traverse((child: any) => {
                if (child.isMesh) {
                  child.castShadow = false;
                  child.receiveShadow = false;
                  child.visible = true;
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((mat: any, idx: number) => {
                        mat.opacity = 1;
                        mat.transparent = false;
                        // Always assign fallback texture
                        const tex = new THREE.TextureLoader().load('/assets/sun/suncyl1.jpg');
                        mat.map = tex;
                        mat.needsUpdate = true;
                        console.log('Sun mesh:', child.name, 'material['+idx+']:', mat);
                      });
                    } else {
                      child.material.opacity = 1;
                      child.material.transparent = false;
                      // Always assign fallback texture
                      const tex = new THREE.TextureLoader().load('/assets/sun/suncyl1.jpg');
                      child.material.map = tex;
                      child.material.needsUpdate = true;
                      console.log('Sun mesh:', child.name, 'material:', child.material);
                    }
                  }
                }
              });
              // Center the model geometry
              const box = new THREE.Box3().setFromObject(object);
              const center = new THREE.Vector3();
              box.getCenter(center);
              object.position.sub(center);
              object.scale.set(0.002, 0.002, 0.002); // Slightly larger for the sun
              object.position.x += cfg.orbit;
              console.log('Sun bounding box min:', box.min, 'max:', box.max, 'center:', center);
              this.scene.add(object);
              this.planets.push({ mesh: object, name: 'sun', orbitRadius: 0, angle: 0, speed: 0, selfRotation: 0.002 });
              this.loading = false;
              this.animate();
            },
            undefined,
            (error: any) => {
              console.error('Failed to load Sun FBX', error);
              // Fallback: create a sphere for the sun
              const sunGeometry = new THREE.SphereGeometry(32, 64, 64);
              const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
              const sun = new THREE.Mesh(sunGeometry, sunMaterial);
              sun.name = 'sun';
              this.scene.add(sun);
              this.planets.push({ mesh: sun, name: 'sun', orbitRadius: 0, angle: 0, speed: 0, selfRotation: 0.002 });
              this.loading = false;
              this.animate();
            }
          );
        } else if (cfg.name === 'jupiter') {
          // Load FBX model for Jupiter
          const fbxLoader = new FBXLoader();
          console.log('Loading Jupiter FBX...');
          fbxLoader.load(
            '/assets/jupiter/jupiter.fbx',
            (object: any) => {
              console.log('Jupiter FBX loaded', object);
              object.name = 'jupiter';
              object.traverse((child: any) => {
                if (child.isMesh) {
                  child.castShadow = false;
                  child.receiveShadow = false;
                  child.visible = true;
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((mat: any, idx: number) => {
                        mat.opacity = 1;
                        mat.transparent = false;
                        if (!mat.map) {
                          const tex = new THREE.TextureLoader().load('/assets/jupiter/Uv1_jupiter1_diff.png');
                          mat.map = tex;
                          mat.needsUpdate = true;
                        }
                        console.log('Jupiter mesh:', child.name, 'material['+idx+']:', mat);
                      });
                    } else {
                      child.material.opacity = 1;
                      child.material.transparent = false;
                      if (!child.material.map) {
                        const tex = new THREE.TextureLoader().load('/assets/jupiter/Uv1_jupiter1_diff.png');
                        child.material.map = tex;
                        child.material.needsUpdate = true;
                      }
                      console.log('Jupiter mesh:', child.name, 'material:', child.material);
                    }
                  }
                }
              });
              // Center the model geometry
              const box = new THREE.Box3().setFromObject(object);
              const center = new THREE.Vector3();
              box.getCenter(center);
              object.position.sub(center);
              object.scale.set(0.000001, 0.000001, 0.000001); // Even smaller
              object.position.x += cfg.orbit;
              console.log('Jupiter bounding box min:', box.min, 'max:', box.max, 'center:', center);
              this.scene.add(object);
              this.planets.push({ mesh: object, name: 'jupiter', orbitRadius: cfg.orbit, angle: Math.random() * Math.PI * 2, speed: cfg.speed, selfRotation: 0.01 + Math.random() * 0.01 });
              this.loading = false;
              this.animate();
            },
            undefined,
            (error: any) => {
              console.error('Failed to load Jupiter FBX', error);
              this.loading = false;
              this.animate();
            }
          );
        } else {
          const geometry = new THREE.SphereGeometry(cfg.size, 48, 48);
          let material: any;
          if (loadedTextures[cfg.name]) {
            material = new THREE.MeshStandardMaterial({ map: loadedTextures[cfg.name] });
          } else {
            material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          }
          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = cfg.name;
          mesh.rotation.z = THREE.MathUtils.degToRad(axialTilts[cfg.name]);
          this.scene.add(mesh);
          this.planets.push({ mesh, name: cfg.name, orbitRadius: cfg.orbit, angle: Math.random() * Math.PI * 2, speed: cfg.speed, selfRotation: 0.01 + Math.random() * 0.01 });
          // Saturn ring
          if (cfg.name === 'saturn') {
            new THREE.TextureLoader().load('https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png', (ringTexture: THREE.Texture) => {
              const ringGeometry = new THREE.RingGeometry(cfg.size + 2, cfg.size + 6, 64);
              const ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
              const ring = new THREE.Mesh(ringGeometry, ringMaterial);
              ring.rotation.x = Math.PI / 2.2;
              ring.position.copy(mesh.position);
              mesh.add(ring);
            });
          }
          // Add glow to planets
          addGlow(mesh, '#ffffff', cfg.size * 3.5);
        }
      });
      // If Uranus is not loaded (e.g., not present), finish loading and animate
      if (!uranusLoaded) {
        this.loading = false;
        this.animate();
      }
    };

    // Load sun texture
    new THREE.TextureLoader(loadingManager).load('https://www.solarsystemscope.com/textures/download/2k_sun.jpg', (texture: THREE.Texture) => {
      loadedTextures['sun'] = texture;
    });
    // Load planet textures
    Object.entries(planetTextures).forEach(([name, url]) => {
      new THREE.TextureLoader(loadingManager).load(url, (texture: THREE.Texture) => {
        loadedTextures[name] = texture;
      });
    });

    // Orbit lines
    planetConfigs.forEach(cfg => {
      const curve = new THREE.EllipseCurve(0, 0, cfg.orbit, cfg.orbit);
      const points = curve.getPoints(100);
      // Draw orbit in XZ plane (y=0)
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map((p: any) => new THREE.Vector3(p.x, 0, p.y)));
      // Make orbit lines even more subtle
      const material = new THREE.LineBasicMaterial({ color: 0xe5e7ef, linewidth: 1, transparent: true, opacity: 0.13 });
      const ellipse = new THREE.Line(geometry, material);
      this.scene.add(ellipse);
    });

    // Animated starfield (particles)
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starVertices = [];
    for (let i = 0; i < starCount; i++) {
      const r = 900 + Math.random() * 100;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      starVertices.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true });
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);

    // Shooting stars
    this.shootingStars = [];
    this.shootingStarTimer = 0;
    this.shootingStarInterval = 600 + Math.random() * 600; // 0.6s to 1.2s

    // Raycaster for interactivity
    this.renderer.domElement.addEventListener('pointerdown', (event: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
      };
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      // For Uranus, add its children meshes to the raycast array
      const raycastMeshes = this.planets.flatMap(p => {
        if (p.name === 'uranus' && p.mesh.children && p.mesh.children.length > 0) {
          return p.mesh.children.filter((child: any) => child.isMesh);
        }
        return [p.mesh];
      });
      const intersects = raycaster.intersectObjects(raycastMeshes);
      if (intersects.length > 0) {
        const planet = this.planets.find(p => {
          if (p.name === 'uranus' && p.mesh.children && p.mesh.children.length > 0) {
            return p.mesh.children.includes(intersects[0].object);
          }
          return p.mesh === intersects[0].object;
        });
        if (planet) {
          this.openPopup(planet.name, event.clientX, event.clientY);
        }
      }
    });
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    if (!this.revolutionPaused) {
      this.planets.forEach(planet => {
        if (planet.orbitRadius > 0) {
          planet.angle += planet.speed;
          // Make sure planets revolve in the XZ plane (same as orbit lines)
          planet.mesh.position.x = Math.cos(planet.angle) * planet.orbitRadius;
          planet.mesh.position.z = Math.sin(planet.angle) * planet.orbitRadius;
          planet.mesh.position.y = 0;
        }
        // Self-rotation
        if (planet.name === 'uranus' && planet.mesh.children && planet.mesh.children.length > 0) {
          planet.mesh.children.forEach((child: any) => {
            if (child.isMesh) child.rotation.y += planet.selfRotation || 0;
          });
        } else {
          planet.mesh.rotation.y += planet.selfRotation || 0;
        }
      });
    }
    // Shooting star logic
    this.shootingStarTimer += 16; // ~16ms per frame
    if (this.shootingStarTimer > this.shootingStarInterval) {
      // Create 1 or 2 shooting stars
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        // Start position: random in the XZ plane, y near 0
        const r = 900 + Math.random() * 400;
        const theta = Math.random() * 2 * Math.PI;
        const y = (Math.random() - 0.5) * 60; // denser near y=0
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        // Direction: random, but mostly along the XZ plane
        const dx = (Math.random() - 0.5) * 2;
        const dz = (Math.random() - 0.5) * 2;
        const dy = (Math.random() - 0.5) * 0.2;
        this.shootingStars.push({
          pos: new THREE.Vector3(x, y, z),
          dir: new THREE.Vector3(dx, dy, dz).normalize(),
          age: 0,
          maxAge: 60 + Math.random() * 30 // frames
        });
      }
      this.shootingStarTimer = 0;
      this.shootingStarInterval = 600 + Math.random() * 600;
    }
    // Animate and render shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i];
      star.pos.addScaledVector(star.dir, 18);
      star.age++;
      // Draw shooting star as a glowing line (trail)
      const trailLength = 60;
      const trailGeometry = new THREE.BufferGeometry().setFromPoints([
        star.pos.clone(),
        star.pos.clone().addScaledVector(star.dir, -trailLength)
      ]);
      const trailMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      let trail = star.trailMesh;
      if (!trail) {
        trail = new THREE.Line(trailGeometry, trailMaterial);
        star.trailMesh = trail;
        this.scene.add(trail);
      } else {
        trail.geometry.dispose();
        trail.geometry = trailGeometry;
      }
      // Remove after maxAge
      if (star.age > star.maxAge) {
        this.scene.remove(trail);
        if (trail.geometry) trail.geometry.dispose();
        if (trail.material) trail.material.dispose();
        this.shootingStars.splice(i, 1);
      }
    }
    if (this.controls) {
      this.controls.update();
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  openPopup(planet: string, x: number, y: number) {
    this.popupOpen = true;
    this.activePlanet = planet;
    this.revolutionPaused = true;
    this.popupStyle = {
      left: `${x + 20}px`,
      top: `${y - 40}px`
    };
  }

  closePopup() {
    this.popupOpen = false;
    this.activePlanet = null;
    this.revolutionPaused = false;
  }
} 