import { loadSvg } from "../utils/svg.js";

const DEFAULT_MESSAGES = ["Hello there!", "Are you still there?", "Psst… wanna play?", "Grab a friend, CREATE A ROOM!", "I'm bored… one quick game?"];

const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "click", "scroll", "wheel"];

const SHOW_MS = 5000;

export class IdleNudge {
  constructor(props = {}) {
    this.delay = props.delay ?? 5000;
    this.messages = props.messages ?? DEFAULT_MESSAGES;

    this.timer = null;
    this.autoHideTimer = null;

    this.visible = false;
    this.count = 0;

    this.el = null;
    this.bubble = null;
    this.mascotHost = null;

    this.handleActivity = this.handleActivity.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  mount() {
    if (this.el) return this;

    const container = document.createElement("div");
    container.classList.add("idle-nudge");

    const bubble = document.createElement("div");
    bubble.classList.add("nudge-bubble");

    const mascotHost = document.createElement("div");
    mascotHost.classList.add("nudge-mascot");

    container.append(bubble, mascotHost);
    document.body.appendChild(container);

    this.el = container;
    this.bubble = bubble;
    this.mascotHost = mascotHost;

    this.el.addEventListener("click", this.handleClick);

    ACTIVITY_EVENTS.forEach((evt) => {
      window.addEventListener(evt, this.handleActivity, { passive: true });
    });

    this.restart();
    return this;
  }

  show() {
    if (!this.el || this.visible) return;

    this.visible = true;
    this.count += 1;

    // alternate mascots on every peek
    const type = this.count % 2 === 1 ? "cat" : "dog";
    const message = this.messages[(this.count - 1) % this.messages.length];

    loadSvg(`./src/assets/icons/${type}-mascot-peek.svg`).then((svg) => {
      if (this.visible && this.mascotHost) {
        this.mascotHost.innerHTML = svg;
      }
    });

    this.bubble.textContent = message;

    this.el.classList.remove("hide");
    void this.el.offsetWidth;
    this.el.classList.add("show");

    this.autoHideTimer = setTimeout(() => this.hide(), SHOW_MS);
  }

  hide() {
    if (!this.el || !this.visible) return;

    this.visible = false;
    clearTimeout(this.autoHideTimer);

    this.el.classList.remove("show");
    this.el.classList.add("hide");
  }

  handleActivity(e) {
    if (this.el && e && e.target && this.el.contains(e.target)) return;

    this.restart();
  }

  handleClick() {
    this.hide();
    this.restart();
  }

  restart() {
    clearTimeout(this.timer);

    this.timer = setTimeout(() => this.show(), this.delay);
  }

  destroy() {
    clearTimeout(this.timer);
    clearTimeout(this.autoHideTimer);

    if (this.el) {
      this.el.removeEventListener("click", this.handleClick);
      this.el.remove();
      this.el = null;
    }

    ACTIVITY_EVENTS.forEach((evt) => {
      window.removeEventListener(evt, this.handleActivity);
    });
  }
}
