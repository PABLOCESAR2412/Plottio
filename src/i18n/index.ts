import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";

let selected = "es";
if (typeof window !== "undefined") {
	const stored = window.localStorage.getItem("plottio-lang");
	if (stored === "es" || stored === "en") selected = stored;
}

void i18n.use(initReactI18next).init({
	resources: {
		es: { translation: es },
		en: { translation: en },
	},
	lng: selected,
	fallbackLng: "es",
	interpolation: { escapeValue: false },
});

export function setLanguage(lang: "es" | "en") {
	if (typeof window !== "undefined") {
		window.localStorage.setItem("plottio-lang", lang);
	}
	void i18n.changeLanguage(lang);
}

export default i18n;
