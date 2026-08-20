export class Confetti {
  constructor(parent = document.body, particleCount = 200) {
    this.particleCount = particleCount;
    this.particles = [];
    this.animationId = null;

    this.createCanvas(parent);

    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener("resize", this.resizeCanvas);

    this.resizeCanvas();
    this.createParticles();
  }

  createCanvas(parent) {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.classList.add("confetti-canvas");

    parent.appendChild(this.canvas);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticle() {
    this.particles.push({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height - this.canvas.height,
      size: Math.random() * 6 + 3,
      speedX: (Math.random() - 0.5) * 4,
      speedY: Math.random() * 4 + 2,
      rotation: (Math.random() - 0.5) * 5,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    });
  }

  createParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.createParticle();
    }
  }

  updateParticle(particle) {
    particle.x += particle.speedX;
    particle.y += particle.speedY;

    particle.x += Math.sin(particle.y * 0.1) * Math.random() * 0.5;

    if (particle.y > this.canvas.height + 20) {
      particle.y = Math.random() * this.canvas.height - this.canvas.height;

      particle.x = Math.random() * this.canvas.width;
    }
  }

  drawParticle(particle) {
    this.ctx.save();

    this.ctx.translate(particle.x, particle.y);
    this.ctx.rotate(particle.rotation);
    this.ctx.fillStyle = particle.color;

    this.ctx.fillRect(
      particle.size,
      particle.size / 4,
      particle.size * 2,
      particle.size / 2,
    );

    this.ctx.restore();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((particle) => {
      this.updateParticle(particle);
      this.drawParticle(particle);
    });

    this.animationId = requestAnimationFrame(this.animate);
  }

  start() {
    if (!this.animationId) {
      this.animate();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stop();

    window.removeEventListener("resize", this.resizeCanvas);

    this.particles = [];

    this.canvas.remove();
    this.canvas = null;
    this.ctx = null;
  }
}
