import { Modal } from "./Modal.js";

export class HowToPlayModal extends Modal {
  constructor() {
    super({ title: "How to Play" });

    this.modalContainer.classList.add("howto-modal");

    this.modalContainer.prepend(this.createBadge());

    const scrollBody = document.createElement("div");
    scrollBody.classList.add("modal-scroll-body");
    scrollBody.append(
      this.modalContainer.querySelector("h2"),
      this.createSubtitle(),
      this.createSteps(),
      this.createDivider(),
      this.createSpectatorNote(),
      this.createCloseButton(),
    );

    this.modalContainer.append(scrollBody);
  }

  createBadge() {
    const badge = document.createElement("div");
    badge.classList.add("modal-badge");
    badge.textContent = "?";
    return badge;
  }

  createSubtitle() {
    const sub = document.createElement("p");
    sub.classList.add("sub");
    sub.textContent = "it's simple, grab a friend and go";
    return sub;
  }

  createSteps() {
    const stepsContainer = document.createElement("div");
    stepsContainer.classList.add("steps");

    const stepsData = [
      [
        "Tap ",
        { text: "Create a Room", bold: true },
        " to get your own 4-letter code, or ",
        { text: "Join a Room", bold: true },
        " if a friend sent you one.",
      ],
      [
        "Share your code with a friend, copy it and send it however you'd like.",
      ],
      [
        "The moment they join, the match ",
        { text: "starts automatically", bold: true },
        ", no ready-up needed.",
      ],
      [
        "Take turns tapping empty tiles. First to get ",
        { text: "3 in a row", bold: true },
        ", across, down, or diagonal wins!",
      ],
    ];

    stepsData.forEach((segments, i) => {
      const step = document.createElement("div");
      step.classList.add("step");

      const num = document.createElement("div");
      num.classList.add("num");
      num.textContent = i + 1;

      const p = document.createElement("p");
      segments.forEach((seg) => {
        if (typeof seg === "string") {
          p.append(document.createTextNode(seg));
        } else {
          const b = document.createElement("b");
          b.textContent = seg.text;
          p.append(b);
        }
      });

      step.append(num, p);
      stepsContainer.append(step);
    });

    return stepsContainer;
  }

  createDivider() {
    const divider = document.createElement("hr");
    divider.classList.add("divider");
    return divider;
  }

  createSpectatorNote() {
    const note = document.createElement("div");
    note.classList.add("spectator-note");

    const text = document.createElement("span");
    text.textContent =
      "Anyone else who joins with the code watches live as a spectator.";

    note.append(text);
    return note;
  }

  createCloseButton() {
    const btn = document.createElement("button");
    btn.classList.add("btn", "pink", "block");
    btn.textContent = "Got it, let's play!";
    btn.addEventListener("click", () => this.hide());
    return btn;
  }
}
