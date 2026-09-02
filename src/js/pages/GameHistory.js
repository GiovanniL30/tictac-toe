export class GameHistory {
  constructor(props = {}) {
    this.props = props;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container");

    return container;
  }
}
