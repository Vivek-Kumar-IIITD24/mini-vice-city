import * as THREE from 'three';

/**
 * World-space mission checkpoint beacon (glowing vertical light ring & floating chevron)
 * plus a zero-GC pooled InstancedMesh particle burst system for crashes, dust, and checkpoint celebration.
 */
export class WorldEffectsAndMarkers {
  public readonly root = new THREE.Group();

  // Mission checkpoint beacon
  private readonly beaconGroup = new THREE.Group();
  private readonly outerRing: THREE.Mesh;
  private readonly innerCylinder: THREE.Mesh;
  private readonly floatingDiamond: THREE.Mesh;

  // Vehicle objective arrow (hovering above marked mission car)
  private readonly carArrow: THREE.Mesh;

  // Zero-GC pooled particle burst ring buffer (InstancedMesh)
  private readonly particleCount = 96;
  private readonly particleInst: THREE.InstancedMesh;
  private readonly pPos = new Float32Array(96 * 3);
  private readonly pVel = new Float32Array(96 * 3);
  private readonly pLife = new Float32Array(96);
  private readonly pMaxLife = new Float32Array(96);
  private readonly pScale = new Float32Array(96);
  private nextParticle = 0;

  private readonly dummy = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();
  private animTime = 0;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor() {
    // 1. Checkpoint Beacon
    const ringGeo = new THREE.RingGeometry(3.4, 4.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.outerRing = new THREE.Mesh(ringGeo, ringMat);
    this.outerRing.position.y = 0.14;

    const cylGeo = new THREE.CylinderGeometry(3.6, 3.6, 16, 24, 1, true);
    cylGeo.translate(0, 8, 0);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.innerCylinder = new THREE.Mesh(cylGeo, cylMat);

    const diamondGeo = new THREE.OctahedronGeometry(1.15, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    this.floatingDiamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.floatingDiamond.position.y = 4.6;

    this.beaconGroup.add(this.outerRing, this.innerCylinder, this.floatingDiamond);
    this.beaconGroup.visible = false;
    this.root.add(this.beaconGroup);

    // 2. Floating Car Objective Marker (inverted cone above Veloce GT)
    const arrowGeo = new THREE.ConeGeometry(0.62, 1.35, 4);
    arrowGeo.rotateX(Math.PI);
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    this.carArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.carArrow.visible = false;
    this.root.add(this.carArrow);

    // 3. Pooled Particle InstancedMesh
    const pGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffb347,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    });
    this.particleInst = new THREE.InstancedMesh(pGeo, pMat, this.particleCount);
    this.particleInst.frustumCulled = false;
    for (let i = 0; i < this.particleCount; i++) {
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.particleInst.setMatrixAt(i, this.dummy.matrix);
      this.particleInst.setColorAt(i, this.tmpColor.setHex(0xffc857));
    }
    this.particleInst.instanceMatrix.needsUpdate = true;
    if (this.particleInst.instanceColor) this.particleInst.instanceColor.needsUpdate = true;
    this.root.add(this.particleInst);

    this.disposables.push(
      ringGeo,
      ringMat,
      cylGeo,
      cylMat,
      diamondGeo,
      diamondMat,
      arrowGeo,
      arrowMat,
      pGeo,
      pMat,
      this.particleInst,
    );
  }

  public setCheckpoint(x: number, z: number, visible: boolean, radius: number = 9): void {
    this.beaconGroup.visible = visible;
    if (visible) {
      this.beaconGroup.position.set(x, 0, z);
      const s = Math.max(0.75, radius / 9.5);
      this.outerRing.scale.setScalar(s);
      this.innerCylinder.scale.set(s, 1, s);
    }
  }

  public setCarMarker(x: number, z: number, visible: boolean): void {
    this.carArrow.visible = visible;
    if (visible) {
      this.carArrow.position.set(x, 3.1 + Math.sin(this.animTime * 4) * 0.32, z);
    }
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed: number = 6,
  ): void {
    this.tmpColor.setHex(colorHex);
    for (let i = 0; i < count; i++) {
      const idx = this.nextParticle;
      this.nextParticle = (this.nextParticle + 1) % this.particleCount;
      const i3 = idx * 3;
      this.pPos[i3] = x + (Math.random() - 0.5) * 0.5;
      this.pPos[i3 + 1] = y + Math.random() * 0.4;
      this.pPos[i3 + 2] = z + (Math.random() - 0.5) * 0.5;
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.pVel[i3] = Math.cos(angle) * spd;
      this.pVel[i3 + 1] = 2.2 + Math.random() * speed * 0.7;
      this.pVel[i3 + 2] = Math.sin(angle) * spd;
      this.pMaxLife[idx] = 0.42 + Math.random() * 0.35;
      this.pLife[idx] = this.pMaxLife[idx];
      this.pScale[idx] = 0.65 + Math.random() * 0.9;
      this.particleInst.setColorAt(idx, this.tmpColor);
    }
    if (this.particleInst.instanceColor) {
      this.particleInst.instanceColor.needsUpdate = true;
    }
  }

  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;

    if (this.beaconGroup.visible) {
      this.floatingDiamond.rotation.y = this.animTime * 2.1;
      this.floatingDiamond.position.y = 4.6 + Math.sin(this.animTime * 3.2) * 0.45;
      const pulse = 1 + Math.sin(this.animTime * 4.5) * 0.08;
      this.outerRing.scale.set(pulse, pulse, 1);
    }

    if (this.carArrow.visible) {
      this.carArrow.rotation.y = this.animTime * 2.6;
    }

    // Update pooled particles in-place
    let dirty = false;
    for (let i = 0; i < this.particleCount; i++) {
      if (this.pLife[i] <= 0) continue;
      dirty = true;
      this.pLife[i] -= safeDt;
      const i3 = i * 3;
      if (this.pLife[i] <= 0) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.particleInst.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      this.pVel[i3 + 1] -= 15 * safeDt;
      this.pPos[i3] += this.pVel[i3] * safeDt;
      this.pPos[i3 + 1] = Math.max(0.12, this.pPos[i3 + 1] + this.pVel[i3 + 1] * safeDt);
      this.pPos[i3 + 2] += this.pVel[i3 + 2] * safeDt;

      const ratio = this.pLife[i] / this.pMaxLife[i];
      const sc = this.pScale[i] * ratio;
      this.dummy.position.set(this.pPos[i3], this.pPos[i3 + 1], this.pPos[i3 + 2]);
      this.dummy.rotation.set(this.animTime * 5 + i, this.animTime * 3, 0);
      this.dummy.scale.set(sc, sc, sc);
      this.dummy.updateMatrix();
      this.particleInst.setMatrixAt(i, this.dummy.matrix);
    }
    if (dirty) {
      this.particleInst.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
