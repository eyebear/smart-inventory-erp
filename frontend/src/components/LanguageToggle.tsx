"use client";

import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [language, setLanguage] = useState<"en" | "zh">("en");

  useEffect(() => {
    document.documentElement.setAttribute("data-lang", language);
  }, [language]);

  return (
    <button
      className="language-toggle"
      onClick={() => setLanguage(language === "en" ? "zh" : "en")}
    >
      {language === "en" ? "中文" : "English"}
    </button>
  );
}