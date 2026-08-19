const svgCache = new Map();

const svgKey = (type, emotion) => {
  const suffix = emotion === "cry" ? "-cry" : "";
  return `./src/assets/icons/${type}-mascot${suffix}.svg`;
};

const loadSvg = async (key) => {
  if (!svgCache.has(key)) {
    const response = await fetch(key);
    svgCache.set(key, await response.text());
  }

  return svgCache.get(key);
};

export class Mascot {
  static async mount(host, type, emotion = "smile") {
    host.classList.add("mascot", type);

    if (!host.dataset.mounted) {
      host.dataset.mounted = "true";
      host._type = type;
      host._emotion = emotion;
      host.innerHTML = await loadSvg(svgKey(type, emotion));
    }

    return host;
  }

  static async setEmotion(host, emotion) {
    if (!host || !host._type || host._emotion === emotion) return;

    host._emotion = emotion;
    host.innerHTML = await loadSvg(svgKey(host._type, emotion));
  }

  static place(host) {
    if (!host || host.classList.contains("placing")) return;

    host.classList.remove("placing");
    void host.offsetWidth;
    host.classList.add("placing");

    clearTimeout(host._placeTimer);
    host._placeTimer = setTimeout(() => {
      host.classList.remove("placing");
    }, 600);
  }

  static setTurn(host, state) {
    if (!host) return;

    host.classList.toggle("on-turn", state === "on");
    host.classList.toggle("off-turn", state === "off");
  }

  static setResult(host, state) {
    if (!host) return;

    host.classList.remove("placing", "slap", "cry", "stare");
    void host.offsetWidth;

    if (state === "slap") host.classList.add("slap");
    if (state === "stare") host.classList.add("stare");
    if (state === "cry") {
      host.classList.add("cry");
      this.setEmotion(host, "cry");
    }
  }
}
