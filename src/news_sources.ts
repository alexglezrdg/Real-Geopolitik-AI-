/**
 * News Sources Configuration
 * RSS feeds for geopolitical news with LatAm priority
 */

export type NewsSource = {
  id: string;
  name: string;
  url: string;
  region: "latam" | "global" | "us";
  priority: 1 | 2 | 3; // 1=highest, 3=lowest
  reliability: "high" | "medium"; // for dedup score
};

export const NEWS_SOURCES: NewsSource[] = [
  // LATAM Priority (region: latam, priority: 1)
  {
    id: "bbc-mundo",
    name: "BBC Mundo",
    url: "https://www.bbc.com/mundo/index.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "rfi-espanol",
    name: "RFI Español",
    url: "https://www.rfi.fr/es/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "france24-espanol",
    name: "France 24 Español",
    url: "https://www.france24.com/es/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elpaís-america",
    name: "El País América",
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "lanacion-argentina",
    name: "La Nación Argentina",
    url: "https://www.lanacion.com.ar/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "infobae-latam",
    name: "Infobae Latinoamérica",
    url: "https://www.infobae.com/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // Global / International (priority: 2)
  {
    id: "aljazeera-world",
    name: "Al Jazeera English",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "aljazeera-espanol",
    name: "Al Jazeera Español",
    url: "https://www.aljazeera.com/xml/rss/es/all.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "dw-english",
    name: "DW English",
    url: "https://www.dw.com/en/top-stories/s-9097",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "dw-espanol",
    name: "DW Español",
    url: "https://www.dw.com/es/portada/s-9058",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "theguardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "npr-world",
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "reuters-world",
    name: "Reuters World News",
    url: "https://feeds.reuters.com/reuters/worldNews",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "ap-news-world",
    name: "AP News - World",
    url: "https://apnews.com/hub/world-news",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "politico-world",
    name: "Politico International",
    url: "https://www.politico.com/politico-today/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },

  // Google News RSS: Cuba + Trump Naval Blockade (high-signal, real-time)
  {
    id: "google-news-cuba-trump",
    name: "Google News - Cuba Trump",
    url: "https://news.google.com/rss/search?q=Trump%20bloqueo%20naval%20Cuba&hl=es-419&gl=US&ceid=US:es-419",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // CUBA NOTICIAS - DIRECT FEEDS (Priority 1)
  {
    id: "radiohabana-cuba",
    name: "Radio Habana Cuba - Spanish",
    url: "https://www.radiohc.cu/es/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "oncuba-news",
    name: "OnCubaNews",
    url: "https://oncubanews.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "havana-times",
    name: "Havana Times",
    url: "https://havanatimes.org/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // US / DEFENSA / MILITAR
  {
    id: "militarytimes",
    name: "Military Times News",
    url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml",
    region: "us",
    priority: 2,
    reliability: "high"
  },
  {
    id: "defensenews",
    name: "Defense News Global",
    url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
    region: "us",
    priority: 2,
    reliability: "high"
  },

  // IRAN NEWS (BRICS ally geopolitics)
  {
    id: "presstv-iran",
    name: "Press TV - Iran",
    url: "https://www.presstv.ir/rss.xml",
    region: "global",
    priority: 2,
    reliability: "medium"
  },

  // CHINA NEWS ENGLISH
  {
    id: "scmp-china",
    name: "South China Morning Post",
    url: "https://www.scmp.com/rss/91/feed",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "cgtn-world",
    name: "CGTN World",
    url: "https://www.cgtn.com/subscribe/rss/section/world.xml",
    region: "global",
    priority: 2,
    reliability: "medium"
  },

  // BREAKING NEWS AGGREGATORS
  {
    id: "cnn-world",
    name: "CNN World News",
    url: "http://rss.cnn.com/rss/edition_world.rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "nbcnews-world",
    name: "NBC News World",
    url: "https://feeds.nbcnews.com/nbcnews/public/world",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "telesur-english",
    name: "TeleSUR English",
    url: "https://www.telesurenglish.net/rss",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "mexiconewsdaily",
    name: "Mexico News Daily",
    url: "https://mexiconewsdaily.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "brasilwire",
    name: "Brasil Wire",
    url: "https://www.brasilwire.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "laprensa-panama",
    name: "La Prensa Panamá",
    url: "https://www.prensa.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "rt-espanol",
    name: "RT en Español",
    url: "https://actualidad.rt.com/rss",
    region: "global",
    priority: 2,
    reliability: "medium"
  },
  {
    id: "sputnik-mundo",
    name: "Sputnik Mundo",
    url: "https://sputniknews.lat/export/rss2/archive/index.xml",
    region: "latam",
    priority: 2,
    reliability: "medium"
  },
  {
    id: "ansa-latam",
    name: "ANSA Latinoamérica",
    url: "https://www.ansa.it/sito/ansait_rss.xml",
    region: "latam",
    priority: 2,
    reliability: "high"
  },
  {
    id: "efe-latam",
    name: "EFE América",
    url: "https://www.efe.com/efe/america/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // ========== EXPANSIÓN MASIVA: 70+ NUEVAS FUENTES ==========
  
  // LATAM - ARGENTINA
  {
    id: "clarin-argentina",
    name: "Clarín Argentina",
    url: "https://www.clarin.com/rss/lo-ultimo/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "pagina12-argentina",
    name: "Página 12 Argentina",
    url: "https://www.pagina12.com.ar/rss/portada",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "perfil-argentina",
    name: "Perfil Argentina",
    url: "https://www.perfil.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - BRASIL
  {
    id: "folha-brasil",
    name: "Folha de S.Paulo",
    url: "https://www1.folha.uol.com.br/rss/mundo.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "globo-brasil",
    name: "O Globo Brasil",
    url: "https://oglobo.globo.com/rss.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "uol-brasil",
    name: "UOL Notícias Brasil",
    url: "https://rss.uol.com.br/feed/noticias.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - CHILE
  {
    id: "emol-chile",
    name: "Emol Chile",
    url: "https://www.emol.com/rss/rss.asp",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "latercera-chile",
    name: "La Tercera Chile",
    url: "https://www.latercera.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elmostrador-chile",
    name: "El Mostrador Chile",
    url: "https://www.elmostrador.cl/noticias/feed/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },

  // LATAM - COLOMBIA
  {
    id: "eltiempo-colombia",
    name: "El Tiempo Colombia",
    url: "https://www.eltiempo.com/rss/politica.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elespectador-colombia",
    name: "El Espectador Colombia",
    url: "https://www.elespectador.com/rss/politica",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "semana-colombia",
    name: "Semana Colombia",
    url: "https://www.semana.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - MÉXICO
  {
    id: "proceso-mexico",
    name: "Proceso México",
    url: "https://www.proceso.com.mx/feed",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "reforma-mexico",
    name: "Reforma México",
    url: "https://www.reforma.com/rss/portada.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "excelsior-mexico",
    name: "Excélsior México",
    url: "https://www.excelsior.com.mx/rss.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "jornada-mexico",
    name: "La Jornada México",
    url: "https://www.jornada.com.mx/rss/edicion.xml",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "milenio-mexico",
    name: "Milenio México",
    url: "https://www.milenio.com/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - PERÚ
  {
    id: "elcomercio-peru",
    name: "El Comercio Perú",
    url: "https://elcomercio.pe/rss/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "rpp-peru",
    name: "RPP Noticias Perú",
    url: "https://rpp.pe/feed",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "larepublica-peru",
    name: "La República Perú",
    url: "https://larepublica.pe/rss/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },

  // LATAM - VENEZUELA
  {
    id: "efectococuyo-venezuela",
    name: "Efecto Cocuyo Venezuela",
    url: "https://efectococuyo.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elpitazo-venezuela",
    name: "El Pitazo Venezuela",
    url: "https://elpitazo.net/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "runrun-venezuela",
    name: "Runrunes Venezuela",
    url: "https://runrun.es/feed/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },

  // LATAM - ECUADOR
  {
    id: "eluniverso-ecuador",
    name: "El Universo Ecuador",
    url: "https://www.eluniverso.com/rss/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elcomercio-ecuador",
    name: "El Comercio Ecuador",
    url: "https://www.elcomercio.com/rss/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - URUGUAY
  {
    id: "elpais-uruguay",
    name: "El País Uruguay",
    url: "https://www.elpais.com.uy/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elobservador-uruguay",
    name: "El Observador Uruguay",
    url: "https://www.elobservador.com.uy/rss/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - BOLIVIA
  {
    id: "paginasiete-bolivia",
    name: "Página Siete Bolivia",
    url: "https://www.paginasiete.bo/rss.xml",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "eldeber-bolivia",
    name: "El Deber Bolivia",
    url: "https://eldeber.com.bo/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - CENTROAMÉRICA
  {
    id: "laprensagrafica-elsalvador",
    name: "La Prensa Gráfica El Salvador",
    url: "https://www.laprensagrafica.com/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "elheraldo-honduras",
    name: "El Heraldo Honduras",
    url: "https://www.elheraldo.hn/rss",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "laprensa-nicaragua",
    name: "La Prensa Nicaragua",
    url: "https://www.laprensa.com.ni/feed/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },
  {
    id: "nacion-costarica",
    name: "La Nación Costa Rica",
    url: "https://www.nacion.com/rss/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "prensalibre-guatemala",
    name: "Prensa Libre Guatemala",
    url: "https://www.prensalibre.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },

  // LATAM - CARIBE
  {
    id: "jamaicaobserver",
    name: "Jamaica Observer",
    url: "http://www.jamaicaobserver.com/rss/news",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "dominicantoday",
    name: "Dominican Today",
    url: "https://dominicantoday.com/dr/feed/",
    region: "latam",
    priority: 1,
    reliability: "high"
  },
  {
    id: "caribbean360",
    name: "Caribbean360",
    url: "https://www.caribbean360.com/feed/",
    region: "latam",
    priority: 1,
    reliability: "medium"
  },

  // GLOBAL - EUROPA
  {
    id: "euronews-world",
    name: "Euronews World",
    url: "https://www.euronews.com/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "france24-english",
    name: "France 24 English",
    url: "https://www.france24.com/en/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "rfi-english",
    name: "RFI English",
    url: "https://www.rfi.fr/en/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "dw-world",
    name: "DW World News",
    url: "https://rss.dw.com/rdf/rss-en-world",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "lemonde-france",
    name: "Le Monde International",
    url: "https://www.lemonde.fr/international/rss_full.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "elpais-espana",
    name: "El País España Internacional",
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "independent-uk",
    name: "The Independent UK",
    url: "https://www.independent.co.uk/news/world/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "telegraph-world",
    name: "The Telegraph World",
    url: "https://www.telegraph.co.uk/news/world/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },

  // GLOBAL - ASIA
  {
    id: "japantimes",
    name: "Japan Times",
    url: "https://www.japantimes.co.jp/feed/",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "koreatimes",
    name: "Korea Times",
    url: "https://www.koreatimes.co.kr/www/rss/nation.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "straitstimes-singapore",
    name: "Straits Times Singapore",
    url: "https://www.straitstimes.com/news/world/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "thenews-pakistan",
    name: "The News Pakistan",
    url: "https://www.thenews.com.pk/rss/1/1",
    region: "global",
    priority: 2,
    reliability: "medium"
  },
  {
    id: "hindustantimes-india",
    name: "Hindustan Times India",
    url: "https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "timesofindia",
    name: "Times of India World",
    url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms",
    region: "global",
    priority: 2,
    reliability: "high"
  },

  // GLOBAL - MIDDLE EAST
  {
    id: "haaretz-israel",
    name: "Haaretz Israel",
    url: "https://www.haaretz.com/cmlink/1.628752",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "timesofisrael",
    name: "Times of Israel",
    url: "https://www.timesofisrael.com/feed/",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "arabnews",
    name: "Arab News",
    url: "https://www.arabnews.com/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "thenational-uae",
    name: "The National UAE",
    url: "https://www.thenationalnews.com/rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "middleeasteye",
    name: "Middle East Eye",
    url: "https://www.middleeasteye.net/rss",
    region: "global",
    priority: 2,
    reliability: "medium"
  },

  // GLOBAL - AFRICA
  {
    id: "dailymaverick-southafrica",
    name: "Daily Maverick South Africa",
    url: "https://www.dailymaverick.co.za/dmrss/",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "allafrica",
    name: "AllAfrica News",
    url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf",
    region: "global",
    priority: 2,
    reliability: "medium"
  },
  {
    id: "theafricareport",
    name: "The Africa Report",
    url: "https://www.theafricareport.com/feed/",
    region: "global",
    priority: 2,
    reliability: "high"
  },

  // GLOBAL - RUSSIA
  {
    id: "themoscowtimes",
    name: "The Moscow Times",
    url: "https://www.themoscowtimes.com/rss/news",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "tass-russia",
    name: "TASS Russia",
    url: "https://tass.com/rss/v2.xml",
    region: "global",
    priority: 2,
    reliability: "medium"
  },

  // US - Additional Sources
  {
    id: "nytimes-world",
    name: "New York Times World",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    region: "us",
    priority: 2,
    reliability: "high"
  },
  {
    id: "washingtonpost-world",
    name: "Washington Post World",
    url: "https://feeds.washingtonpost.com/rss/world",
    region: "us",
    priority: 2,
    reliability: "high"
  },
  {
    id: "wsj-world",
    name: "Wall Street Journal World",
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    region: "us",
    priority: 2,
    reliability: "high"
  },
  {
    id: "foreignpolicy",
    name: "Foreign Policy Magazine",
    url: "https://foreignpolicy.com/feed/",
    region: "us",
    priority: 2,
    reliability: "high"
  },
  {
    id: "thehill-international",
    name: "The Hill International",
    url: "https://thehill.com/rss/syndicator/19109",
    region: "us",
    priority: 2,
    reliability: "high"
  },

  // SPECIALIZED - Defense & Security
  {
    id: "janes-defense",
    name: "Janes Defense",
    url: "https://www.janes.com/feeds/news",
    region: "global",
    priority: 3,
    reliability: "high"
  },
  {
    id: "defenseone",
    name: "Defense One",
    url: "https://www.defenseone.com/rss/",
    region: "us",
    priority: 2,
    reliability: "high"
  },

  // SPECIALIZED - Economics & Trade
  {
    id: "ft-world",
    name: "Financial Times World",
    url: "https://www.ft.com/world?format=rss",
    region: "global",
    priority: 2,
    reliability: "high"
  },
  {
    id: "economist-world",
    name: "The Economist World",
    url: "https://www.economist.com/international/rss.xml",
    region: "global",
    priority: 2,
    reliability: "high"
  },

  // Alternative & Regional
  {
    id: "counterpunch",
    name: "CounterPunch",
    url: "https://www.counterpunch.org/feed/",
    region: "us",
    priority: 3,
    reliability: "medium"
  },
  {
    id: "commondreams",
    name: "Common Dreams",
    url: "https://www.commondreams.org/feeds/feed.rss",
    region: "us",
    priority: 3,
    reliability: "medium"
  }
];

// Keywords that signal geopolitical importance
export const GEOPOLITICS_KEYWORDS = [
  // Conflict & war
  "guerra", "conflicto", "guerra civil", "invasión", "ataque militar",
  "bomba", "misil", "artillería", "ejército", "defensa",

  // Diplomacy & politics
  "sanciones", "embajada", "embargo", "negociación", "tratado",
  "acuerdo", "diplomacia", "cumbre", "congreso", "senado",
  "elecciones", "voto", "referéndum", "golpe", "coup",

  // Economic & trade
  "aranceles", "comercio", "bloqueo", "exportación", "importación",
  "petróleo", "energía", "crudo", "gas", "economía", "inversión",

  // Regions & orgs
  "ONU", "OEA", "OTAN", "MERCOSUR", "ALBA", "BRICS",
  "Naciones Unidas", "Organización de Naciones",

  // Migration & borders
  "migración", "frontera", "caravana", "refugiados", "asilo",
  "visa", "control fronterizo",

  // Crisis & emergency
  "crisis", "golpe", "protestas", "manifestación", "bloqueo",
  "estado de emergencia", "desastre", "catástrofe"
];

// LatAm-specific keywords (boost if found)
export const LATAM_KEYWORDS = [
  "Cuba", "Venezuela", "Haití", "México", "Brasil",
  "Colombia", "Argentina", "Chile", "Perú", "Ecuador",
  "Bolivia", "República Dominicana", "Panamá", "Guatemala",
  "Honduras", "Nicaragua", "El Salvador", "Costa Rica",
  "Paraguay", "Uruguay", "Belize", "Jamaica", "Trinidad",

  // Regional mentions
  "América Latina", "Caribe", "Latinoamérica", "EEUU",
  "Hispanoamérica", "Sudamérica", "Centroamérica"
];

// Keywords to avoid (opinion, lifestyle, sports)
export const EXCLUDE_KEYWORDS = [
  "deporte", "sport", "fútbol", "soccer", "opinión", "opinion",
  "análisis", "analysis", "culturalifestyle", "entretenimiento",
  "cine", "película", "música", "cantante", "actor",
  "resena", "review", "belleza", "moda", "fashion",
  "receta", "cocina", "viaje", "viajes", "turismo"
];

export function isGeopoliticallyRelevant(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  // If it matches exclude keywords, it's not relevant
  if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) {
    return false;
  }

  // Must have at least one geopolitics keyword
  return GEOPOLITICS_KEYWORDS.some(kw => text.includes(kw));
}

export function hasLatAmMention(text: string): boolean {
  return LATAM_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}
