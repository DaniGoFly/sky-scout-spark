/**
 * Structured legal content per locale.
 * Each language has its own hand-written legal text — NOT auto-translated.
 */

export type LegalPageId =
  | "privacy-policy"
  | "terms-and-conditions"
  | "cookies"
  | "affiliate-disclosure"
  | "impressum";

export interface LegalSection {
  title: string;
  content?: string;
  items?: string[];
}

export interface LegalPageContent {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

/* ── slug maps per locale ── */
export const legalSlugs: Record<string, Record<LegalPageId, string>> = {
  en: {
    "privacy-policy": "privacy-policy",
    "terms-and-conditions": "terms-and-conditions",
    cookies: "cookies",
    "affiliate-disclosure": "affiliate-disclosure",
    impressum: "impressum",
  },
  de: {
    "privacy-policy": "datenschutz",
    "terms-and-conditions": "agb",
    cookies: "cookies",
    "affiliate-disclosure": "affiliate-offenlegung",
    impressum: "impressum",
  },
  fr: {
    "privacy-policy": "politique-de-confidentialite",
    "terms-and-conditions": "conditions-generales",
    cookies: "cookies",
    "affiliate-disclosure": "divulgation-affiliation",
    impressum: "mentions-legales",
  },
  es: {
    "privacy-policy": "politica-de-privacidad",
    "terms-and-conditions": "terminos-y-condiciones",
    cookies: "cookies",
    "affiliate-disclosure": "divulgacion-afiliados",
    impressum: "aviso-legal",
  },
};

/* reverse map: slug → pageId per locale */
export function resolvePageId(
  locale: string,
  slug: string
): LegalPageId | null {
  const map = legalSlugs[locale];
  if (!map) return null;
  for (const [pageId, s] of Object.entries(map)) {
    if (s === slug) return pageId as LegalPageId;
  }
  return null;
}

/* ── content ── */

const en: Record<LegalPageId, LegalPageContent> = {
  "privacy-policy": {
    title: "Privacy Policy",
    lastUpdated: "January 4, 2026",
    sections: [
      {
        title: "1. Introduction",
        content:
          'GoFlyFinder ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our flight comparison services.',
      },
      {
        title: "2. Information We Collect",
        content: "We may collect the following types of information:",
        items: [
          "Personal information (name, email address, phone number)",
          "Travel preferences and search history",
          "Device and browser information",
          "IP address and location data",
          "Cookies and tracking technologies",
        ],
      },
      {
        title: "3. How We Use Your Information",
        content: "We use your information to:",
        items: [
          "Provide and improve our flight comparison services",
          "Personalize your experience and search results",
          "Send you relevant travel deals and updates",
          "Analyze usage patterns to enhance our platform",
          "Comply with legal obligations",
        ],
      },
      {
        title: "4. Information Sharing",
        content:
          "We may share your information with airline partners, travel agencies, and third-party service providers to complete your bookings. We do not sell your personal information to third parties for marketing purposes.",
      },
      {
        title: "5. Data Security",
        content:
          "We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
      },
      {
        title: "6. Your Rights",
        content:
          "You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time by contacting us or using the unsubscribe link in our emails.",
      },
      {
        title: "7. Contact Us",
        content:
          "If you have questions about this Privacy Policy, please contact us at goflyfinder@gmail.com.",
      },
    ],
  },
  "terms-and-conditions": {
    title: "Terms and Conditions",
    lastUpdated: "January 4, 2026",
    sections: [
      {
        title: "1. Acceptance of Terms",
        content:
          "By accessing and using GoFlyFinder, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.",
      },
      {
        title: "2. Service Description",
        content:
          "GoFlyFinder is a flight comparison platform that allows users to search and compare flight prices from various airlines and travel agencies. We do not sell tickets directly; we redirect users to third-party providers to complete bookings.",
      },
      {
        title: "3. User Responsibilities",
        content: "As a user, you agree to:",
        items: [
          "Provide accurate information when using our services",
          "Use the platform for lawful purposes only",
          "Not attempt to interfere with the platform's functionality",
          "Not use automated systems to access our services without permission",
        ],
      },
      {
        title: "4. Booking and Payments",
        content:
          "All bookings are made directly with airlines or travel agencies. GoFlyFinder is not responsible for the booking process, payment handling, or any issues arising from your transaction with third-party providers.",
      },
      {
        title: "5. Price Accuracy",
        content:
          "While we strive to display accurate pricing, prices are subject to change and may vary at the time of booking. The final price is determined by the airline or travel agency at checkout.",
      },
      {
        title: "6. Limitation of Liability",
        content:
          "GoFlyFinder is not liable for any direct, indirect, incidental, or consequential damages arising from your use of our services, including but not limited to flight cancellations, delays, or booking issues with third parties.",
      },
      {
        title: "7. Intellectual Property",
        content:
          "All content on GoFlyFinder, including logos, text, graphics, and software, is the property of GoFlyFinder and protected by intellectual property laws.",
      },
      {
        title: "8. Changes to Terms",
        content:
          "We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.",
      },
      {
        title: "9. Contact",
        content:
          "For questions about these Terms and Conditions, contact us at legal@goflyfinder.com.",
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    lastUpdated: "January 4, 2026",
    sections: [
      {
        title: "What Are Cookies?",
        content:
          "Cookies are small text files stored on your device when you visit websites. They help us improve your experience by remembering preferences and analyzing usage.",
      },
      {
        title: "Necessary Cookies",
        content:
          "These cookies are essential for basic website functionality and cannot be disabled.",
        items: [
          "Session management and security",
          "Language and currency preferences",
          "Cookie consent preferences",
        ],
      },
      {
        title: "Analytics Cookies",
        content:
          "We use analytics cookies to understand how visitors interact with our website. This helps us improve our services and user experience.",
      },
      {
        title: "Marketing Cookies",
        content:
          "Marketing cookies are used to deliver relevant advertisements and track the effectiveness of our marketing campaigns.",
      },
      {
        title: "Managing Your Cookies",
        content:
          "You can manage your cookie preferences at any time using the cookie settings button below, or through your browser settings.",
      },
    ],
  },
  "affiliate-disclosure": {
    title: "Affiliate Disclosure",
    lastUpdated: "January 4, 2026",
    sections: [
      {
        title: "Our Commitment to Transparency",
        content:
          "At GoFlyFinder, we believe in being transparent about how we operate and make money. This disclosure explains our affiliate relationships and how they may affect the content and recommendations on our platform.",
      },
      {
        title: "How We Make Money",
        content:
          "GoFlyFinder is a free service for users. We earn money through affiliate partnerships with airlines, travel agencies, and other travel-related companies. When you click on a link and make a booking through one of our partners, we may receive a commission at no additional cost to you.",
      },
      {
        title: "Affiliate Partners",
        content: "Our affiliate partners may include:",
        items: [
          "Major airlines and low-cost carriers",
          "Online travel agencies (OTAs)",
          "Hotel booking platforms",
          "Car rental companies",
          "Travel insurance providers",
        ],
      },
      {
        title: "Editorial Independence",
        content:
          "Our affiliate relationships do not influence our search results or recommendations. We display flights based on price, duration, and other objective criteria. Our goal is to help you find the best deals, regardless of our commission arrangements.",
      },
      {
        title: "No Extra Cost to You",
        content:
          "Using our affiliate links does not increase the price you pay. The price you see on GoFlyFinder is the same price you would pay if you went directly to the airline or travel agency. Our commissions come from the partners, not from you.",
      },
      {
        title: "Supporting Our Service",
        content:
          "By using GoFlyFinder to search and book your flights, you help support our free service. The commissions we receive allow us to continue providing flight comparison tools and travel resources at no cost to our users.",
      },
      {
        title: "Questions?",
        content:
          "If you have any questions about our affiliate relationships, please contact us at affiliates@goflyfinder.com.",
      },
    ],
  },
  impressum: {
    title: "Legal Notice",
    lastUpdated: "January 4, 2026",
    sections: [
      {
        title: "Site Operator",
        content: "GoFlyFinder",
      },
      {
        title: "Contact",
        content: "Email: goflyfinder@gmail.com",
      },
      {
        title: "Disclaimer",
        content:
          "GoFlyFinder is a flight and hotel comparison platform. We do not sell tickets directly. All bookings are processed through third-party travel partners. Prices displayed are estimates and may vary at the time of booking.",
      },
    ],
  },
};

const de: Record<LegalPageId, LegalPageContent> = {
  "privacy-policy": {
    title: "Datenschutzerklärung",
    lastUpdated: "4. Januar 2026",
    sections: [
      {
        title: "1. Einleitung",
        content:
          'GoFlyFinder („wir", „unser" oder „uns") verpflichtet sich zum Schutz Ihrer Privatsphäre. Diese Datenschutzerklärung erläutert, wie wir Ihre Daten erheben, verwenden, weitergeben und schützen, wenn Sie unsere Website besuchen und unsere Flugvergleichsdienste nutzen.',
      },
      {
        title: "2. Erhobene Daten",
        content: "Wir können folgende Arten von Informationen erheben:",
        items: [
          "Persönliche Daten (Name, E-Mail-Adresse, Telefonnummer)",
          "Reisepräferenzen und Suchverlauf",
          "Geräte- und Browserinformationen",
          "IP-Adresse und Standortdaten",
          "Cookies und Tracking-Technologien",
        ],
      },
      {
        title: "3. Verwendung Ihrer Daten",
        content: "Wir verwenden Ihre Daten, um:",
        items: [
          "Unsere Flugvergleichsdienste bereitzustellen und zu verbessern",
          "Ihre Erfahrung und Suchergebnisse zu personalisieren",
          "Ihnen relevante Reiseangebote und Updates zu senden",
          "Nutzungsmuster zu analysieren, um unsere Plattform zu verbessern",
          "Gesetzliche Pflichten zu erfüllen",
        ],
      },
      {
        title: "4. Datenweitergabe",
        content:
          "Wir können Ihre Daten an Airline-Partner, Reisebüros und Drittanbieter weitergeben, um Ihre Buchungen abzuwickeln. Wir verkaufen Ihre persönlichen Daten nicht an Dritte zu Marketingzwecken.",
      },
      {
        title: "5. Datensicherheit",
        content:
          "Wir setzen branchenübliche Sicherheitsmaßnahmen ein, um Ihre persönlichen Daten zu schützen. Allerdings ist keine Methode der Übertragung über das Internet zu 100 % sicher, und wir können keine absolute Sicherheit garantieren.",
      },
      {
        title: "6. Ihre Rechte",
        content:
          "Sie haben das Recht, auf Ihre persönlichen Daten zuzugreifen, diese zu berichtigen oder zu löschen. Sie können sich auch jederzeit von Marketingkommunikation abmelden, indem Sie uns kontaktieren oder den Abmeldelink in unseren E-Mails verwenden.",
      },
      {
        title: "7. Kontakt",
        content:
          "Bei Fragen zu dieser Datenschutzerklärung kontaktieren Sie uns bitte unter goflyfinder@gmail.com.",
      },
    ],
  },
  "terms-and-conditions": {
    title: "Allgemeine Geschäftsbedingungen (AGB)",
    lastUpdated: "4. Januar 2026",
    sections: [
      {
        title: "1. Geltungsbereich",
        content:
          "Durch den Zugriff auf und die Nutzung von GoFlyFinder akzeptieren Sie diese Allgemeinen Geschäftsbedingungen. Wenn Sie diesen Bedingungen nicht zustimmen, nutzen Sie bitte unsere Dienste nicht.",
      },
      {
        title: "2. Leistungsbeschreibung",
        content:
          "GoFlyFinder ist eine Flugvergleichsplattform, die es Nutzern ermöglicht, Flugpreise verschiedener Airlines und Reisebüros zu suchen und zu vergleichen. Wir verkaufen keine Tickets direkt; wir leiten Nutzer an Drittanbieter weiter, um Buchungen abzuschließen.",
      },
      {
        title: "3. Pflichten des Nutzers",
        content: "Als Nutzer verpflichten Sie sich:",
        items: [
          "Bei der Nutzung unserer Dienste korrekte Angaben zu machen",
          "Die Plattform nur für rechtmäßige Zwecke zu nutzen",
          "Nicht zu versuchen, die Funktionalität der Plattform zu beeinträchtigen",
          "Ohne Erlaubnis keine automatisierten Systeme für den Zugriff auf unsere Dienste zu verwenden",
        ],
      },
      {
        title: "4. Buchung und Zahlung",
        content:
          "Alle Buchungen werden direkt bei Airlines oder Reisebüros vorgenommen. GoFlyFinder ist nicht verantwortlich für den Buchungsprozess, die Zahlungsabwicklung oder etwaige Probleme, die sich aus Ihrer Transaktion mit Drittanbietern ergeben.",
      },
      {
        title: "5. Preisgenauigkeit",
        content:
          "Obwohl wir uns bemühen, genaue Preise anzuzeigen, können sich Preise ändern und zum Zeitpunkt der Buchung abweichen. Der endgültige Preis wird von der Airline oder dem Reisebüro beim Checkout festgelegt.",
      },
      {
        title: "6. Haftungsbeschränkung",
        content:
          "GoFlyFinder haftet nicht für direkte, indirekte, zufällige oder Folgeschäden, die sich aus der Nutzung unserer Dienste ergeben, einschließlich, aber nicht beschränkt auf Flugstornierungen, Verspätungen oder Buchungsprobleme mit Dritten.",
      },
      {
        title: "7. Geistiges Eigentum",
        content:
          "Alle Inhalte auf GoFlyFinder, einschließlich Logos, Texte, Grafiken und Software, sind Eigentum von GoFlyFinder und durch Gesetze zum Schutz geistigen Eigentums geschützt.",
      },
      {
        title: "8. Änderungen der AGB",
        content:
          "Wir behalten uns das Recht vor, diese Bedingungen jederzeit zu ändern. Die fortgesetzte Nutzung unserer Dienste nach Änderungen gilt als Annahme der neuen Bedingungen.",
      },
      {
        title: "9. Kontakt",
        content:
          "Bei Fragen zu diesen AGB kontaktieren Sie uns unter legal@goflyfinder.com.",
      },
    ],
  },
  cookies: {
    title: "Cookie-Richtlinie",
    lastUpdated: "4. Januar 2026",
    sections: [
      {
        title: "Was sind Cookies?",
        content:
          "Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden, wenn Sie Websites besuchen. Sie helfen uns, Ihre Erfahrung zu verbessern, indem sie Präferenzen speichern und die Nutzung analysieren.",
      },
      {
        title: "Notwendige Cookies",
        content:
          "Diese Cookies sind für die grundlegende Website-Funktionalität unerlässlich und können nicht deaktiviert werden.",
        items: [
          "Sitzungsverwaltung und Sicherheit",
          "Sprach- und Währungspräferenzen",
          "Cookie-Einwilligungspräferenzen",
        ],
      },
      {
        title: "Analyse-Cookies",
        content:
          "Wir verwenden Analyse-Cookies, um zu verstehen, wie Besucher mit unserer Website interagieren. Dies hilft uns, unsere Dienste und die Benutzererfahrung zu verbessern.",
      },
      {
        title: "Marketing-Cookies",
        content:
          "Marketing-Cookies werden verwendet, um relevante Werbung zu liefern und die Wirksamkeit unserer Marketingkampagnen zu verfolgen.",
      },
      {
        title: "Cookie-Einstellungen verwalten",
        content:
          "Sie können Ihre Cookie-Einstellungen jederzeit über die Schaltfläche für Cookie-Einstellungen unten oder über Ihre Browsereinstellungen verwalten.",
      },
    ],
  },
  "affiliate-disclosure": {
    title: "Affiliate-Offenlegung",
    lastUpdated: "4. Januar 2026",
    sections: [
      {
        title: "Unser Engagement für Transparenz",
        content:
          "Bei GoFlyFinder glauben wir an Transparenz darüber, wie wir arbeiten und Geld verdienen. Diese Offenlegung erklärt unsere Affiliate-Beziehungen und wie sie die Inhalte und Empfehlungen auf unserer Plattform beeinflussen können.",
      },
      {
        title: "Wie wir Geld verdienen",
        content:
          "GoFlyFinder ist ein kostenloser Service für Nutzer. Wir verdienen Geld durch Affiliate-Partnerschaften mit Airlines, Reisebüros und anderen reisebezogenen Unternehmen. Wenn Sie auf einen Link klicken und über einen unserer Partner buchen, erhalten wir möglicherweise eine Provision ohne zusätzliche Kosten für Sie.",
      },
      {
        title: "Affiliate-Partner",
        content: "Unsere Affiliate-Partner können umfassen:",
        items: [
          "Große Airlines und Billigfluggesellschaften",
          "Online-Reisebüros (OTAs)",
          "Hotelbuchungsplattformen",
          "Autovermietungen",
          "Reiseversicherungsanbieter",
        ],
      },
      {
        title: "Redaktionelle Unabhängigkeit",
        content:
          "Unsere Affiliate-Beziehungen beeinflussen nicht unsere Suchergebnisse oder Empfehlungen. Wir zeigen Flüge basierend auf Preis, Dauer und anderen objektiven Kriterien an.",
      },
      {
        title: "Keine Mehrkosten für Sie",
        content:
          "Die Nutzung unserer Affiliate-Links erhöht nicht den Preis, den Sie zahlen. Der Preis auf GoFlyFinder ist der gleiche wie direkt bei der Airline oder dem Reisebüro. Unsere Provisionen stammen von den Partnern, nicht von Ihnen.",
      },
      {
        title: "Unterstützung unseres Services",
        content:
          "Indem Sie GoFlyFinder nutzen, um Ihre Flüge zu suchen und zu buchen, unterstützen Sie unseren kostenlosen Service.",
      },
      {
        title: "Fragen?",
        content:
          "Bei Fragen zu unseren Affiliate-Beziehungen kontaktieren Sie uns unter affiliates@goflyfinder.com.",
      },
    ],
  },
  impressum: {
    title: "Impressum",
    lastUpdated: "4. Januar 2026",
    sections: [
      {
        title: "Betreiber der Website",
        content: "GoFlyFinder",
      },
      {
        title: "Kontakt",
        content: "E-Mail: goflyfinder@gmail.com",
      },
      {
        title: "Haftungsausschluss",
        content:
          "GoFlyFinder ist eine Flug- und Hotelvergleichsplattform. Wir verkaufen keine Tickets direkt. Alle Buchungen werden über Drittanbieter-Reisepartner abgewickelt. Angezeigte Preise sind Schätzungen und können zum Zeitpunkt der Buchung abweichen.",
      },
    ],
  },
};

const fr: Record<LegalPageId, LegalPageContent> = {
  "privacy-policy": {
    title: "Politique de Confidentialité",
    lastUpdated: "4 janvier 2026",
    sections: [
      {
        title: "1. Introduction",
        content:
          "GoFlyFinder (« nous ») s'engage à protéger votre vie privée. Cette politique de confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos informations lorsque vous visitez notre site web et utilisez nos services de comparaison de vols.",
      },
      {
        title: "2. Informations collectées",
        content: "Nous pouvons collecter les types d'informations suivants :",
        items: [
          "Informations personnelles (nom, adresse e-mail, numéro de téléphone)",
          "Préférences de voyage et historique de recherche",
          "Informations sur l'appareil et le navigateur",
          "Adresse IP et données de localisation",
          "Cookies et technologies de suivi",
        ],
      },
      {
        title: "3. Utilisation de vos informations",
        content: "Nous utilisons vos informations pour :",
        items: [
          "Fournir et améliorer nos services de comparaison de vols",
          "Personnaliser votre expérience et vos résultats de recherche",
          "Vous envoyer des offres de voyage et des mises à jour pertinentes",
          "Analyser les habitudes d'utilisation pour améliorer notre plateforme",
          "Respecter les obligations légales",
        ],
      },
      {
        title: "4. Partage des informations",
        content:
          "Nous pouvons partager vos informations avec des compagnies aériennes partenaires, des agences de voyage et des prestataires de services tiers pour traiter vos réservations. Nous ne vendons pas vos informations personnelles à des tiers à des fins marketing.",
      },
      {
        title: "5. Sécurité des données",
        content:
          "Nous mettons en œuvre des mesures de sécurité conformes aux normes de l'industrie pour protéger vos informations personnelles.",
      },
      {
        title: "6. Vos droits",
        content:
          "Vous avez le droit d'accéder, de corriger ou de supprimer vos informations personnelles. Vous pouvez également vous désabonner des communications marketing à tout moment.",
      },
      {
        title: "7. Contact",
        content:
          "Pour toute question concernant cette politique de confidentialité, contactez-nous à goflyfinder@gmail.com.",
      },
    ],
  },
  "terms-and-conditions": {
    title: "Conditions Générales d'Utilisation",
    lastUpdated: "4 janvier 2026",
    sections: [
      {
        title: "1. Acceptation des conditions",
        content:
          "En accédant et en utilisant GoFlyFinder, vous acceptez d'être lié par ces conditions générales. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.",
      },
      {
        title: "2. Description du service",
        content:
          "GoFlyFinder est une plateforme de comparaison de vols permettant aux utilisateurs de rechercher et comparer les prix des vols de différentes compagnies aériennes et agences de voyage. Nous ne vendons pas de billets directement.",
      },
      {
        title: "3. Responsabilités de l'utilisateur",
        content: "En tant qu'utilisateur, vous vous engagez à :",
        items: [
          "Fournir des informations exactes lors de l'utilisation de nos services",
          "Utiliser la plateforme uniquement à des fins légales",
          "Ne pas tenter d'interférer avec la fonctionnalité de la plateforme",
          "Ne pas utiliser de systèmes automatisés pour accéder à nos services sans autorisation",
        ],
      },
      {
        title: "4. Réservation et paiements",
        content:
          "Toutes les réservations sont effectuées directement auprès des compagnies aériennes ou des agences de voyage. GoFlyFinder n'est pas responsable du processus de réservation.",
      },
      {
        title: "5. Exactitude des prix",
        content:
          "Bien que nous nous efforcions d'afficher des prix exacts, les prix sont susceptibles de changer. Le prix final est déterminé par la compagnie aérienne ou l'agence de voyage.",
      },
      {
        title: "6. Limitation de responsabilité",
        content:
          "GoFlyFinder n'est pas responsable des dommages directs, indirects ou consécutifs résultant de l'utilisation de nos services.",
      },
      {
        title: "7. Propriété intellectuelle",
        content:
          "Tout le contenu de GoFlyFinder est la propriété de GoFlyFinder et est protégé par les lois sur la propriété intellectuelle.",
      },
      {
        title: "8. Modifications",
        content:
          "Nous nous réservons le droit de modifier ces conditions à tout moment. L'utilisation continue de nos services après modification vaut acceptation.",
      },
      {
        title: "9. Contact",
        content:
          "Pour toute question, contactez-nous à legal@goflyfinder.com.",
      },
    ],
  },
  cookies: {
    title: "Politique de Cookies",
    lastUpdated: "4 janvier 2026",
    sections: [
      {
        title: "Que sont les cookies ?",
        content:
          "Les cookies sont de petits fichiers texte stockés sur votre appareil lorsque vous visitez des sites web. Ils nous aident à améliorer votre expérience.",
      },
      {
        title: "Cookies nécessaires",
        content:
          "Ces cookies sont essentiels au fonctionnement de base du site et ne peuvent pas être désactivés.",
        items: [
          "Gestion des sessions et sécurité",
          "Préférences de langue et de devise",
          "Préférences de consentement aux cookies",
        ],
      },
      {
        title: "Cookies analytiques",
        content:
          "Nous utilisons des cookies analytiques pour comprendre comment les visiteurs interagissent avec notre site web.",
      },
      {
        title: "Cookies marketing",
        content:
          "Les cookies marketing sont utilisés pour diffuser des publicités pertinentes et suivre l'efficacité de nos campagnes.",
      },
      {
        title: "Gérer vos cookies",
        content:
          "Vous pouvez gérer vos préférences de cookies à tout moment via les paramètres ci-dessous ou dans les paramètres de votre navigateur.",
      },
    ],
  },
  "affiliate-disclosure": {
    title: "Divulgation d'Affiliation",
    lastUpdated: "4 janvier 2026",
    sections: [
      {
        title: "Notre engagement pour la transparence",
        content:
          "Chez GoFlyFinder, nous croyons en la transparence sur notre fonctionnement et nos revenus.",
      },
      {
        title: "Comment nous gagnons de l'argent",
        content:
          "GoFlyFinder est un service gratuit pour les utilisateurs. Nous gagnons de l'argent grâce à des partenariats d'affiliation avec des compagnies aériennes, des agences de voyage et d'autres entreprises liées au voyage.",
      },
      {
        title: "Partenaires affiliés",
        content: "Nos partenaires affiliés peuvent inclure :",
        items: [
          "Compagnies aériennes majeures et low-cost",
          "Agences de voyage en ligne (OTA)",
          "Plateformes de réservation d'hôtels",
          "Sociétés de location de voitures",
          "Fournisseurs d'assurance voyage",
        ],
      },
      {
        title: "Indépendance éditoriale",
        content:
          "Nos relations d'affiliation n'influencent pas nos résultats de recherche ou nos recommandations.",
      },
      {
        title: "Aucun coût supplémentaire pour vous",
        content:
          "L'utilisation de nos liens d'affiliation n'augmente pas le prix que vous payez.",
      },
      {
        title: "Questions ?",
        content:
          "Pour toute question sur nos relations d'affiliation, contactez-nous à affiliates@goflyfinder.com.",
      },
    ],
  },
  impressum: {
    title: "Mentions Légales",
    lastUpdated: "4 janvier 2026",
    sections: [
      {
        title: "Opérateur du site",
        content: "GoFlyFinder",
      },
      {
        title: "Contact",
        content: "Email : goflyfinder@gmail.com",
      },
      {
        title: "Avertissement",
        content:
          "GoFlyFinder est une plateforme de comparaison de vols et d'hôtels. Nous ne vendons pas de billets directement. Toutes les réservations sont traitées par des partenaires de voyage tiers.",
      },
    ],
  },
};

const es: Record<LegalPageId, LegalPageContent> = {
  "privacy-policy": {
    title: "Política de Privacidad",
    lastUpdated: "4 de enero de 2026",
    sections: [
      {
        title: "1. Introducción",
        content:
          'GoFlyFinder ("nosotros") se compromete a proteger su privacidad. Esta política de privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información.',
      },
      {
        title: "2. Información que recopilamos",
        content: "Podemos recopilar los siguientes tipos de información:",
        items: [
          "Información personal (nombre, dirección de correo electrónico, número de teléfono)",
          "Preferencias de viaje e historial de búsqueda",
          "Información del dispositivo y del navegador",
          "Dirección IP y datos de ubicación",
          "Cookies y tecnologías de seguimiento",
        ],
      },
      {
        title: "3. Cómo usamos su información",
        content: "Usamos su información para:",
        items: [
          "Proporcionar y mejorar nuestros servicios de comparación de vuelos",
          "Personalizar su experiencia y resultados de búsqueda",
          "Enviarle ofertas de viaje y actualizaciones relevantes",
          "Analizar patrones de uso para mejorar nuestra plataforma",
          "Cumplir con obligaciones legales",
        ],
      },
      {
        title: "4. Compartir información",
        content:
          "Podemos compartir su información con aerolíneas asociadas, agencias de viajes y proveedores de servicios de terceros. No vendemos su información personal a terceros con fines de marketing.",
      },
      {
        title: "5. Seguridad de datos",
        content:
          "Implementamos medidas de seguridad estándar de la industria para proteger su información personal.",
      },
      {
        title: "6. Sus derechos",
        content:
          "Tiene derecho a acceder, corregir o eliminar su información personal. También puede cancelar las comunicaciones de marketing en cualquier momento.",
      },
      {
        title: "7. Contacto",
        content:
          "Si tiene preguntas sobre esta política de privacidad, contáctenos en goflyfinder@gmail.com.",
      },
    ],
  },
  "terms-and-conditions": {
    title: "Términos y Condiciones",
    lastUpdated: "4 de enero de 2026",
    sections: [
      {
        title: "1. Aceptación de los términos",
        content:
          "Al acceder y utilizar GoFlyFinder, usted acepta estos términos y condiciones. Si no está de acuerdo, no utilice nuestros servicios.",
      },
      {
        title: "2. Descripción del servicio",
        content:
          "GoFlyFinder es una plataforma de comparación de vuelos. No vendemos boletos directamente; redirigimos a los usuarios a proveedores externos.",
      },
      {
        title: "3. Responsabilidades del usuario",
        content: "Como usuario, usted se compromete a:",
        items: [
          "Proporcionar información precisa al utilizar nuestros servicios",
          "Utilizar la plataforma solo con fines legales",
          "No intentar interferir con la funcionalidad de la plataforma",
          "No usar sistemas automatizados para acceder a nuestros servicios sin permiso",
        ],
      },
      {
        title: "4. Reservas y pagos",
        content:
          "Todas las reservas se realizan directamente con aerolíneas o agencias de viajes. GoFlyFinder no es responsable del proceso de reserva.",
      },
      {
        title: "5. Precisión de precios",
        content:
          "Aunque nos esforzamos por mostrar precios precisos, los precios están sujetos a cambios. El precio final lo determina la aerolínea o la agencia de viajes.",
      },
      {
        title: "6. Limitación de responsabilidad",
        content:
          "GoFlyFinder no es responsable de daños directos, indirectos o consecuentes derivados del uso de nuestros servicios.",
      },
      {
        title: "7. Propiedad intelectual",
        content:
          "Todo el contenido de GoFlyFinder es propiedad de GoFlyFinder y está protegido por las leyes de propiedad intelectual.",
      },
      {
        title: "8. Cambios en los términos",
        content:
          "Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado constituye aceptación.",
      },
      {
        title: "9. Contacto",
        content:
          "Para preguntas sobre estos términos, contáctenos en legal@goflyfinder.com.",
      },
    ],
  },
  cookies: {
    title: "Política de Cookies",
    lastUpdated: "4 de enero de 2026",
    sections: [
      {
        title: "¿Qué son las cookies?",
        content:
          "Las cookies son pequeños archivos de texto almacenados en su dispositivo cuando visita sitios web.",
      },
      {
        title: "Cookies necesarias",
        content:
          "Estas cookies son esenciales para la funcionalidad básica del sitio web.",
        items: [
          "Gestión de sesiones y seguridad",
          "Preferencias de idioma y moneda",
          "Preferencias de consentimiento de cookies",
        ],
      },
      {
        title: "Cookies analíticas",
        content:
          "Usamos cookies analíticas para entender cómo los visitantes interactúan con nuestro sitio web.",
      },
      {
        title: "Cookies de marketing",
        content:
          "Las cookies de marketing se utilizan para ofrecer anuncios relevantes.",
      },
      {
        title: "Gestionar sus cookies",
        content:
          "Puede gestionar sus preferencias de cookies en cualquier momento a través de la configuración a continuación o la configuración de su navegador.",
      },
    ],
  },
  "affiliate-disclosure": {
    title: "Divulgación de Afiliados",
    lastUpdated: "4 de enero de 2026",
    sections: [
      {
        title: "Nuestro compromiso con la transparencia",
        content:
          "En GoFlyFinder creemos en la transparencia sobre cómo operamos y ganamos dinero.",
      },
      {
        title: "Cómo ganamos dinero",
        content:
          "GoFlyFinder es un servicio gratuito. Ganamos dinero a través de asociaciones de afiliados con aerolíneas, agencias de viajes y otras empresas relacionadas con el viaje.",
      },
      {
        title: "Socios afiliados",
        content: "Nuestros socios afiliados pueden incluir:",
        items: [
          "Aerolíneas principales y de bajo costo",
          "Agencias de viajes en línea (OTAs)",
          "Plataformas de reserva de hoteles",
          "Empresas de alquiler de coches",
          "Proveedores de seguros de viaje",
        ],
      },
      {
        title: "Independencia editorial",
        content:
          "Nuestras relaciones de afiliación no influyen en nuestros resultados de búsqueda o recomendaciones.",
      },
      {
        title: "Sin costo adicional para usted",
        content:
          "El uso de nuestros enlaces de afiliados no aumenta el precio que paga.",
      },
      {
        title: "¿Preguntas?",
        content:
          "Para preguntas sobre nuestras relaciones de afiliados, contáctenos en affiliates@goflyfinder.com.",
      },
    ],
  },
  impressum: {
    title: "Aviso Legal",
    lastUpdated: "4 de enero de 2026",
    sections: [
      {
        title: "Operador del sitio",
        content: "GoFlyFinder",
      },
      {
        title: "Contacto",
        content: "Email: goflyfinder@gmail.com",
      },
      {
        title: "Descargo de responsabilidad",
        content:
          "GoFlyFinder es una plataforma de comparación de vuelos y hoteles. No vendemos boletos directamente. Todas las reservas se procesan a través de socios de viaje externos.",
      },
    ],
  },
};

export const legalContent: Record<
  string,
  Record<LegalPageId, LegalPageContent>
> = { en, de, fr, es };

export const supportedLegalLocales = Object.keys(legalContent);

export function getLegalContent(
  locale: string,
  pageId: LegalPageId
): LegalPageContent {
  const loc = legalContent[locale]?.[pageId];
  if (loc) return loc;
  return legalContent.en[pageId];
}
