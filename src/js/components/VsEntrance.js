const svgCache = new Map();

const svgKey = (type) => `./src/assets/icons/${type}-mascot.svg`;

const loadSvg = async (key) => {
  if (!svgCache.has(key)) {
    const response = await fetch(key);
    svgCache.set(key, await response.text());
  }

  return svgCache.get(key);
};

const PLAY_DURATION = 1700;
const EXIT_DURATION = 450;

export class VsEntrance {
  constructor({ playerX = "Player X", playerO = "Player O", onComplete } = {}) {
    this.playerX = playerX;
    this.playerO = playerO;
    this.onComplete = onComplete;

    this.exitTimer = null;
    this.removeTimer = null;
    this.el = null;

    this.build();
  }

  build() {
    const overlay = document.createElement("div");
    overlay.classList.add("vs-overlay");

    const stage = document.createElement("div");
    stage.classList.add("vs-stage");

    const streakLeft = document.createElement("div");
    streakLeft.classList.add("vs-streak", "left");

    const streakRight = document.createElement("div");
    streakRight.classList.add("vs-streak", "right");

    const cat = document.createElement("div");
    cat.classList.add("vs-fighter", "cat");

    const dog = document.createElement("div");
    dog.classList.add("vs-fighter", "dog");

    const catPlate = document.createElement("div");
    catPlate.classList.add("vs-nameplate", "cat");
    catPlate.textContent = this.playerX;

    const dogPlate = document.createElement("div");
    dogPlate.classList.add("vs-nameplate", "dog");
    dogPlate.textContent = this.playerO;

    const stamp = document.createElement("div");
    stamp.classList.add("vs-stamp");
    stamp.textContent = "VS";

    const ready = document.createElement("div");
    ready.classList.add("vs-ready");
    ready.textContent = "Game starting...";

    stage.append(
      streakLeft,
      streakRight,
      cat,
      dog,
      catPlate,
      dogPlate,
      stamp,
      ready,
    );

    overlay.append(stage);
    this.el = overlay;

    this.fighterCat = cat;
    this.fighterDog = dog;
  }

  async show() {
    const [catSvg, dogSvg] = await Promise.all([
      loadSvg(svgKey("cat")),
      loadSvg(svgKey("dog")),
    ]);

    this.fighterCat.innerHTML = catSvg;
    this.fighterDog.innerHTML = dogSvg;

    document.body.append(this.el);
    this.el.classList.add("playing");

    this.exitTimer = setTimeout(() => {
      this.el.classList.add("exiting");

      this.removeTimer = setTimeout(() => {
        this.destroy();
      }, EXIT_DURATION);
    }, PLAY_DURATION);
  }

  destroy() {
    if (this.exitTimer) {
      clearTimeout(this.exitTimer);
      this.exitTimer = null;
    }

    if (this.removeTimer) {
      clearTimeout(this.removeTimer);
      this.removeTimer = null;
    }

    if (this.el) {
      this.el.remove();
      this.el = null;
    }

    if (this.onComplete) {
      this.onComplete();
      this.onComplete = null;
    }
  }
}
