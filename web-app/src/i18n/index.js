import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      app: { name: "MatchStream" },
      nav: { home: "Home", matches: "Matches", favorites: "Favorites", admin: "Admin", login: "Login", logout: "Logout" },
      match: { live: "Live", scheduled: "Scheduled", finished: "Finished", cancelled: "Cancelled", upcoming: "Upcoming", watch: "Watch", noMatches: "No matches found" },
      stream: { starting: "Stream is starting...", error: "Stream Error", reconnect: "Reconnect", goLive: "GO LIVE", noStream: "No active stream available" },
      auth: { signIn: "Sign In", register: "Register", email: "Email", password: "Password", username: "Username" },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
