export type GuideLanguage = "en" | "es";

export type GuideSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type GuideCluster =
  | "reading-speed"
  | "fast-reading"
  | "lectura-rapida"
  | "comprension";

export type GuideCrossLink = {
  slug: string;
  reason: string;
};

export type GuideFaq = {
  question: string;
  answer: string;
};

export type Guide = {
  slug: string;
  language: GuideLanguage;
  languageLabel: string;
  cluster: GuideCluster;
  clusterLabel: string;
  title: string;
  description: string;
  intro: string;
  readingTime: string;
  audience: string;
  keyTakeaways: string[];
  keywords: string[];
  sections: GuideSection[];
  faqs: GuideFaq[];
  readingPath: GuideCrossLink[];
  relatedSlugs: string[];
};

export const guides: readonly Guide[] = [
  {
    slug: "reading-speed-for-real-documents",
    language: "en",
    languageLabel: "English guide",
    cluster: "reading-speed",
    clusterLabel: "Reading speed",
    title: "Reading Speed for Real Documents",
    description:
      "A practical guide for people searching reading speed advice that actually works on PDFs, reports, academic papers, and long-form documents.",
    intro:
      "Reading speed improves when the document, the pacing, and the recovery path all work together. Real reading is not a stopwatch exercise. It is a control problem: how quickly you can move while still understanding structure, argument, and detail.",
    readingTime: "6 min read",
    audience:
      "Best for readers working through PDFs, research papers, reports, and study material that feel slower than they should.",
    keyTakeaways: [
      "Reading speed is more useful on real documents when you can change pace without losing structure.",
      "The first gains usually come from less hesitation and cleaner visual flow, not forced extreme speed.",
      "A document-aware reader makes speed more sustainable because it protects recovery and comprehension.",
    ],
    keywords: [
      "reading speed",
      "reading speed for PDFs",
      "read documents faster",
      "reading speed app",
    ],
    sections: [
      {
        id: "reading-speed-real-world",
        title: "What reading speed means outside toy demos",
        paragraphs: [
          "A lot of reading speed advice is measured on short snippets that are too clean to resemble real work. Reports, research papers, contracts, and study material are different. They contain headings, jargon, citations, interruptions in rhythm, and sections that deserve slower review.",
          "That means the useful question is not simply how many words per minute you can hit. The better question is whether you can move through a real document with less friction, fewer unnecessary regressions, and better control over when to speed up or slow down.",
        ],
      },
      {
        id: "reading-speed-control",
        title: "How to raise reading speed without losing your place",
        paragraphs: [
          "The first improvement usually comes from reducing hesitation, not from forcing extreme speed. If you can keep visual attention moving, group words more naturally, and return to a passage without getting disoriented, your reading speed becomes more stable almost immediately.",
          "This is where document-aware reading tools matter. A clear focus mode helps you stay in motion. A phrase-based mode helps you see structure instead of isolated words. A classic mode gives full context back when the material becomes dense or technical.",
        ],
        bullets: [
          "Start with a pace that feels slightly ambitious, not chaotic.",
          "Treat phrase groups as the unit of progress instead of single words.",
          "Slow down on diagrams, formulas, and dense transitions instead of pretending every line should move at the same speed.",
          "Use bookmarks or highlights so review is deliberate instead of anxious rereading.",
        ],
      },
      {
        id: "reading-speed-workflow",
        title: "A realistic workflow for faster reading",
        paragraphs: [
          "A realistic reading-speed workflow has phases. First, you open the document and establish rhythm. Second, you accelerate through familiar or structurally clear material. Third, you deliberately slow down where the argument turns technical, novel, or high stakes.",
          "That sounds simple, but most generic viewers do not support it well. If every adjustment costs attention, then readers default to a flat speed and compensate with random rereading. A better workflow keeps your place, your markers, and your fallback context close by.",
        ],
      },
      {
        id: "reading-speed-leyendo",
        title: "Why Leyendo targets reading speed on real documents",
        paragraphs: [
          "Leyendo is designed around this practical version of reading speed. You can import PDFs and document files, switch views depending on the material, and keep progress tied to the document instead of losing it between sessions.",
          "That matters for search intent too. People searching reading speed often do not want theory alone. They want a way to read faster that respects comprehension, supports real files, and makes return trips easier. That is exactly the gap Leyendo is built to cover.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can reading speed improve without speed-reading tricks?",
        answer:
          "Yes. Many readers improve by reducing hesitation, grouping language more naturally, and using better recovery tools rather than forcing extreme word-per-minute targets.",
      },
      {
        question: "Does faster reading always hurt comprehension?",
        answer:
          "No. Comprehension usually suffers when pace rises without control. A moderate increase paired with better structure awareness can improve both pace and understanding.",
      },
      {
        question:
          "What kind of material benefits most from a reading speed tool?",
        answer:
          "Dense PDFs, reports, articles, and study material benefit most because they create the most friction when you try to read them in a generic viewer.",
      },
    ],
    readingPath: [
      {
        slug: "fast-reading-without-losing-comprehension",
        reason:
          "Read this next if your bigger concern is speed with retention rather than raw pace alone.",
      },
      {
        slug: "lectura-rapida-para-documentos-reales",
        reason:
          "Use the Spanish counterpart when you want equivalent framing for lectura rapida search intent.",
      },
    ],
    relatedSlugs: [
      "fast-reading-without-losing-comprehension",
      "lectura-rapida-para-documentos-reales",
    ],
  },
  {
    slug: "fast-reading-without-losing-comprehension",
    language: "en",
    languageLabel: "English guide",
    cluster: "fast-reading",
    clusterLabel: "Fast reading",
    title: "Fast Reading Without Losing Comprehension",
    description:
      "A grounded fast reading guide for people who want to read faster while still understanding arguments, structure, and important details.",
    intro:
      "Fast reading only becomes useful when it helps you finish with judgment intact. The real target is not theatrical speed. The target is forward momentum with enough understanding to make decisions, compare sources, and remember what mattered.",
    readingTime: "7 min read",
    audience:
      "Best for readers who want to move faster through dense text without turning every session into shallow skimming.",
    keyTakeaways: [
      "Fast reading becomes sustainable when pace changes are matched to text difficulty.",
      "Comprehension improves when you reduce friction and preserve context instead of forcing uniform speed.",
      "The best workflow combines a faster view, a fallback context view, and deliberate review anchors.",
    ],
    keywords: [
      "fast reading",
      "read faster",
      "fast reading comprehension",
      "how to read faster",
    ],
    sections: [
      {
        id: "fast-reading-fake-advice",
        title: "Why most fast reading advice feels fake",
        paragraphs: [
          "A lot of fast reading content treats reading like a performance metric. The tips sound clean, but they break down as soon as the text becomes technical, messy, or genuinely important. Readers end up oscillating between forced speed and frustrated rereading.",
          "The missing piece is control. If the tool or technique gives you no way to change pacing, regroup attention, or recover context, then fast reading becomes fragile. It only works on easy passages and falls apart on real work.",
        ],
      },
      {
        id: "fast-reading-what-works",
        title: "What actually helps you read faster",
        paragraphs: [
          "The readers who improve most tend to simplify the path through the page. They reduce visual clutter, keep their eyes moving, and use the right view for the current level of difficulty. That turns fast reading into a sustainable workflow instead of a short burst.",
          "Comprehension also improves when you stop overreacting to every sentence. A steady rhythm makes it easier to notice topic shifts, emphasis, and argument flow. In other words, a cleaner pace can help meaning emerge more clearly, not less.",
        ],
        bullets: [
          "Use guided pacing when attention is unstable.",
          "Switch to phrase or line grouping when the text is structured but dense.",
          "Open a classic full-context view for passages that deserve slower close reading.",
          "Save return points so revision happens on purpose instead of from panic.",
        ],
      },
      {
        id: "fast-reading-memory",
        title: "Why comprehension and memory do not have to collapse",
        paragraphs: [
          "Readers often assume speed and comprehension always trade off linearly, but real reading is more nuanced. When rhythm improves, the mind can hold larger units of meaning together. That often makes it easier to remember the structure of a passage even if the pace is moderately higher.",
          "The collapse usually happens when speed outruns control. If you cannot bookmark, pause, regroup, or reopen the passage with full context, then memory suffers because the reading session has no recovery path. A stronger workflow prevents that slide.",
        ],
      },
      {
        id: "fast-reading-workflow",
        title: "A better fast reading workflow for PDFs and study material",
        paragraphs: [
          "If your material lives in PDFs, DOCX files, or long notes, the workflow matters more than raw technique. You need a place to import, pace, bookmark, and return without rebuilding state every time. Otherwise the hidden cost of setup destroys any speed gain.",
          "Leyendo is built around that workflow. It gives readers a calmer interface for reading faster, but keeps the fallback options that protect comprehension. That makes it a better fit for readers who want practical fast reading, not empty promises.",
        ],
      },
    ],
    faqs: [
      {
        question: "How can I read faster and still remember more?",
        answer:
          "Use a pace that stays comprehensible, group words into larger units, and create clear review anchors. Memory improves when attention stays steady and review stays intentional.",
      },
      {
        question: "Is subvocalization always bad for fast reading?",
        answer:
          "Not always. The goal is not to eliminate all inner speech. The goal is to stop treating every single word as a separate event when the sentence can be processed as a larger phrase.",
      },
      {
        question: "Can a fast reading app help with work documents?",
        answer:
          "Yes, if it supports real documents, lets you change reading modes, and preserves progress and context between sessions.",
      },
    ],
    readingPath: [
      {
        slug: "reading-speed-for-real-documents",
        reason:
          "Read this if you want the broader reading-speed framing before narrowing into fast-reading workflow.",
      },
      {
        slug: "velocidad-de-lectura-y-comprension",
        reason:
          "Use the Spanish comprehension guide to cover the same tradeoff from a bilingual SEO path.",
      },
    ],
    relatedSlugs: [
      "reading-speed-for-real-documents",
      "velocidad-de-lectura-y-comprension",
    ],
  },
  {
    slug: "lectura-rapida-para-documentos-reales",
    language: "es",
    languageLabel: "Guia en espanol",
    cluster: "lectura-rapida",
    clusterLabel: "Lectura rapida",
    title: "Lectura rapida para documentos reales",
    description:
      "Una guia practica de lectura rapida para personas que quieren leer PDF, informes y textos largos con mejor ritmo, mas foco y mas control.",
    intro:
      "La lectura rapida sirve cuando se aplica a documentos reales y no solo a ejercicios simples. El objetivo no es correr por correr. El objetivo es avanzar con ritmo sin perder la comprension ni el hilo del documento.",
    readingTime: "6 min de lectura",
    audience:
      "Ideal para lectores que trabajan con PDF, informes, articulos o apuntes y quieren leer mas rapido sin volver al caos.",
    keyTakeaways: [
      "La lectura rapida funciona mejor cuando el lector puede cambiar de ritmo sin perder continuidad.",
      "La mejora inicial suele venir de menos friccion y mejor estructura, no de velocidad extrema.",
      "Guardar progreso y puntos de retorno reduce la relectura ansiosa y mejora la confianza.",
    ],
    keywords: [
      "lectura rapida",
      "leer mas rapido",
      "lectura rapida PDF",
      "app para lectura rapida",
    ],
    sections: [
      {
        id: "lectura-rapida-problema",
        title: "Por que la lectura rapida falla en documentos densos",
        paragraphs: [
          "Muchos consejos sobre lectura rapida parecen utiles hasta que el texto trae tablas, citas, lenguaje tecnico o cambios bruscos de estructura. En ese momento, el lector pierde ritmo, vuelve atras de forma impulsiva y termina cansado.",
          "Eso no significa que leer mas rapido sea imposible. Significa que la velocidad depende del contexto. Cuando el lector puede cambiar de vista, recuperar un pasaje facil y mantener progreso estable, la lectura rapida deja de sentirse artificial.",
        ],
      },
      {
        id: "lectura-rapida-control",
        title: "Como leer mas rapido con mejor control",
        paragraphs: [
          "Subir la velocidad de lectura normalmente empieza por quitar friccion visual y reducir dudas innecesarias. Un mejor ritmo aparece cuando dejas de tratar cada palabra como un evento aislado y empiezas a leer frases, bloques y transiciones completas.",
          "Tambien ayuda tener una forma clara de volver. Si marcas puntos importantes y conservas progreso por documento, no necesitas releer por ansiedad. Puedes avanzar con mas confianza y reservar la lectura lenta para lo que de verdad la merece.",
        ],
        bullets: [
          "Empieza con una velocidad exigente pero todavia clara.",
          "Agrupa palabras en frases cortas cuando el texto lo permita.",
          "Baja el ritmo en secciones tecnicas sin abandonar el documento.",
          "Guarda marcadores y destacados para revisar despues con criterio.",
        ],
      },
      {
        id: "lectura-rapida-estudio",
        title: "Que cambia cuando el texto es de estudio o trabajo",
        paragraphs: [
          "En documentos de estudio o trabajo no basta con terminar rapido. Tambien importa volver a ideas clave, comparar secciones y recordar donde estaba cada punto importante. Por eso la lectura rapida real necesita una forma de recuperar contexto sin perder el ritmo general.",
          "Cuando el entorno de lectura conserva progreso y permite varias vistas, el lector puede acelerar sin sentir que arriesga comprension. La confianza sube porque siempre existe una manera clara de revisar lo necesario.",
        ],
      },
      {
        id: "lectura-rapida-leyendo",
        title: "Donde encaja Leyendo",
        paragraphs: [
          "Leyendo esta pensado para esa version seria de la lectura rapida. Te deja abrir PDF y otros documentos, cambiar de modo de lectura y conservar progreso, marcadores y destacados sin perder continuidad.",
          "Eso responde mejor a la intencion de quien busca lectura rapida o leer mas rapido en espanol. No se trata de prometer milagros. Se trata de ofrecer una herramienta real para leer documentos con mas foco, mejor ritmo y mejor recuperacion.",
        ],
      },
    ],
    faqs: [
      {
        question: "Se puede practicar lectura rapida sin perder comprension?",
        answer:
          "Si. La clave es subir el ritmo con control, ajustar la vista al tipo de texto y volver a modo clasico cuando una seccion necesita lectura mas lenta.",
      },
      {
        question: "La lectura rapida funciona para PDF y apuntes?",
        answer:
          "Funciona mejor cuando la herramienta fue hecha para documentos reales y no solo para textos de muestra o demos demasiado simples.",
      },
      {
        question: "Que conviene hacer cuando un parrafo se vuelve dificil?",
        answer:
          "Bajar el ritmo en ese punto, recuperar contexto y dejar marcadores para volver despues suele ser mas eficaz que insistir en una velocidad fija.",
      },
    ],
    readingPath: [
      {
        slug: "velocidad-de-lectura-y-comprension",
        reason:
          "Sigue con esta guia si tu proximo objetivo es unir lectura rapida con comprension lectora.",
      },
      {
        slug: "reading-speed-for-real-documents",
        reason:
          "Usa la version en ingles para ampliar la cobertura bilingue de la misma intencion.",
      },
    ],
    relatedSlugs: [
      "velocidad-de-lectura-y-comprension",
      "reading-speed-for-real-documents",
    ],
  },
  {
    slug: "velocidad-de-lectura-y-comprension",
    language: "es",
    languageLabel: "Guia en espanol",
    cluster: "comprension",
    clusterLabel: "Comprension lectora",
    title: "Velocidad de lectura y comprension lectora",
    description:
      "Como mejorar velocidad de lectura y comprension lectora al mismo tiempo cuando estudias, trabajas con PDF o repasas documentos largos.",
    intro:
      "Velocidad de lectura y comprension lectora no tienen por que competir. En muchos casos mejoran juntas cuando el lector reduce friccion, organiza mejor el texto y decide con mas claridad cuando acelerar y cuando revisar con calma.",
    readingTime: "7 min de lectura",
    audience:
      "Ideal para estudiantes y profesionales que necesitan entender mejor sin resignarse a una lectura siempre lenta.",
    keyTakeaways: [
      "La comprension suele caer por perdida de continuidad, no solo por velocidad alta.",
      "Ver mejor la estructura del texto ayuda a sostener ritmo y recuerdo al mismo tiempo.",
      "Una herramienta con varias vistas y anclas de revision une mejor velocidad y comprension.",
    ],
    keywords: [
      "velocidad de lectura",
      "comprension lectora",
      "leer mas rapido",
      "como mejorar la comprension lectora",
    ],
    sections: [
      {
        id: "comprension-falsa-eleccion",
        title: "Por que comprension y velocidad suelen separarse mal",
        paragraphs: [
          "En muchas explicaciones populares aparece una falsa eleccion: o lees rapido o entiendes bien. Pero en la practica el problema suele ser otro. El lector pierde atencion, vuelve atras sin plan y rompe la continuidad del texto, y eso perjudica tanto la velocidad como la comprension.",
          "Cuando la lectura tiene un ritmo mas estable, la mente detecta mejor el orden del argumento. Eso facilita entender ideas principales, anticipar conexiones y recordar con mas facilidad donde estaba cada punto importante.",
        ],
      },
      {
        id: "comprension-documentos-largos",
        title: "Que ayuda a mejorar comprension lectora en documentos largos",
        paragraphs: [
          "La comprension lectora mejora cuando el texto deja de sentirse como una pared uniforme. Ver bloques, frases y transiciones ayuda a ubicar el sentido global antes de volver al detalle. Esa estructura reduce la fatiga y mejora el recuerdo.",
          "Tambien importa la posibilidad de revisar sin perderse. Si puedes guardar anclas, volver a un pasaje concreto y mantener progreso por documento, entonces la revision deja de ser una repeticion ciega y se convierte en una lectura de segunda pasada mucho mas util.",
        ],
        bullets: [
          "Usa una vista que te muestre estructura, no solo palabras aisladas.",
          "Sube el ritmo de forma gradual para sostener atencion.",
          "Marca ideas clave para una segunda lectura mas corta y precisa.",
          "Reserva el modo mas lento para definiciones, argumentos delicados y pasajes tecnicos.",
        ],
      },
      {
        id: "comprension-revision",
        title: "Como revisar sin destruir el ritmo",
        paragraphs: [
          "Revisar bien no significa volver al inicio cada vez que algo incomoda. Una revision util tiene puntos de retorno claros. Eso permite que la primera pasada siga avanzando y que la segunda pasada sea mas precisa, mas corta y mas orientada a las secciones que realmente importan.",
          "Este detalle importa para SEO y para producto. Muchas personas que buscan comprension lectora o velocidad de lectura en realidad buscan una forma de estudiar o trabajar sin agotarse. La revision con anclas responde a esa necesidad mucho mejor que los consejos genericos.",
        ],
      },
      {
        id: "comprension-leyendo",
        title: "Una herramienta de lectura puede unir ambas metas",
        paragraphs: [
          "Una buena herramienta no te obliga a escoger entre velocidad de lectura y comprension lectora. Te da varias formas de leer el mismo documento segun lo que necesitas en ese momento y mantiene el estado para que el avance no se pierda.",
          "Leyendo apunta a ese equilibrio. Sirve para lectores que quieren leer mas rapido, pero tambien para quienes necesitan recordar mejor, revisar con orden y tratar documentos reales con mas respeto que el que ofrecen los visores comunes.",
        ],
      },
    ],
    faqs: [
      {
        question: "Como mejorar velocidad de lectura y comprension a la vez?",
        answer:
          "La combinacion mas fiable es ritmo estable, menos friccion visual, agrupacion por frases y revision apoyada en marcadores o destacados.",
      },
      {
        question: "La comprension lectora mejora con practica diaria?",
        answer:
          "Si. La practica frecuente mejora vocabulario, reconocimiento de estructuras y capacidad de sostener atencion en textos largos.",
      },
      {
        question: "Que tipo de lector se beneficia mas de este enfoque?",
        answer:
          "Estudiantes, profesionales y lectores que trabajan con PDF, informes, articulos o documentos largos suelen notar mas beneficio porque el costo de perder contexto es alto.",
      },
    ],
    readingPath: [
      {
        slug: "lectura-rapida-para-documentos-reales",
        reason:
          "Sigue con esta guia si quieres una entrada mas directa desde la intencion de lectura rapida.",
      },
      {
        slug: "fast-reading-without-losing-comprehension",
        reason:
          "Usa la version en ingles para ampliar la ruta bilingue entre comprension y fast reading.",
      },
    ],
    relatedSlugs: [
      "lectura-rapida-para-documentos-reales",
      "fast-reading-without-losing-comprehension",
    ],
  },
];

export function getGuideBySlug(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export function getRelatedGuides(guide: Guide) {
  return guide.relatedSlugs
    .map((slug) => getGuideBySlug(slug))
    .filter((relatedGuide): relatedGuide is Guide => Boolean(relatedGuide));
}

export function getReadingPathGuides(guide: Guide) {
  return guide.readingPath
    .map((step) => {
      const linkedGuide = getGuideBySlug(step.slug);

      if (!linkedGuide) {
        return undefined;
      }

      return {
        guide: linkedGuide,
        reason: step.reason,
      };
    })
    .filter(
      (
        step,
      ): step is {
        guide: Guide;
        reason: string;
      } => Boolean(step),
    );
}

export function getGuidesByLanguage(language: GuideLanguage) {
  return guides.filter((guide) => guide.language === language);
}

export function getGuidesByCluster(cluster: GuideCluster) {
  return guides.filter((guide) => guide.cluster === cluster);
}

export const featuredGuides = guides.slice(0, 4);
