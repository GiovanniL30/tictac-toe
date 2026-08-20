import { MainPage } from "./app/MainPage.js";

const app = new MainPage();

const clearSessionOnTabDuplicate = () => {
  const hasExistingSession = sessionStorage.getItem("IS_SESSION_ACTIVE");
  const isDuplicateTab = !window.name;

  if (hasExistingSession && isDuplicateTab) {
    sessionStorage.clear();
    console.log("Duplicate tab detected. Session storage cleared.");
    window.name = "tab_" + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem("IS_SESSION_ACTIVE", "true");
  } else if (!hasExistingSession) {
    window.name = "tab_" + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem("IS_SESSION_ACTIVE", "true");
  }
};

clearSessionOnTabDuplicate();
