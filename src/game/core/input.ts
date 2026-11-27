export class InputManager {
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private wheelDelta = 0;
  private dragging = false;
  private pointerLocked = false;
  private canvasEl: HTMLElement | null = null;
  private active = false;
  private pendingGesture = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundBlur: () => void;
  private boundVisibility: () => void;
  private boundPointerLockChange: () => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundBlur = this.clearAll.bind(this);
    this.boundVisibility = () => {
      if (document.hidden) this.clearAll();
    };
    this.boundPointerLockChange = () => {
      this.pointerLocked =
        this.canvasEl !== null && document.pointerLockElement === this.canvasEl;
    };
  }

  public attach(canvasEl: HTMLElement): void {
    this.canvasEl = canvasEl;
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    canvasEl.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    canvasEl.addEventListener('wheel', this.boundWheel, { passive: true });
    window.addEventListener('blur', this.boundBlur);
    document.addEventListener('visibilitychange', this.boundVisibility);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    if (this.canvasEl) {
      this.canvasEl.removeEventListener('mousedown', this.boundMouseDown);
      this.canvasEl.removeEventListener('wheel', this.boundWheel);
    }
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('blur', this.boundBlur);
    document.removeEventListener('visibilitychange', this.boundVisibility);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    this.canvasEl = null;
    this.clearAll();
  }

  public setGameplayActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.clearAll();
      this.exitPointerLock();
    }
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public requestPointerLock(): void {
    if (!this.canvasEl || !this.active) return;
    try {
      const maybePromise = this.canvasEl.requestPointerLock?.() as unknown;
      if (
        maybePromise &&
        typeof (maybePromise as Promise<void>).catch === 'function'
      ) {
        (maybePromise as Promise<void>).catch(() => {});
      }
    } catch {
      // Headless, Safari, or iframe may decline pointer lock; drag-look still works seamlessly.
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // ignore
      }
    }
  }

  public isHeld(code: string): boolean {
    return this.held.has(code);
  }

  public consumeJustPressed(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  public consumeMouseDelta(): { dx: number; dy: number } {
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  public consumeWheelDelta(): number {
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }

  public endFrame(): void {
    this.justPressed.clear();
  }

  public consumeUserGesture(): boolean {
    if (!this.pendingGesture) return false;
    this.pendingGesture = false;
    return true;
  }

  public clearAll(): void {
    this.held.clear();
    this.justPressed.clear();
    this.dragging = false;
    this.pendingGesture = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelDelta = 0;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (
      this.active &&
      (code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight')
    ) {
      e.preventDefault();
    }

    if (this.active) {
      this.pendingGesture = true;
    }
    if (!this.held.has(code)) {
      this.justPressed.add(code);
    }
    this.held.add(code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.held.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.active) return;
    this.pendingGesture = true;
    if (e.button === 0 || e.button === 2) {
      this.dragging = true;
      // Only request pointer lock on right-click or explicit canvas double-click,
      // while left-drag smoothly orbits camera without trapping headless/iframe cursors.
      if (e.button === 2) {
        this.requestPointerLock();
      }
    }
  }

  private onMouseUp(): void {
    this.dragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.active) return;
    if (this.pointerLocked || this.dragging) {
      this.mouseDeltaX += e.movementX ?? 0;
      this.mouseDeltaY += e.movementY ?? 0;
    }
  }

  private onWheel(e: WheelEvent): void {
    if (!this.active) return;
    this.wheelDelta += Math.sign(e.deltaY);
  }
}
