/**
 * SEO V2 Phase 5 — Spanish copy for the five public /es money pages.
 *
 * TRANSLATION POLICY (mirrors config/i18n's ⚖ constraint):
 *  · Marketing PROSE is translated to professional, neutral Spanish.
 *  · SOURCED LEGAL FACTS are NOT translated here — the /es pages render them
 *    from content/facts.ts in reviewed English (a subtly wrong firearms-law
 *    claim in translation is worse than an English one). Each /es page shows a
 *    short note that the sourced rules are quoted in English.
 *  · The standing DISCLAIMER renders in BOTH languages, with English controlling
 *    (see disclaimerEs below).
 *  · No prices, dates, statistics, or citations are introduced here.
 *
 * The whole surface is flag-gated (I18N_ES_ENABLED) so it ships dark until a
 * native-fluent reviewer signs off.
 */

/**
 * Spanish rendering of the standing disclaimer. The English version in
 * config/brand.ts remains the CONTROLLING text; this is a courtesy translation
 * shown alongside it on /es pages.
 */
export const disclaimerEs =
  "Gun License NYC es un servicio privado de preparación de documentos y gestión de casos. No somos abogados y no lo representamos ante la División de Licencias del NYPD. No podemos acelerar ni garantizar ningún resultado, y no estamos afiliados ni respaldados por el NYPD ni por ninguna agencia gubernamental. Usted revisa y presenta su propia solicitud, y el NYPD conserva plena discreción investigativa."

/** Shown wherever an /es page renders English-sourced legal facts. */
export const factsInEnglishNoteEs =
  "Las reglas legales de esta página se citan en inglés, tal como las publica la agencia que las establece, para no arriesgar una traducción imprecisa de un requisito legal."

/** Reusable labels for shared UI on /es pages. */
export const uiEs = {
  home: "Inicio",
  ctaEligibility: "Verifique su elegibilidad",
  keepReading: "Siga leyendo",
  commonQuestions: "Preguntas frecuentes",
  whoSetsThese: "Quién establece estas reglas",
  sourcesNote: "Con la agencia que la establece y un enlace a la fuente principal.",
}

export interface EsFaq {
  q: string
  a: string
}

export interface EsPage {
  /** English path this translates (for hreflang + toggle). "" = home. */
  enPath: string
  metaTitle: string
  metaDescription: string
  eyebrow: string
  title: string
  subtitle: string
  directAnswer: string
  faqs: EsFaq[]
  /** Related links → other /es twins. */
  related: { label: string; href: string }[]
}

export const ES_HOME: EsPage = {
  enPath: "",
  metaTitle: "Licencia de Armas en NYC",
  metaDescription:
    "Guía del proceso de licencia de armas de NYC: elegibilidad, el curso de 18 horas, documentos, notarización y la entrevista. Usted presenta su propia solicitud.",
  eyebrow: "Licencia de armas de NYC",
  title: "La licencia de armas de NYC, manejada con precisión",
  subtitle:
    "El proceso de Nueva York es exigente — por eso tenerlo bien manejado importa. Le explicamos todo el camino y qué hacemos en cada punto para que usted no tenga que hacerlo solo.",
  directAnswer:
    "Obtener una licencia de armas en la ciudad de Nueva York toma alrededor de seis meses del lado del NYPD, más el tiempo que usted tarde en prepararse. El camino es el mismo para casi todos: confirmar su elegibilidad, completar el curso de seguridad de 18 horas, reunir sus documentos y referencias notarizadas, presentar su propia solicitud y asistir a la entrevista. Nosotros mantenemos el expediente completo y al día; usted revisa y presenta su propia solicitud.",
  faqs: [
    {
      q: "¿Qué es Gun License NYC?",
      a: "Es un servicio privado de preparación de documentos y gestión de casos para el proceso de licencia de armas de la ciudad de Nueva York. Le guiamos de principio a fin — elegibilidad, capacitación, documentos, notarización y la espera — mientras usted revisa y presenta su propia solicitud.",
    },
    {
      q: "¿Son abogados o están afiliados al NYPD?",
      a: "No. No somos abogados y no lo representamos ante la División de Licencias; solo un abogado con licencia en Nueva York puede representar a un solicitante. Tampoco estamos afiliados ni respaldados por el NYPD ni por ninguna agencia gubernamental.",
    },
    {
      q: "¿Presentan la solicitud por mí?",
      a: "No. Usted presenta su propia solicitud — eso lo exige la ley. Lo que hacemos es asegurar que, cuando la presente, el expediente esté completo, vigente y correcto.",
    },
  ],
  related: [
    { label: "Cuánto cuesta, todo incluido", href: "/es/cost" },
    { label: "Todo lo que se requiere", href: "/es/requirements" },
    { label: "Cuánto tiempo toma", href: "/es/timeline" },
    { label: "Cómo funciona el proceso", href: "/es/how-it-works" },
  ],
}

export const ES_COST: EsPage = {
  enPath: "/cost",
  metaTitle: "¿Cuánto Cuesta la Licencia de Armas NYC?",
  metaDescription:
    "El costo real de una licencia de armas de NYC: nuestra tarifa, las tarifas del NYPD y del Estado que paga directamente, más capacitación y notaría.",
  eyebrow: "Cuánto cuesta",
  title: "¿Cuánto cuesta una licencia de armas en NYC?",
  subtitle:
    "Sin juegos con los precios. Aquí está cada dólar, a quién se le paga y cuál parte es realmente nuestra.",
  directAnswer:
    "Una licencia de armas de NYC cuesta, todo incluido, aproximadamente unos pocos miles de dólares. Eso se divide en la tarifa de solicitud del NYPD y la tarifa estatal de huellas dactilares — ambas pagadas directamente al gobierno — más su curso de seguridad de 18 horas y la notarización, facturados por esos proveedores. Solo la tarifa de nuestro servicio se nos paga a nosotros, y nunca marcamos ningún otro costo. Las cifras vigentes están en la página de tarifas.",
  faqs: [
    {
      q: "¿Cuánto cuesta en total una licencia de armas de NYC?",
      a: "El total combina nuestra tarifa de servicio, las dos tarifas gubernamentales (solicitud del NYPD y huellas del Estado), el curso de 18 horas y la notarización. Las tarifas gubernamentales vigentes se muestran en nuestra página de tarifas y se leen en vivo de nuestros registros.",
    },
    {
      q: "¿Cobran ustedes las tarifas gubernamentales?",
      a: "No. La tarifa de solicitud se paga al NYPD y la de huellas en su cita de toma de huellas del NYPD — nunca a nosotros, ni siquiera como intermediarios. La tarifa de nuestro servicio es un cargo aparte.",
    },
    {
      q: "¿Hay costos ocultos?",
      a: "No. El desglose es todo el panorama: nuestra tarifa, las dos tarifas gubernamentales, la capacitación y la notarización. Si un costo no aparece, no lo escondimos — díganoslo y lo agregamos.",
    },
  ],
  related: [
    { label: "Las tarifas gubernamentales vigentes", href: "/es/requirements" },
    { label: "Cuánto tiempo toma", href: "/es/timeline" },
    { label: "Todo lo que se requiere", href: "/es/requirements" },
    { label: "Cómo funciona el proceso", href: "/es/how-it-works" },
  ],
}

export const ES_REQUIREMENTS: EsPage = {
  enPath: "/requirements",
  metaTitle: "Requisitos de Licencia de Armas NYC",
  metaDescription:
    "Lo que exige una licencia de armas de NYC: edad, el curso de 18 horas, referencias notarizadas, afidávit de convivientes, fotos y divulgaciones.",
  eyebrow: "Qué se necesita",
  title: "Requisitos de la licencia de armas de NYC",
  subtitle: "Es una lista larga, pero no es un misterio. Aquí está toda su forma, en lenguaje claro.",
  directAnswer:
    "Para una licencia de armas de NYC debe tener al menos 21 años y no tener antecedentes que lo descalifiquen, completar el curso de seguridad de 18 horas (16 horas de aula más 2 horas de tiro real), y reunir cuatro referencias de carácter notarizadas, un afidávit notarizado de cada adulto que viva en su hogar, comprobante de residencia, fotos, una lista de tres años de sus redes sociales y la divulgación honesta de su historial. Usted presenta su propia solicitud.",
  faqs: [
    {
      q: "¿Cuáles son los requisitos para una licencia de armas de NYC?",
      a: "Tener 21 años o más y no tener descalificaciones; completar el curso de 18 horas; reunir cuatro referencias notarizadas, los afidávits de convivientes, comprobante de residencia, fotos, la lista de redes sociales de tres años y divulgar su historial con plena honestidad. Usted presenta su propia solicitud.",
    },
    {
      q: "¿Debo declarar un arresto que fue sellado o desestimado?",
      a: "Sí. Los arrestos sellados y desestimados se declaran de todos modos en una solicitud de armas de Nueva York. Omitir uno no es un atajo — es un problema de veracidad. Lo específico de su historial es una cuestión legal; lo remitimos a un abogado con licencia en Nueva York.",
    },
    {
      q: "¿Mis compañeros de vivienda realmente tienen que firmar algo?",
      a: "Sí. Se requiere un afidávit notarizado de cada adulto que viva en su hogar — no solo su cónyuge o pareja, sino también compañeros de vivienda e hijos adultos.",
    },
  ],
  related: [
    { label: "Cuánto cuesta, todo incluido", href: "/es/cost" },
    { label: "Cuánto tiempo toma", href: "/es/timeline" },
    { label: "Cómo funciona el proceso", href: "/es/how-it-works" },
    { label: "Licencia de armas de NYC", href: "/es" },
  ],
}

export const ES_TIMELINE: EsPage = {
  enPath: "/timeline",
  metaTitle: "¿Cuánto Tarda la Licencia de Armas NYC?",
  metaDescription:
    "Unos seis meses del lado del NYPD —entrevista, huellas, verificación del FBI e investigación de carácter— más el tiempo que usted tarde en prepararse.",
  eyebrow: "Cuánto tiempo toma",
  title: "¿Cuánto tarda una licencia de armas de NYC?",
  subtitle:
    "Alrededor de seis meses del lado del NYPD — más el tiempo que usted tarde en prepararse. Aquí está dónde se va realmente el tiempo.",
  directAnswer:
    "Del lado del NYPD, lo típico es alrededor de seis meses desde una presentación completa hasta la carta de decisión, cubriendo la entrevista, la toma de huellas, la verificación de antecedentes del FBI y la investigación de carácter. A eso se suma el tiempo que usted tarde en prepararse: reunir referencias, coordinar afidávits y completar el curso. Nadie puede hacer que el NYPD vaya más rápido.",
  faqs: [
    {
      q: "¿Cuánto tarda una licencia de armas de NYC?",
      a: "Aproximadamente seis meses del lado del NYPD desde una presentación completa hasta la decisión, más el tiempo que usted tarde en preparar el expediente. La preparación depende de qué tan rápido reúna referencias, afidávits y la capacitación.",
    },
    {
      q: "¿Alguien puede hacer que el NYPD vaya más rápido?",
      a: "No. Nadie puede acelerar al NYPD, y desconfíe de cualquiera que lo prometa. El NYPD conserva plena discreción sobre el proceso y la decisión.",
    },
    {
      q: "¿Cuándo debo tomar el curso de 18 horas?",
      a: "Programe la capacitación en función de cuándo presentará realmente su solicitud: su certificado de capacitación debe estar fechado dentro de los 6 meses de la presentación, así que no la haga demasiado pronto si el resto del expediente aún tardará.",
    },
  ],
  related: [
    { label: "Cómo funciona el proceso", href: "/es/how-it-works" },
    { label: "Todo lo que se requiere", href: "/es/requirements" },
    { label: "Cuánto cuesta, todo incluido", href: "/es/cost" },
    { label: "Licencia de armas de NYC", href: "/es" },
  ],
}

export const ES_HOW: EsPage = {
  enPath: "/how-it-works",
  metaTitle: "Cómo Obtener una Licencia de Armas en NYC",
  metaDescription:
    "El proceso de licencia de armas de NYC de principio a fin: elegibilidad, curso de 18 horas, documentos, notarización, presentación, investigación y entrevista.",
  eyebrow: "Cómo funciona",
  title: "Cómo lo preparamos para presentar, paso a paso",
  subtitle:
    "El proceso de Nueva York es difícil — por eso importa tenerlo manejado. Aquí está todo el camino y lo que hacemos en cada punto para que usted no tenga que hacerlo solo.",
  directAnswer:
    "El proceso tiene casi la misma forma para todos: primero confirmamos dónde está usted realmente y si es elegible; construimos su lista de requisitos a partir de las reglas publicadas; reunimos y verificamos cada documento —referencias, afidávits de convivientes, certificado de capacitación, fotos del caja fuerte, la lista de redes sociales—; nada avanza a la etapa de presentación hasta que pasa nuestra revisión; y luego usted presenta su propia solicitud mientras nosotros seguimos con el caso hasta la entrevista y después.",
  faqs: [
    {
      q: "¿Ustedes presentan la solicitud?",
      a: "No. Usted presenta su propia solicitud, siempre. Nosotros preparamos y verificamos el expediente y lo acompañamos durante todo el proceso, pero la presentación y la entrevista son suyas.",
    },
    {
      q: "¿Qué es la revisión previa a la presentación?",
      a: "Es una compuerta: un caso no puede llegar a la etapa de presentación hasta que se cumplen los requisitos bloqueantes, las divulgaciones están redactadas, la capacitación está dentro de su plazo y una persona nombrada de nuestro equipo da su aprobación.",
    },
    {
      q: "¿Pueden garantizar que me aprueben?",
      a: "No. Nadie puede — el NYPD conserva plena discreción investigativa sobre cada decisión. Lo que hacemos es que su expediente esté lo más completo, vigente y honesto posible cuando usted lo presente.",
    },
  ],
  related: [
    { label: "Todo lo que se requiere", href: "/es/requirements" },
    { label: "Cuánto cuesta, todo incluido", href: "/es/cost" },
    { label: "Cuánto tiempo toma", href: "/es/timeline" },
    { label: "Licencia de armas de NYC", href: "/es" },
  ],
}

export const ES_PAGES: Record<string, EsPage> = {
  "": ES_HOME,
  "/cost": ES_COST,
  "/requirements": ES_REQUIREMENTS,
  "/timeline": ES_TIMELINE,
  "/how-it-works": ES_HOW,
}
