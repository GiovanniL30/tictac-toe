const svgCache = new Map();

export const loadSvg = async (key) => {
  if (!svgCache.has(key)) {
    const response = await fetch(key);
    svgCache.set(key, await response.text());
  }

  return svgCache.get(key);
};
