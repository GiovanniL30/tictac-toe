export class ModalController {
  constructor() {
    this.activeModal = null;
  }

  show(modal) {
    this.activeModal = modal;
    modal.show();
    return modal;
  }

  setActive(modal) {
    this.activeModal = modal;
  }

  hide(modal) {
    modal.hide();

    if (this.activeModal === modal) {
      this.activeModal = null;
    }
  }

  closeActive() {
    if (this.activeModal) {
      this.activeModal.hide();
      this.activeModal = null;
    }
  }

  disableActive() {
    if (this.activeModal) {
      this.activeModal.disableButtons();
    }
  }
}
