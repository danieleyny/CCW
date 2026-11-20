/**
 * PART C / Phase 11 — message catalogs.
 *
 * `en` is the source of truth and the key set. Every other locale is a partial
 * overlay: a missing key falls back to English (see lib/i18n/index.ts), so a
 * half-translated locale degrades gracefully instead of showing blanks.
 *
 * ⚖ Keys under `legal` are DELIBERATELY English-only in every non-English
 * catalog until an attorney fluent in that language reviews a translation.
 * `LEGAL_KEYS` lists them so a test can prove no locale ever silently overrides
 * one with an un-reviewed string.
 */
import type { Locale } from "@/config/i18n"

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export interface Messages {
  portal: {
    /** `{license}` is replaced with the track-resolved word from `licenseWord`. */
    tagline: string
    /** Localized license-type words, chosen by the case's license_track. */
    licenseWord: { armedGuard: string; concealedCarry: string; premises: string }
    yourData: string
    nextStepEyebrow: string
    finishIntake: string
    continueIntake: string
    viewEverything: string
    home: {
      applicationEyebrow: string
      selfGuided: string
      fullConcierge: string
      goodMorning: string
      goodAfternoon: string
      goodEvening: string
      mobileGreeting: string
      teamLabel: string
      supportName: string
      repliesWithin: string
      getStartedSubline: string
      trainingSubline: string
      documentsSubline: string
      nypdSubline: string
      decisionSubline: string
      nextStep: string
      whereYouAre: string
      todoDone: string
      todoAria: string
      seeEverythingLeft: string
      firstDecision: string
      chooseWorkTitle: string
      chooseWorkDetail: string
      selfChoiceTitle: string
      selfChoiceDetail: string
      conciergeChoiceTitle: string
      conciergeChoiceDetail: string
      comparePlans: string
      choosePackageTitle: string
      choosePackageDetail: string
      choosePackage: string
      licensedEyebrow: string
      licensedTitle: string
      licensedDetail: string
      openLicenseHub: string
      deniedEyebrow: string
      deniedTitle: string
      deniedDetail: string
      startAppeal: string
      journey: string
      phaseOf: string
      fullTimeline: string
      youAreHere: string
      nypdClock: string
      phaseGetStarted: string
      phaseGetStartedDetail: string
      phaseTraining: string
      phaseTrainingDetail: string
      phaseDocuments: string
      phaseDocumentsDetail: string
      phaseNypd: string
      phaseNypdDetail: string
      phaseDecision: string
      phaseDecisionDetail: string
      training: string
      documents: string
      messages: string
      payments: string
      done: string
      notRequired: string
      noTrainingRequired: string
      trainingComplete: string
      findInstructor: string
      findingInstructors: string
      instructorsInterested: string
      yourInstructor: string
      classBooked: string
      viewCertificate: string
      documentsStatus: string
      itemsLeft: string
      intakeComplete: string
      finishIntakeFirst: string
      openDocuments: string
      preparedForms: string
      upToDate: string
      newMessages: string
      noMessages: string
      reply: string
      teamSender: string
      paidInFull: string
      paymentDue: string
      openPayments: string
      timingTitle: string
      timingBefore: string
      timingAfter: string
      prepareInterview: string
      referralCompanyFallback: string
    }
  }
  common: {
    signOut: string
    language: string
    account: string
    profile: string
    legalEnglishNotice: string
    almostThere: string
    noCase: string
  }
  shell: {
    primary: string
    home: string
    checklist: string
    documents: string
    people: string
    concierge: string
    yourApplication: string
    messages: string
    forms: string
    preparedForms: string
    payments: string
    license: string
    yourLicense: string
    appeal: string
    more: string
    yourDetails: string
    profileAndData: string
    detailsStatus: string
    messagesStatus: string
    formsStatus: string
    paymentsStatus: string
    licenseStatus: string
    appealStatus: string
    profileStatus: string
    unread: string
    unreadFromTeam: string
  }
  setup: {
    setup: string
    licensePath: string
    plan: string
    payment: string
    getStarted: string
    nextStep: string
    current: string
    continue: string
    saving: string
    saveError: string
  }
  licensePath: {
    metadataTitle: string
    title: string
    lede: string
    radioLabel: string
    keepAtHome: string
    premiseResidence: string
    premiseDescription: string
    carryInNyc: string
    concealedCarry: string
    concealedDescription: string
    extendCounty: string
    specialCarry: string
    specialDescription: string
    references: string
    training: string
    checklist: string
    requires: string
    review: string
    scope: string
    nonFamily: string
    none: string
    noCourse: string
    home: string
    residenceHousehold: string
    character: string
    classroomLiveFire: string
    carry: string
    carrySpecific: string
    county: string
    activeLicense: string
    nyc: string
    nycDocuments: string
    personal: string
    carryOnly: string
    nextChoosePlan: string
    replaces: string
    staffQuestion: string
    staffAnswer: string
  }
  choosePath: {
    metadataTitle: string
    title: string
    ledePrefix: string
    selfGuided: string
    selfGuidedShort: string
    concierge: string
    conciergeShort: string
    servicePlan: string
    youGuideEyebrow: string
    selfTagline: string
    conciergeEyebrow: string
    conciergeTagline: string
    gatherDocuments: string
    bookTraining: string
    coordinateReferences: string
    submitApplication: string
    personalizedChecklist: string
    prepareForms: string
    flagGaps: string
    coordinateAffidavits: string
    qualityCheckPacket: string
    filingReadyApplication: string
    routineFollowUp: string
    signAndProvide: string
    reviewPacket: string
    submitToNypd: string
    weDo: string
    youDo: string
    filingReadyPacket: string
    reviewAndSubmit: string
    doneForYou: string
    setUpForYou: string
    yourPick: string
    continue: string
    nextTellUs: string
    nextCheckout: string
    continuePayment: string
    nextInvoice: string
    requestInvoice: string
    couldNotStart: string
    requestReceived: string
    invoiceTiming: string
    starting: string
    feeNote: string
    feeNoteInvoice: string
    haveAccessCode: string
    accessCodeFor: string
    selectedPlan: string
    accessCode: string
    apply: string
  }
  payments: {
    metadataTitle: string
    billing: string
    payments: string
    paid: string
    due: string
    failed: string
    refunded: string
    successBanner: string
    canceledBanner: string
    cardSoon: string
    cardSoonDetail: string
    noPayments: string
    noPaymentsDetail: string
    stripeSecurity: string
    governmentFees: string
    governmentFeesDetail: string
    applicationFee: string
    fingerprintFee: string
    totalNypd: string
    ofPaid: string
    viewInvoice: string
    receipt: string
    payNext: string
    payNow: string
    payDefault: string
    balanceDue: string
    invoiceRequested: string
    paidToDate: string
    plan: string
    balanceClear: string
    allPaid: string
    history: string
    item: string
    items: string
    statement: string
    caseLabel: string
    comped: string
    downloadStatement: string
    fullConcierge: string
    selfGuided: string
    starting: string
    onlineSoonToast: string
    deposit: string
  }
  license: {
    metadataTitle: string
    eyebrow: string
    title: string
    lede: string
    licensee: string
    handgunLicense: string
    illustration: string
    issued: string
    expires: string
    beforeEyebrow: string
    beforeTitle: string
    beforeIntro: string
    expiryRenewal: string
    expiryRenewalDetail: string
    purchaseWindows: string
    purchaseWindowsDetail: string
    reportingDuties: string
    reportingDutiesDetail: string
    seeApplication: string
    active: string
    renewalOpen: string
    expired: string
    validTitle: string
    renewTitle: string
    expiredTitle: string
    validUntil: string
    daysLeft: string
    runwayOpen: string
    runwayDetail: string
    termElapsed: string
    renewalOpens: string
    specialCountyTitle: string
    dayShort: string
    congratulations: string
    reviewAsk: string
    leaveReview: string
    renewal: string
    renewalContinue: string
    renewalStart: string
    opensApprox: string
    reciprocityTitle: string
    reciprocityDescription: string
    viewReciprocity: string
    pathEyebrow: string
    pathTitle: string
    pathDescription: string
    pathCurrent: string
    pathUpdatesChecklist: string
    pathUpdateAction: string
    pathSafety: string
    pathAskConcierge: string
    purchaseAuthorizations: string
    eligible: string
    nextPurchase: string
    noAuthorizations: string
    noAuthorizationDetail: string
    authorizationDate: string
    handgun: string
    handgunOptional: string
    saveAuthorization: string
    logAuthorization: string
    logNewAuthorization: string
    purchaseWindow: string
    inspection: string
    inspected: string
    inspectionOverdue: string
    bought: string
    windowExpired: string
    windowOpen: string
    handgunMissing: string
    usedOn: string
    daysPurchaseWindow: string
    overdueContact: string
    inspectedOn: string
    inspectionClockStarts: string
    hoursInspection: string
    startsAfterPurchase: string
    purchaseDate: string
    markBought: string
    markInspected: string
    edit: string
    savePurchaseDate: string
    cancel: string
    authorizationSaved: string
    authorized: string
    usedBought: string
    daysLeftUntil: string
    presentBy: string
    purchaseSaved: string
    inspectionSaved: string
    reportTitle: string
    whatChanged: string
    moreReasons: string
    chooseChange: string
    describeChange: string
    fileReport: string
    reportFiled: string
    reportFollowUp: string
    recentReports: string
    acknowledged: string
    sent: string
    dosTitle: string
    outstanding: string
    filedDos: string
    approved: string
    dosApplication: string
    firearmsCourse: string
    returnGuardCard: string
    returnGuardCardHint: string
    dosFee: string
    nextInService: string
    nextFirearms: string
    registrationRenews: string
    saved: string
    undo: string
    markDone: string
    keepingArmedStatus: string
  }
  pages: {
    detailsEyebrow: string
    detailsTitle: string
    detailsLede: string
    documentsTitle: string
    documentsLede: string
    formsEyebrow: string
    formsTitle: string
    formsLede: string
    finishIntakeTitle: string
    finishIntakeDetail: string
    finishIntake: string
    filingPackEyebrow: string
    filingPackTitle: string
    filingPackAnswerOrder: string
    filingPackDocumentOrder: string
    filingPackDocuments: string
    filingPackMode: string
    documentsOnly: string
    peopleNotePrefix: string
    peopleNoteLink: string
    peopleNoteSuffix: string
  }
  concierge: {
    fullConcierge: string
    welcome: string
    introCall: string
    join: string
    documentsIn: string
    detailsCaptured: string
    workInProgress: string
    step: string
    of: string
    nextStep: string
    bookIntroTitle: string
    bookIntroDescription: string
    chooseTime: string
    modalTitle: string
    modalDescription: string
    scheduledToast: string
    frameTitle: string
    trouble: string
    openNewTab: string
    request: string
    sending: string
    requestReceived: string
    book: string
    heroLede: string
    conciergeNamed: string
    nypdTimeline: string
    finish: string
    openItem: string
    review: string
    viewProgress: string
    finishDetails: string
    detailsOnce: string
    openDetails: string
    continuePreparing: string
    firstItemDetails: string
    teamFollowThrough: string
    reviewPacketTitle: string
    reviewPacketDescription: string
    reviewMyPacket: string
    workingTitle: string
    workingDescription: string
    seeProgress: string
    yourTeam: string
    messageConcierge: string
    messageDescription: string
    askAnything: string
    teamLabel: string
    beingAssigned: string
    namedContact: string
    assignedSoon: string
    messageTeam: string
    unlimitedSupport: string
    peopleContact: string
    references: string
    household: string
    addNames: string
    finishLine: string
    reviewSubmit: string
    finishLineDescription: string
    unlocksAssembled: string
    readyReview: string
    readyReviewDescription: string
    mobileUnlocks: string
    next: string
    then: string
    call: string
    minutes: string
    requestSent: string
    hereToHelp: string
    hereToHelpTeam: string
    caseReady: string
    realAnswers: string
    confirmed: string
    information: string
    detailsReuse: string
    completeOnce: string
    complete: string
    captured: string
    showFewer: string
    moreSections: string
    milestoneDocuments: string
    milestoneDocumentsDetail: string
    milestoneWorksheet: string
    milestoneWorksheetDetail: string
    milestoneReferences: string
    milestoneReferencesDetail: string
    milestonePacket: string
    milestonePacketDetail: string
    milestoneReview: string
    milestoneReviewDetail: string
    vaultEyebrow: string
    vaultTitle: string
    filterDocuments: string
    needYou: string
    withUs: string
    done: string
    all: string
    caughtUp: string
    vaultHelpTitle: string
    vaultHelpDetail: string
    encrypted: string
    documentCategories: string
    whatWeNeed: string
    items: string
    stepByStepHint: string
    uploadThese: string
    yourDocuments: string
    uploadSub: string
    tellUsWho: string
    peopleBundle: string
    peopleSub: string
    readSign: string
    prepareSign: string
    prepareSignSub: string
    confirmBundle: string
    feesSignoffs: string
    feesSub: string
    sponsorBundle: string
    sponsorDocuments: string
    sponsorSub: string
    collapse: string
    open: string
    in: string
    lettersBack: string
    affidavitsBack: string
    addUpdateNames: string
    feeDirect: string
    nothingNeeded: string
    nothingNeededDetail: string
  }
  /** Shared non-legal product copy used by secondary portal screens. */
  ui: Record<string, string>
  legal: {
    // ⚖ Reviewed English. Do NOT translate without attorney/native sign-off.
    filesOwnApplication: string
    purchaseAuthorizationRule: string
    reportChangesRule: string
    countyDependencyRule: string
  }
}

/** Keys that must never be translated without attorney/native review. */
export const LEGAL_KEYS = [
  "legal.filesOwnApplication",
  "legal.purchaseAuthorizationRule",
  "legal.reportChangesRule",
  "legal.countyDependencyRule",
  "license.purchaseWindowsDetail",
  "license.reportingDutiesDetail",
  "license.specialCountyTitle",
  "license.eligible",
  "license.authorizationSaved",
  "license.purchaseSaved",
  "license.returnGuardCardHint",
  "license.nextInService",
  "license.nextFirearms",
  "license.registrationRenews",
  "pages.filingPackMode",
] as const

const en: Messages = {
  portal: {
    tagline: "Tracking your NYC {license} application, end to end.",
    licenseWord: { armedGuard: "armed-guard", concealedCarry: "concealed carry", premises: "premises" },
    yourData: "Your data & privacy",
    nextStepEyebrow: "Your next step",
    finishIntake: "Finish your intake",
    continueIntake: "Continue intake",
    viewEverything: "View everything left to do",
    home: {
      applicationEyebrow: "Your application",
      selfGuided: "Self-guided",
      fullConcierge: "Full Concierge",
      goodMorning: "Good morning, {name}",
      goodAfternoon: "Good afternoon, {name}",
      goodEvening: "Good evening, {name}",
      mobileGreeting: "Hi, {name}",
      teamLabel: "Your team",
      supportName: "Gun License NYC support",
      repliesWithin: "Replies within {days} business day",
      getStartedSubline: "Your setup is underway. Complete the next step below.",
      trainingSubline: "Your training is underway. Keep your course and certificate together.",
      documentsSubline: "You're in the documents stretch. {count} left before your packet is ready.",
      nypdSubline: "Your application is with the NYPD.",
      decisionSubline: "The NYPD has issued a decision on your application.",
      nextStep: "Your next step",
      whereYouAre: "Where you are",
      todoDone: "to-dos done",
      todoAria: "{done} of {total} to-dos done",
      seeEverythingLeft: "See everything left ({count})",
      firstDecision: "First, one decision",
      chooseWorkTitle: "Choose how we'll work together",
      chooseWorkDetail: "This sets everything else. You can read both before you pay.",
      selfChoiceTitle: "Self-Guided",
      selfChoiceDetail: "You file; we guide.",
      conciergeChoiceTitle: "Full Concierge",
      conciergeChoiceDetail: "We prepare and quality-check; you review and file.",
      comparePlans: "Compare plans",
      choosePackageTitle: "Choose your package",
      choosePackageDetail: "Select the support level that fits you to unlock the rest of your workspace.",
      choosePackage: "Choose a package",
      licensedEyebrow: "You're licensed",
      licensedTitle: "Congratulations, {name}",
      licensedDetail: "Your license hub keeps your purchase windows, inspections, reporting duties and renewal in one place.",
      openLicenseHub: "Open your license hub",
      deniedEyebrow: "Your appeal window is open",
      deniedTitle: "You can appeal this decision",
      deniedDetail: "There's a deadline. Start now and we'll walk you through the process.",
      startAppeal: "Start your appeal",
      journey: "Your journey",
      phaseOf: "Phase {current} of {total}",
      fullTimeline: "Full timeline",
      youAreHere: "You are here",
      nypdClock: "NYPD's clock",
      phaseGetStarted: "Get started",
      phaseGetStartedDetail: "Account, eligibility, plan",
      phaseTraining: "Training",
      phaseTrainingDetail: "16-hour class + range",
      phaseDocuments: "Documents",
      phaseDocumentsDetail: "Upload, notarize, review",
      phaseNypd: "NYPD review",
      phaseNypdDetail: "Filed · fingerprints · interview",
      phaseDecision: "Decision",
      phaseDecisionDetail: "License issued",
      training: "Training",
      documents: "Documents",
      messages: "Messages",
      payments: "Payments",
      done: "Done",
      notRequired: "Not required",
      noTrainingRequired: "This license path does not require the concealed-carry course.",
      trainingComplete: "Your required training is complete.",
      findInstructor: "Find an instructor",
      findingInstructors: "We're finding instructors near you.",
      instructorsInterested: "{count} instructor(s) interested",
      yourInstructor: "Your instructor",
      classBooked: "Class booked {date}",
      viewCertificate: "View certificate",
      documentsStatus: "{done} of {total}",
      itemsLeft: "{count} items left",
      intakeComplete: "Intake complete",
      finishIntakeFirst: "Finish your intake first",
      openDocuments: "Open documents",
      preparedForms: "Forms we filled out for you",
      upToDate: "Up to date",
      newMessages: "{count} new",
      noMessages: "Your case team messages will appear here.",
      reply: "Reply",
      teamSender: "Gun License NYC",
      paidInFull: "Paid in full",
      paymentDue: "{package} · payment due",
      openPayments: "Open payments",
      timingTitle: "How long does this take?",
      timingBefore: "The pace up to filing depends mostly on how quickly your documents and training come together. After you file, the NYPD review typically takes about six months, and that clock is theirs, not ours.",
      timingAfter: "Once an application is filed, the License Division's review typically takes about six months - sometimes more. That timeline is set by the NYPD, not by us, and no one can speed up their investigation. We'll keep you posted at every step we can see.",
      prepareInterview: "Prepare for your interview",
      referralCompanyFallback: "the company that introduced you",
    },
  },
  common: {
    signOut: "Sign out",
    language: "Language",
    account: "Account",
    profile: "Profile",
    legalEnglishNotice: "Legal text remains in reviewed English until counsel approves the Spanish wording.",
    almostThere: "Almost there.",
    noCase: "Your case isn't set up yet. Please sign out and sign in again, or contact us for help.",
  },
  shell: {
    primary: "Primary",
    home: "Home",
    checklist: "Checklist",
    documents: "Documents",
    people: "People",
    concierge: "Concierge",
    yourApplication: "Your application",
    messages: "Messages",
    forms: "Forms",
    preparedForms: "Prepared forms",
    payments: "Payments",
    license: "License",
    yourLicense: "Your license",
    appeal: "Appeal",
    more: "More",
    yourDetails: "Your details",
    profileAndData: "Profile & your data",
    detailsStatus: "Entered once, reused on every form",
    messagesStatus: "Your case team & instructor",
    formsStatus: "Documents we filled out for you",
    paymentsStatus: "Invoices & receipts",
    licenseStatus: "Available after issuance",
    appealStatus: "Only if your application is denied",
    profileStatus: "Account, password & privacy",
    unread: "unread",
    unreadFromTeam: "unread from your case team",
  },
  setup: {
    setup: "Setup",
    licensePath: "License path",
    plan: "Plan",
    payment: "Payment",
    getStarted: "Get started",
    nextStep: "Next step",
    current: "Current",
    continue: "Continue",
    saving: "Saving…",
    saveError: "Couldn't save — try again",
  },
  licensePath: {
    metadataTitle: "Choose your license path",
    title: "What should your license let you do?",
    lede: "This sets your training, references and checklist.",
    radioLabel: "License path",
    keepAtHome: "Keep it at home",
    premiseResidence: "Premise Residence",
    premiseDescription: "A handgun kept at your NYC home — not carried in public.",
    carryInNyc: "Carry in NYC",
    concealedCarry: "Concealed Carry",
    concealedDescription: "Authority to carry concealed, for an eligible NYC applicant.",
    extendCounty: "Extend a county license",
    specialCarry: "Special Carry",
    specialDescription: "You live outside NYC and already hold a NY county carry license.",
    references: "References",
    training: "Training",
    checklist: "Checklist",
    requires: "Requires",
    review: "Review",
    scope: "Scope",
    nonFamily: "non-family",
    none: "None",
    noCourse: "no 16 + 2-hr course",
    home: "Home",
    residenceHousehold: "ID, residence, household",
    character: "character",
    classroomLiveFire: "classroom + live-fire",
    carry: "Carry",
    carrySpecific: "carry-specific",
    county: "County",
    activeLicense: "your active license",
    nyc: "NYC",
    nycDocuments: "NYC documents",
    personal: "Personal",
    carryOnly: "carry only",
    nextChoosePlan: "Next: choose your plan",
    replaces: "Replaces",
    staffQuestion: "Premise Business, armed work or retired law enforcement?",
    staffAnswer: "These need a quick staff review — message your concierge and we'll set it up.",
  },
  choosePath: {
    metadataTitle: "Choose how we'll work together",
    title: "How would you like to work together?",
    ledePrefix: "Same finish line, two ways there.",
    selfGuided: "Self-Guided:",
    selfGuidedShort: "you submit your own application.",
    concierge: "Full Concierge:",
    conciergeShort: "we prepare and quality-check it with you; you review and submit.",
    servicePlan: "Service plan",
    youGuideEyebrow: "You drive it, we guide it",
    selfTagline: "The full playbook, in your hands.",
    conciergeEyebrow: "We do the legwork · you stay in control",
    conciergeTagline: "Hand us the pieces — we organize the preparation from start to finish.",
    gatherDocuments: "Gather your own documents",
    bookTraining: "Book your own training",
    coordinateReferences: "Coordinate your two references",
    submitApplication: "Submit your own application",
    personalizedChecklist: "Give you the exact, personalized checklist",
    prepareForms: "Prepare your forms and answer process questions",
    flagGaps: "Flag gaps before you submit",
    coordinateAffidavits: "Coordinate with your references and cohabitant affidavits",
    qualityCheckPacket: "Prepare, assemble, and quality-check your whole packet",
    filingReadyApplication: "Organize a filing-ready application for your review",
    routineFollowUp: "Follow up routinely, with unlimited support from our team",
    signAndProvide: "Sign your forms and provide your documents",
    reviewPacket: "Review your finished packet",
    submitToNypd: "Submit your own application directly to NYPD",
    weDo: "We do",
    youDo: "You do",
    filingReadyPacket: "Your filing-ready packet, fully organized.",
    reviewAndSubmit: "You review and submit it directly to NYPD.",
    doneForYou: "Done for you",
    setUpForYou: "Set up for you",
    yourPick: "Your pick",
    continue: "Continue",
    nextTellUs: "Next: tell us about you — pay when you're ready",
    nextCheckout: "Next: secure checkout",
    continuePayment: "Continue to payment",
    nextInvoice: "Next: we email your invoice",
    requestInvoice: "Request invoice",
    couldNotStart: "Couldn't start — try again",
    requestReceived: "Request received",
    invoiceTiming: "We'll email your invoice within one business day, then your path unlocks.",
    starting: "Starting…",
    feeNote: "Service fees only — the NYPD application fee and fingerprint fee are paid at filing and never collected by us. You can switch plans anytime before you pay.",
    feeNoteInvoice: " Card checkout is being finalized — choosing a plan records it instantly and we email your invoice within one business day.",
    haveAccessCode: "Have an access code?",
    accessCodeFor: "Access code for",
    selectedPlan: "selected plan",
    accessCode: "Access code",
    apply: "Apply",
  },
  payments: {
    metadataTitle: "Payments",
    billing: "Billing",
    payments: "Payments",
    paid: "Paid",
    due: "Due",
    failed: "Failed",
    refunded: "Refunded",
    successBanner: "Payment received — thank you. Your receipt is below and your case is up to date.",
    canceledBanner: "Checkout was canceled — nothing was charged. You can pay any balance below whenever you're ready.",
    cardSoon: "Online card payments open soon.",
    cardSoonDetail: "Your concierge will send a secure invoice for any balance due.",
    noPayments: "No payments yet",
    noPaymentsDetail: "When you enroll or your concierge issues an invoice, it'll appear here with a secure pay link and a receipt.",
    stripeSecurity: "Payments secured by Stripe · we never collect NYPD or DCJS fees.",
    governmentFees: "Fees you pay the NYPD directly",
    governmentFeesDetail: "Never to us — paid at filing and fingerprinting.",
    applicationFee: "NYPD application fee",
    fingerprintFee: "DCJS fingerprint fee",
    totalNypd: "Total to the NYPD",
    ofPaid: "of {total} paid",
    viewInvoice: "View invoice",
    receipt: "Receipt",
    payNext: "Pay next: {amount}",
    payNow: "Pay {amount} now",
    payDefault: "Pay now",
    balanceDue: "Balance due",
    invoiceRequested: "invoice requested {date}",
    paidToDate: "Paid to date",
    plan: "Plan",
    balanceClear: "Balance clear",
    allPaid: "You're all paid up",
    history: "History",
    item: "item",
    items: "items",
    statement: "Statement",
    caseLabel: "Case",
    comped: "Comped",
    downloadStatement: "Download statement",
    fullConcierge: "Full Concierge",
    selfGuided: "Self-Guided",
    starting: "Starting…",
    onlineSoonToast: "Online payments open soon — your concierge will send an invoice.",
    deposit: "Deposit",
  },
  license: {
    metadataTitle: "Your license",
    eyebrow: "After you're licensed",
    title: "Your license",
    lede: "The clocks that matter: purchase windows, inspections, reporting duties and your renewal.",
    licensee: "Licensee",
    handgunLicense: "Handgun License",
    illustration: "Illustration · not a credential",
    issued: "Issued",
    expires: "Expires",
    beforeEyebrow: "Your license",
    beforeTitle: "This becomes your license home once you're approved",
    beforeIntro: "After the NYPD issues your license, this page keeps the clocks for you:",
    expiryRenewal: "Expiry & renewal",
    expiryRenewalDetail: "countdown",
    purchaseWindows: "Purchase windows",
    purchaseWindowsDetail: "and 72-hour inspections",
    reportingDuties: "Reporting duties",
    reportingDutiesDetail: "if something changes",
    seeApplication: "See where your application stands",
    active: "Active",
    renewalOpen: "Renewal open",
    expired: "Expired",
    validTitle: "Your license is valid",
    renewTitle: "Time to renew",
    expiredTitle: "Your license has expired",
    validUntil: "Valid until",
    daysLeft: "{days} days left",
    runwayOpen: "Renewal runway is open.",
    runwayDetail: "Start now so paperwork and appointments do not pile up near expiration.",
    termElapsed: "{percent}% of the three-year license term elapsed",
    renewalOpens: "Renewal opens",
    specialCountyTitle: "Special Carry depends on your county license",
    dayShort: "d",
    congratulations: "Licensed — congratulations.",
    reviewAsk: "If the process went well for you, a short review helps other New Yorkers find us.",
    leaveReview: "Leave a review",
    renewal: "Renewal",
    renewalContinue: "Your renewal is open — it's in your checklist.",
    renewalStart: "Start my renewal",
    opensApprox: "Opens ~{date}",
    reciprocityTitle: "Where your license is honored",
    reciprocityDescription: "Check reciprocity for your NY license, maintained by Concealed Knowledge.",
    viewReciprocity: "View reciprocity",
    pathEyebrow: "Your application path",
    pathTitle: "Compare or change your license type",
    pathDescription: "See what each license allows, who it is for, and the training, references and documents it requires.",
    pathCurrent: "Current path",
    pathUpdatesChecklist: "Updates the license path and rebuilds your checklist",
    pathUpdateAction: "Update path",
    pathSafety: "You can switch directly while your case is new. Once intake, documents, people, or prepared answers are attached, your concierge must review the change so completed work is not lost or assigned to the wrong license.",
    pathAskConcierge: "Ask your concierge about a change",
    purchaseAuthorizations: "Purchase authorizations",
    eligible: "Eligible · 1 per 90 days",
    nextPurchase: "Next purchase {date}",
    noAuthorizations: "No authorizations yet",
    noAuthorizationDetail: "log one when the License Division issues it, and we'll keep the clocks.",
    authorizationDate: "Authorization date",
    handgun: "Handgun",
    handgunOptional: "Make/model (optional)",
    saveAuthorization: "Save authorization",
    logAuthorization: "Log an authorization",
    logNewAuthorization: "Log a new authorization",
    purchaseWindow: "Purchase window",
    inspection: "Inspection",
    inspected: "Inspected",
    inspectionOverdue: "Inspection overdue",
    bought: "Bought",
    windowExpired: "Expired",
    windowOpen: "Window open",
    handgunMissing: "Handgun not entered yet",
    usedOn: "Purchase authorization used on {date}",
    daysPurchaseWindow: "{days} days left in purchase window",
    overdueContact: "Overdue — contact your concierge",
    inspectedOn: "Inspected {date}",
    inspectionClockStarts: "Inspection clock starts after purchase",
    hoursInspection: "{hours} hours left to present for inspection",
    startsAfterPurchase: "Starts after purchase",
    purchaseDate: "Purchase date",
    markBought: "Mark bought",
    markInspected: "Mark inspected",
    edit: "Edit",
    savePurchaseDate: "Save purchase date",
    cancel: "Cancel",
    authorizationSaved: "Authorization logged — valid 30 days.",
    authorized: "Authorized {date}",
    usedBought: "Used · bought {date}",
    daysLeftUntil: "{days} days left · until {date}",
    presentBy: "Present it by {date}",
    purchaseSaved: "Purchase logged — the 72-hour inspection clock is running.",
    inspectionSaved: "Inspection recorded.",
    reportTitle: "Something changed? Report it.",
    whatChanged: "What changed?",
    moreReasons: "{count} more reasons",
    chooseChange: "Choose the change that best matches what happened.",
    describeChange: "Describe what happened / what changed, with dates.",
    fileReport: "File the report",
    reportFiled: "Report filed.",
    reportFollowUp: "Report filed — your consultant will follow up with the exact NYPD reporting step.",
    recentReports: "Recent reports",
    acknowledged: "Acknowledged",
    sent: "Sent",
    dosTitle: "Armed-status upgrade (NYS DOS)",
    outstanding: "Outstanding",
    filedDos: "Filed with DOS",
    approved: "Approved",
    dosApplication: "DOS-1619-f (armed-status application)",
    firearmsCourse: "47-hour firearms course certificate",
    returnGuardCard: "Return your current security guard ID card",
    returnGuardCardHint: "Submitting the upgrade means surrendering your current guard card.",
    dosFee: "$25 DOS fee paid",
    nextInService: "Next 8-hour annual in-service due",
    nextFirearms: "Next 8-hour annual firearms course due",
    registrationRenews: "Registration renews by {date} (two-year cycle)",
    saved: "Saved.",
    undo: "Undo",
    markDone: "Mark done",
    keepingArmedStatus: "Keeping armed status",
  },
  pages: {
    detailsEyebrow: "Prepared once, reused everywhere",
    detailsTitle: "Your details",
    detailsLede: "Everything the NYPD forms ask for, in one place. Fix something here and it's fixed on every form.",
    documentsTitle: "Documents",
    documentsLede: "Every file for your application in one place — what we still need, and what we already have. This is the same list as your checklist, organized by file rather than by step.",
    formsEyebrow: "Prepared for you",
    formsTitle: "Your forms",
    formsLede: "Pre-filled from your answers. Your signature goes on automatically — sign and file in one tap, or download the ones that need a notary or witness.",
    finishIntakeTitle: "Finish your intake first",
    finishIntakeDetail: "so every form comes out fully pre-filled.",
    finishIntake: "Finish intake",
    filingPackEyebrow: "Your filing pack",
    filingPackTitle: "Everything for the NYPD portal, in one PDF",
    filingPackAnswerOrder: "The answers in the portal's own order",
    filingPackDocumentOrder: "Which document goes where",
    filingPackDocuments: "All your assembled documents",
    filingPackMode: "On Self-Guided you prepare and submit it yourself; with Full Concierge we prepare and organize it — you review and submit your own application.",
    documentsOnly: "Just the documents",
    peopleNotePrefix: "Character references and household affidavits are on the",
    peopleNoteLink: "People",
    peopleNoteSuffix: "page — each person gets a private link, so you don't prepare those forms.",
  },
  concierge: {
    fullConcierge: "Full Concierge",
    welcome: "Welcome",
    introCall: "Intro call",
    join: "Join",
    documentsIn: "Documents in",
    detailsCaptured: "Details captured",
    workInProgress: "What we're doing for you",
    step: "Step",
    of: "of",
    nextStep: "Your next step",
    bookIntroTitle: "Book your 30-minute intro call",
    bookIntroDescription: "Nothing to prepare — we'll walk through your case and answer anything.",
    chooseTime: "Request my intro call",
    modalTitle: "Book your intro call",
    modalDescription: "Pick a time for your 30-minute concierge intro call.",
    scheduledToast: "Your intro call is booked — we'll confirm the details shortly.",
    frameTitle: "Schedule your concierge intro call",
    trouble: "Having trouble?",
    openNewTab: "Open in a new tab",
    request: "Request my intro call",
    sending: "Sending…",
    requestReceived: "Request received — we'll reach out to lock in a time.",
    book: "Book",
    heroLede: "You're on the done-for-you path. We prepare and quality-check everything — you review, approve, and submit your own NYPD application with our guidance.",
    conciergeNamed: "{name} is your concierge.",
    nypdTimeline: "Your application is with the NYPD. This phase runs on the NYPD's timeline; we'll keep watch and let you know when its status changes.",
    finish: "Finish {label}",
    openItem: "Open item",
    review: "Review",
    viewProgress: "View progress",
    finishDetails: "Add the remaining details once; we'll reuse them across the documents we prepare.",
    detailsOnce: "Open your details",
    openDetails: "Open your details",
    continuePreparing: "we continue preparing your packet",
    firstItemDetails: "This is the first item that still needs you. Your concierge team will handle the follow-through.",
    teamFollowThrough: "we review what you send and move to the next item",
    reviewPacketTitle: "Review and submit your packet",
    reviewPacketDescription: "Your packet is assembled and quality-checked. Review it, then submit your own application.",
    reviewMyPacket: "Review my packet",
    workingTitle: "We're on it",
    workingDescription: "Your team is working through the current case milestone. Nothing new is required from you right now.",
    seeProgress: "See case progress",
    yourTeam: "Your team",
    messageConcierge: "Message your concierge",
    messageDescription: "Ask a question or send context without leaving your case.",
    askAnything: "Ask your concierge anything…",
    teamLabel: "Your concierge team",
    beingAssigned: "Being assigned",
    namedContact: "Your named case contact",
    assignedSoon: "Usually within one business day",
    messageTeam: "Message your team",
    unlimitedSupport: "Routine follow-ups · unlimited support",
    peopleContact: "People we contact for you",
    references: "References",
    household: "Household",
    addNames: "Add names or check status",
    finishLine: "The finish line",
    reviewSubmit: "Review & submit",
    finishLineDescription: "When your packet is ready, you approve it here, then submit your own application with our guidance.",
    unlocksAssembled: "Unlocks when your packet is assembled",
    readyReview: "Your packet is ready for your review. You submit your own NYPD application with our guidance.",
    readyReviewDescription: "Your packet is ready for your review.",
    mobileUnlocks: "Unlocks when your packet is assembled and quality-checked.",
    next: "Next",
    then: "Then",
    call: "Intro call",
    minutes: "30 min",
    requestSent: "Request sent",
    hereToHelp: "{name} is here to help",
    hereToHelpTeam: "We're here to help",
    caseReady: "Case-ready",
    realAnswers: "Real answers",
    confirmed: "Confirmed",
    information: "Your information",
    detailsReuse: "Details we'll reuse for you",
    completeOnce: "Complete it once. We carry the same verified details into every document we prepare.",
    complete: "Complete",
    captured: "captured",
    showFewer: "Show fewer sections",
    moreSections: "{count} more sections",
    milestoneDocuments: "Reviewing your documents",
    milestoneDocumentsDetail: "We check every file you send, confirm it's readable and complete, and flag anything still missing.",
    milestoneWorksheet: "Preparing your worksheet",
    milestoneWorksheetDetail: "We turn your documents and answers into a copy-and-paste worksheet for the NYPD online application.",
    milestoneReferences: "Collecting your references",
    milestoneReferencesDetail: "We invite them and follow up until their notarized letters are back.",
    milestonePacket: "Assembling your packet",
    milestonePacketDetail: "We put the full, correct packet together and run our pre-filing quality check on it.",
    milestoneReview: "Ready for your review and filing",
    milestoneReviewDetail: "You approve the packet, then submit your own application — we walk you through every step.",
    vaultEyebrow: "Your document vault",
    vaultTitle: "Documents",
    filterDocuments: "Filter documents",
    needYou: "Need you",
    withUs: "With us",
    done: "Done",
    all: "All",
    caughtUp: "Nothing needs you right now — showing every item.",
    vaultHelpTitle: "Not sure how to get or upload something?",
    vaultHelpDetail: "Tap How on any item for the instructions already approved for that requirement—or message your team anytime.",
    encrypted: "Encrypted · seen only by your team",
    documentCategories: "Document categories",
    whatWeNeed: "What we need from you",
    items: "items",
    stepByStepHint: "Tap How on anything for a step-by-step guide.",
    uploadThese: "Upload these",
    yourDocuments: "Your documents",
    uploadSub: "Snap a photo or upload a file",
    tellUsWho: "Tell us who",
    peopleBundle: "People we contact for you",
    peopleSub: "Just names and emails — we do the rest",
    readSign: "Read & sign",
    prepareSign: "We prepare, you sign",
    prepareSignSub: "We fill every form — you review and sign",
    confirmBundle: "Confirm",
    feesSignoffs: "Fees & sign-offs",
    feesSub: "Quick confirmations — most we handle",
    sponsorBundle: "From your sponsor",
    sponsorDocuments: "Sponsor documents",
    sponsorSub: "Read-only items supplied for your case",
    collapse: "Collapse",
    open: "Open",
    in: "in",
    lettersBack: "letters back",
    affidavitsBack: "back",
    addUpdateNames: "Add or update names",
    feeDirect: "NYPD fees you'll pay directly: {amount} · never to us",
    nothingNeeded: "Everything we need is in.",
    nothingNeededDetail: "Nothing for you to do right now.",
  },
  ui: {
    profileTitle: "Your profile",
    profileDescription: "Your sign-in details, password and privacy.",
    profileEyebrow: "Account",
    profileIdentityLabel: "Account identity",
    fullConcierge: "Full Concierge",
    selfGuided: "Self-Guided",
    memberSince: "Member since {date}",
    yourAccount: "Your account",
    yourAccountDescription: "Your name and phone. Changes save when you tap Save.",
    accountTitle: "Your account",
    accountDescription: "This page saves your name and phone. Your address, physical description, five-year history, safeguard and other application details live on",
    fullName: "Full name",
    email: "Email",
    signInEmail: "Sign-in email",
    signInEmailHelp: "This is your sign-in email — contact us if you need to change it.",
    phone: "Phone",
    saved: "Saved",
    saving: "Saving…",
    saveChanges: "Save changes",
    changePassword: "Change password",
    password: "Password",
    passwordDescription: "Choose a new one any time. You'll stay signed in on this device.",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    atLeastEight: "At least 8 characters",
    typeItAgain: "Type it again",
    showPassword: "Show password",
    hidePassword: "Hide password",
    passwordAtLeastEight: "At least 8 characters",
    passwordsMatch: "Passwords match",
    passwordUpdated: "Password updated",
    updating: "Updating…",
    updatePassword: "Update password",
    applicationDetailsTitle: "Looking for your application details?",
    applicationDetailsDescription: "Address, description, 5-year history and safeguard person live on Your details and fill your forms automatically.",
    shortcuts: "Shortcuts",
    yourDetailsShortcut: "Your details",
    yourDetailsShortcutDescription: "Application answers",
    yourDataShortcut: "Your data",
    yourDataShortcutDescription: "Privacy & requests",
    languageShortcut: "Language",
    signOutShortcutDescription: "On this device",
    messagesTitle: "Messages",
    messagesDescription: "Questions? Message your Gun License NYC specialist any time.",
    messagePlaceholder: "Message your specialist…",
    checklistTitle: "Your checklist",
    checklistComplete: "Intake complete — this is your personalized checklist. Each item finishes as you provide its document.",
    checklistJourney: "This is the journey view: what's left and what to do next. Documents holds every file, needed and provided.",
    checklistActions: "The actions we need from you right now. Documents holds every file, needed and provided.",
    peopleTitle: "References & household",
    peopleDescription: "Add your character references and everyone 18+ living with you.",
    references: "References",
    household: "Household",
    outreach: "Outreach",
    outreachDescription: "Send each reference a one-click link to confirm and attest — no account needed. Batch them so you can notarize all references plus cohabitant affidavits in one sitting.",
    affidavits: "Affidavits",
    affidavitsDescription: "Each adult gets a one-click link to confirm and notarize their affidavit — we build the document for them. Or upload a notarized copy yourself.",
    addEmailInvite: "add an email to invite",
    differentEmail: "Confirmed a different email: {email}",
    notarized: "notarized",
    responded: "responded",
    openedLink: "opened link",
    invited: "invited",
    notInvited: "not invited",
    confirmed: "confirmed",
    resend: "Resend",
    sendLink: "Send link",
    revoke: "Revoke",
    formsSignatureSaved: "Signature saved — your forms now download pre-signed.",
    formsFiledToast: "Signed and filed — this requirement is complete.",
    yourSignature: "Your signature",
    signatureOnFileDetail: "On file — your documents download already signed, and eligible forms can be filed in one tap.",
    signatureEmptyDetail: "Sign once and every form below comes out pre-signed.",
    signaturePreview: "Signature preview",
    noSignatureOnFile: "No signature on file",
    noSignatureYet: "No signature yet",
    onFile: "On file",
    cancel: "Cancel",
    resign: "Re-sign",
    addSignature: "Add your signature",
    yourForms: "Your forms",
    preparedFiled: "{prepared} prepared · {filed} filed",
    form: "Form",
    signingMethod: "How it's signed",
    status: "Status",
    actions: "Actions",
    filed: "Filed ✓",
    notFiled: "Not filed",
    filing: "Filing…",
    signFile: "Sign & file",
    download: "Download",
    addSignatureHint: "Add your signature above to file this in one tap.",
    oneTap: "Sign & file in one tap",
    needsNotary: "Needs a notary",
    needsWitness: "Needs a witness",
    downloadSignUpload: "Download, sign, upload",
    privacyTitle: "Your data",
    privacyDescription: "What we hold for your application, and what you can ask us to do with it.",
    recordsHeld: "How your records are held",
    recordsRuleOne: "Only you and our staff can see your case. Instructors never see your disclosures.",
    recordsRuleTwo: "Documents live in access-controlled storage and are encrypted at rest and in transit.",
    recordsRuleThree: "We never sell your information, and we don't share it with instructors beyond what they need to teach you.",
    askSomething: "Ask us for something",
    deletionTitle: "What deletion actually does",
    deletionBody: "We remove your disclosures, intake answers, questionnaire answers, uploaded and generated documents, household and reference records, and any notes on your case — including the files themselves, not just the database rows.",
    deletionKeepTitle: "One thing we keep, and why:",
    deletionKeepBody: "when you e-signed a document, we recorded a tamper-evident record of that signing. We keep the proof-of-signing entry — the timestamp, the document fingerprint, and the consent wording — because it's the evidence that a signature was validly obtained, and it contains none of your personal story. We delete your signature image and strip the IP address and device details from it.",
    deletionHonesty: "We'd rather tell you that plainly than claim a clean wipe we don't perform. If you have questions, email {email}.",
    yourRequests: "Your requests",
    dataCopy: "A copy of your data",
    dataCorrection: "A correction",
    dataDeletion: "Deletion",
    filedDate: "Filed {date}",
    sendCopy: "Send me a copy",
    sendCopyHint: "We'll put together everything we hold for your case.",
    fixSomething: "Fix something",
    fixSomethingHint: "Tell us what's wrong and we'll correct it.",
    deleteData: "Delete my data",
    deleteDataHint: "Read what deletion does, below, before you ask for this — it can't be undone.",
    requestFiled: "Request filed — we'll follow up by email.",
    requestDetailPlaceholder: "Anything you'd like us to know (optional).",
    filingRequest: "Filing…",
    submitRequest: "Submit request",
    remove: "Remove",
    referenceAdded: "Reference added",
    family: "Family",
    unrelated: "Unrelated",
    noReferences: "No references yet.",
    referencesAdded: "All {count} references added. Remember to get each one notarized.",
    addReferenceCount: "Add a reference ({current}/{required})",
    name: "Name",
    relationship: "Relationship",
    relationshipExample: "e.g. Friend, Sibling",
    optional: "optional",
    familyMember: "This person is a family member",
    addReference: "Add reference",
    cohabitantAdded: "Cohabitant added",
    noCohabitants: "No cohabitants listed.",
    addCohabitant: "Add a cohabitant",
    cohabitantExample: "e.g. Spouse, Roommate",
    cohabitantEmail: "Email (we'll send the affidavit link)",
    cohabitantEmailPlaceholder: "optional — enables self-service",
    uploadNotarized: "Upload notarized",
    linkCopied: "Link copied",
    copyLink: "Copy link",
    noMessages: "No messages yet. Say hello!",
    sendError: "Couldn't send. Try again.",
    system: "System",
    insertTemplate: "Insert a message template",
    insertTemplateOption: "Insert a template…",
    send: "Send",
    all: "All",
    toDo: "To do",
    completed: "Completed",
    needsNotarization: "Needs notarization",
    requirementsNotGenerated: "Your personalized requirements haven't been generated yet.",
    doneCount: "{done} / {total} done",
    requirementsSatisfied: "{done} of {total} requirements satisfied",
    checklistProgress: "Checklist progress",
    filterChecklist: "Filter your checklist",
    nothingLeft: "Nothing left to do here — every item is complete.",
    nothingInView: "Nothing in this view yet.",
    notApplicable: "Not applicable to your case ({count})",
    categoryIdentity: "Identity",
    categoryResidence: "Residence",
    categoryRecords: "Records & disclosures",
    categoryCredentials: "Credentials",
    categoryTraining: "Training",
    categoryPeople: "People",
    categoryPrepared: "Prepared forms",
    categoryConditional: "Additional requirements",
    categorySponsor: "Sponsor",
    categoryAdmin: "Fees & confirmations",
    welcome: "Welcome.",
    conciergeWillReach: "Your Gun License NYC concierge will reach out shortly to get you started.",
    yourApplication: "Your application",
    paymentUnlockTitle: "You chose Full Concierge — finish your payment to unlock it",
    paymentUnlockDescription: "Once your payment is in, your done-for-you dashboard opens and we take it from there. You can still switch to Self-Guided before you pay.",
    finishEnrolling: "Finish enrolling",
    whereYouAre: "Where you are",
    yourNextStep: "Your next step",
    doneOf: "{done} of {total} done",
    appealOpen: "Your appeal window is open — 90 days, strict rules. Start here.",
    licenseHubLink: "Your license — purchase authorizations, inspections, reporting duties & renewal",
    chooseWorkMode: "Choose how we'll work together — Self-Guided or Full Concierge",
    choosePackage: "Choose your package — start your engagement",
    intakeCompleteLink: "Intake complete — view your personalized checklist",
    intakeBuildLink: "Application intake — build your personalized document set",
    trainingBooked: "Training booked — {date}",
    instructorNamed: "Your instructor: {name} — schedule your session",
    instructorsInterested: "{count} instructors interested — choose yours",
    instructorInterested: "1 instructor interested — choose yours",
    trainingAwaiting: "Training request sent — awaiting interested instructors",
    findInstructor: "Find a verified local instructor",
    preparedDocuments: "Documents we prepared for you — download & sign",
    currentStage: "Current Stage",
    nextLabel: "Next //",
    fullTimeline: "Your full application timeline",
    todos: "To-dos",
    trainingLabel: "Training",
    paidLabel: "Paid",
    finishIntakeDetail: "It's what builds your personalized document list — until it's done, we're guessing at what you need.",
    nothingNeededNow: "Nothing needed from you right now",
    seeProvided: "See everything you've provided",
    seeHow: "See how to get it",
    startNow: "Start it now",
    inviteNow: "Invite them now",
    takeLook: "Take a look",
    switchAccount: "Switch account",
    notifications: "Notifications",
    recentNotifications: "Recent account notifications",
    notificationMessage: "Message",
    notificationDocument: "Document",
    notificationAttention: "Needs attention",
    notificationPeople: "People",
    notificationSchedule: "Schedule",
    notificationMilestone: "Milestone",
    notificationDefault: "Notification",
    today: "Today",
    earlier: "Earlier",
    caughtUp: "You're all caught up.",
    updatesAppear: "New case updates will appear here.",
    unreadLabel: "Unread",
    newCount: "{count} new",
    closeNotifications: "Close notifications",
    filterNotifications: "Filter notifications",
    unreadOnly: "Unread",
    latestUpdates: "You're seeing the latest 15 updates.",
    openMessages: "Open messages",
    justNow: "Just now",
    minutesAgo: "{count}m ago",
    hoursAgo: "{count}h ago",
    daysAgo: "{count}d ago",
  },
  legal: {
    filesOwnApplication:
      "You file your own application — we prepare and review, we never submit it for you or represent you before the NYPD.",
    purchaseAuthorizationRule:
      "Valid 30 days · present the handgun for inspection within 72 hours of buying.",
    reportChangesRule:
      "License holders must promptly report certain changes (38 RCNY §5-24). Filing here records it, alerts your consultant, and we walk you through the NYPD step. When in doubt, report — candor protects your license.",
    countyDependencyRule:
      "If the county license lapses, the Special Carry voids automatically.",
  },
}

// Spanish overlay. Non-legal strings only — `legal` is intentionally omitted so
// it falls back to the reviewed English until counsel signs off on a translation.
const es: DeepPartial<Messages> = {
  portal: {
    tagline: "Seguimiento de su solicitud de {license} de NYC, de principio a fin.",
    licenseWord: { armedGuard: "guardia armado", concealedCarry: "porte oculto", premises: "local (premises)" },
    yourData: "Sus datos y privacidad",
    nextStepEyebrow: "Su siguiente paso",
    finishIntake: "Complete su cuestionario",
    continueIntake: "Continuar el cuestionario",
    viewEverything: "Ver todo lo que falta por hacer",
    home: {
      applicationEyebrow: "Su solicitud",
      selfGuided: "Autoguiado",
      fullConcierge: "Conserjería completa",
      goodMorning: "Buenos días, {name}",
      goodAfternoon: "Buenas tardes, {name}",
      goodEvening: "Buenas noches, {name}",
      mobileGreeting: "Hola, {name}",
      teamLabel: "Su equipo",
      supportName: "Equipo de Gun License NYC",
      repliesWithin: "Responde en {days} día hábil",
      getStartedSubline: "La configuración está en marcha. Complete el siguiente paso a continuación.",
      trainingSubline: "Su capacitación está en marcha. Conserve juntos el curso y el certificado.",
      documentsSubline: "Está en la etapa de documentos. Faltan {count} para que su expediente esté listo.",
      nypdSubline: "Su solicitud está en manos del NYPD.",
      decisionSubline: "El NYPD ha emitido una decisión sobre su solicitud.",
      nextStep: "Su siguiente paso",
      whereYouAre: "Dónde está ahora",
      todoDone: "tareas completadas",
      todoAria: "{done} de {total} tareas completadas",
      seeEverythingLeft: "Ver todo lo pendiente ({count})",
      firstDecision: "Primero, una decisión",
      chooseWorkTitle: "Elija cómo trabajaremos juntos",
      chooseWorkDetail: "Esto determina todo lo demás. Puede leer ambas opciones antes de pagar.",
      selfChoiceTitle: "Autoguiado",
      selfChoiceDetail: "Usted presenta; nosotros le guiamos.",
      conciergeChoiceTitle: "Conserjería completa",
      conciergeChoiceDetail: "Preparamos y revisamos; usted revisa y presenta.",
      comparePlans: "Comparar planes",
      choosePackageTitle: "Elija su paquete",
      choosePackageDetail: "Seleccione el nivel de apoyo adecuado para habilitar el resto de su espacio de trabajo.",
      choosePackage: "Elegir un paquete",
      licensedEyebrow: "Ya tiene licencia",
      licensedTitle: "Felicitaciones, {name}",
      licensedDetail: "Su centro de licencia reúne los plazos de compra, inspecciones, deberes de información y renovación.",
      openLicenseHub: "Abrir el centro de licencia",
      deniedEyebrow: "Su plazo de apelación está abierto",
      deniedTitle: "Puede apelar esta decisión",
      deniedDetail: "Hay una fecha límite. Comience ahora y le guiaremos durante el proceso.",
      startAppeal: "Iniciar su apelación",
      journey: "Su recorrido",
      phaseOf: "Fase {current} de {total}",
      fullTimeline: "Cronología completa",
      youAreHere: "Está aquí",
      nypdClock: "Plazo del NYPD",
      phaseGetStarted: "Comenzar",
      phaseGetStartedDetail: "Cuenta, elegibilidad y plan",
      phaseTraining: "Capacitación",
      phaseTrainingDetail: "Clase de 16 horas + campo de tiro",
      phaseDocuments: "Documentos",
      phaseDocumentsDetail: "Cargar, notarizar y revisar",
      phaseNypd: "Revisión del NYPD",
      phaseNypdDetail: "Presentación · huellas · entrevista",
      phaseDecision: "Decisión",
      phaseDecisionDetail: "Licencia emitida",
      training: "Capacitación",
      documents: "Documentos",
      messages: "Mensajes",
      payments: "Pagos",
      done: "Listo",
      notRequired: "No se requiere",
      noTrainingRequired: "Este tipo de licencia no requiere el curso de porte oculto.",
      trainingComplete: "Ha completado la capacitación requerida.",
      findInstructor: "Buscar un instructor",
      findingInstructors: "Estamos buscando instructores cerca de usted.",
      instructorsInterested: "{count} instructor(es) interesado(s)",
      yourInstructor: "Su instructor",
      classBooked: "Clase reservada para {date}",
      viewCertificate: "Ver certificado",
      documentsStatus: "{done} de {total}",
      itemsLeft: "Faltan {count} elementos",
      intakeComplete: "Cuestionario completo",
      finishIntakeFirst: "Complete primero su cuestionario",
      openDocuments: "Abrir documentos",
      preparedForms: "Formularios que completamos para usted",
      upToDate: "Al día",
      newMessages: "{count} nuevos",
      noMessages: "Los mensajes de su equipo aparecerán aquí.",
      reply: "Responder",
      teamSender: "Gun License NYC",
      paidInFull: "Pagado en su totalidad",
      paymentDue: "{package} · pago pendiente",
      openPayments: "Abrir pagos",
      timingTitle: "¿Cuánto tarda este proceso?",
      timingBefore: "El ritmo antes de presentar depende principalmente de la rapidez con que reúna sus documentos y capacitación. Después de presentar, la revisión del NYPD suele tardar unos seis meses, y ese plazo depende del NYPD, no de nosotros.",
      timingAfter: "Una vez presentada la solicitud, la revisión de la División de Licencias suele tardar unos seis meses, y a veces más. Ese plazo lo fija el NYPD, no nosotros, y nadie puede acelerar su investigación. Le mantendremos informado de cada paso que podamos ver.",
      prepareInterview: "Prepararse para la entrevista",
      referralCompanyFallback: "la empresa que le presentó",
    },
  },
  common: {
    signOut: "Cerrar sesión",
    language: "Idioma",
    account: "Cuenta",
    profile: "Perfil",
    legalEnglishNotice: "El texto legal permanece en inglés revisado hasta que un abogado apruebe la versión en español.",
    almostThere: "Ya casi está.",
    noCase: "Su caso aún no está configurado. Cierre la sesión e ingrese de nuevo, o contáctenos para recibir ayuda.",
  },
  shell: {
    primary: "Principal",
    home: "Inicio",
    checklist: "Lista",
    documents: "Documentos",
    people: "Personas",
    concierge: "Conserjería",
    yourApplication: "Su solicitud",
    messages: "Mensajes",
    forms: "Formularios",
    preparedForms: "Formularios preparados",
    payments: "Pagos",
    license: "Licencia",
    yourLicense: "Su licencia",
    appeal: "Apelación",
    more: "Más",
    yourDetails: "Sus datos",
    profileAndData: "Perfil y datos",
    detailsStatus: "Se ingresan una vez y se reutilizan en cada formulario",
    messagesStatus: "Su equipo del caso y el instructor",
    formsStatus: "Documentos que preparamos para usted",
    paymentsStatus: "Facturas y recibos",
    licenseStatus: "Disponible después de la emisión",
    appealStatus: "Solo si se deniega su solicitud",
    profileStatus: "Cuenta, contraseña y privacidad",
    unread: "sin leer",
    unreadFromTeam: "sin leer de su equipo del caso",
  },
  setup: {
    setup: "Configuración",
    licensePath: "Tipo de licencia",
    plan: "Plan",
    payment: "Pago",
    getStarted: "Comenzar",
    nextStep: "Siguiente paso",
    current: "Actual",
    continue: "Continuar",
    saving: "Guardando…",
    saveError: "No se pudo guardar — inténtelo de nuevo",
  },
  licensePath: {
    metadataTitle: "Elija su tipo de licencia",
    title: "¿Qué desea que le permita hacer su licencia?",
    lede: "Esto determina su capacitación, referencias y lista de requisitos.",
    radioLabel: "Tipo de licencia",
    keepAtHome: "Mantenerla en casa",
    premiseResidence: "Licencia para residencia",
    premiseDescription: "Una pistola guardada en su hogar de NYC — no para portarla en público.",
    carryInNyc: "Portar en NYC",
    concealedCarry: "Porte oculto",
    concealedDescription: "Autorización para portar de manera oculta, para una persona elegible en NYC.",
    extendCounty: "Extender una licencia de condado",
    specialCarry: "Porte especial",
    specialDescription: "Vive fuera de NYC y ya tiene una licencia de porte de un condado de Nueva York.",
    references: "Referencias",
    training: "Capacitación",
    checklist: "Lista",
    requires: "Requiere",
    review: "Revisión",
    scope: "Alcance",
    nonFamily: "sin parentesco",
    none: "Ninguna",
    noCourse: "sin curso de 16 + 2 horas",
    home: "Hogar",
    residenceHousehold: "ID, residencia y hogar",
    character: "personales",
    classroomLiveFire: "aula + tiro real",
    carry: "Porte",
    carrySpecific: "específico para porte",
    county: "Condado",
    activeLicense: "su licencia vigente",
    nyc: "NYC",
    nycDocuments: "documentos de NYC",
    personal: "Personal",
    carryOnly: "solo porte personal",
    nextChoosePlan: "Siguiente: elija su plan",
    replaces: "Reemplaza",
    staffQuestion: "¿Licencia para negocio, trabajo armado o agente retirado?",
    staffAnswer: "Estas opciones requieren una breve revisión del equipo — envíe un mensaje a su conserje y la configuraremos.",
  },
  choosePath: {
    metadataTitle: "Elija cómo trabajaremos juntos",
    title: "¿Cómo desea que trabajemos juntos?",
    ledePrefix: "La misma meta, dos maneras de llegar.",
    selfGuided: "Autoguiado:",
    selfGuidedShort: "usted presenta su propia solicitud.",
    concierge: "Conserjería completa:",
    conciergeShort: "la preparamos y revisamos con usted; usted la revisa y la presenta.",
    servicePlan: "Plan de servicio",
    youGuideEyebrow: "Usted avanza; nosotros le guiamos",
    selfTagline: "El proceso completo, en sus manos.",
    conciergeEyebrow: "Hacemos el trabajo · usted mantiene el control",
    conciergeTagline: "Entréguenos las piezas — organizamos la preparación de principio a fin.",
    gatherDocuments: "Reunir sus propios documentos",
    bookTraining: "Reservar su propia capacitación",
    coordinateReferences: "Coordinar sus dos referencias",
    submitApplication: "Presentar su propia solicitud",
    personalizedChecklist: "Darle una lista exacta y personalizada",
    prepareForms: "Preparar sus formularios y responder preguntas sobre el proceso",
    flagGaps: "Señalar lo que falte antes de que presente",
    coordinateAffidavits: "Coordinar sus referencias y declaraciones juradas de convivientes",
    qualityCheckPacket: "Preparar, organizar y revisar todo su expediente",
    filingReadyApplication: "Organizar una solicitud lista para que usted la revise",
    routineFollowUp: "Dar seguimiento constante, con apoyo ilimitado de nuestro equipo",
    signAndProvide: "Firmar sus formularios y proporcionar sus documentos",
    reviewPacket: "Revisar su expediente terminado",
    submitToNypd: "Presentar personalmente su solicitud directamente al NYPD",
    weDo: "Nosotros hacemos",
    youDo: "Usted hace",
    filingReadyPacket: "Su expediente listo para presentar, completamente organizado.",
    reviewAndSubmit: "Usted lo revisa y lo presenta directamente al NYPD.",
    doneForYou: "Hecho para usted",
    setUpForYou: "Configurado para usted",
    yourPick: "Su elección",
    continue: "Continuar",
    nextTellUs: "Siguiente: cuéntenos sobre usted — pague cuando esté listo",
    nextCheckout: "Siguiente: pago seguro",
    continuePayment: "Continuar al pago",
    nextInvoice: "Siguiente: le enviamos la factura",
    requestInvoice: "Solicitar factura",
    couldNotStart: "No se pudo iniciar — inténtelo de nuevo",
    requestReceived: "Solicitud recibida",
    invoiceTiming: "Le enviaremos la factura en un día hábil; después se habilitará su plan.",
    starting: "Iniciando…",
    feeNote: "Solo honorarios del servicio — la tarifa de solicitud del NYPD y la tarifa de huellas se pagan al presentar y nunca las cobramos nosotros. Puede cambiar de plan antes de pagar.",
    feeNoteInvoice: " El pago con tarjeta se está terminando de configurar — al elegir un plan queda registrado de inmediato y le enviamos la factura en un día hábil.",
    haveAccessCode: "¿Tiene un código de acceso?",
    accessCodeFor: "Código de acceso para",
    selectedPlan: "el plan seleccionado",
    accessCode: "Código de acceso",
    apply: "Aplicar",
  },
  payments: {
    metadataTitle: "Pagos",
    billing: "Facturación",
    payments: "Pagos",
    paid: "Pagado",
    due: "Pendiente",
    failed: "Fallido",
    refunded: "Reembolsado",
    successBanner: "Pago recibido — gracias. Su recibo aparece abajo y su caso está al día.",
    canceledBanner: "Se canceló el pago — no se realizó ningún cargo. Puede pagar el saldo pendiente cuando esté listo.",
    cardSoon: "Los pagos con tarjeta estarán disponibles pronto.",
    cardSoonDetail: "Su conserje le enviará una factura segura por cualquier saldo pendiente.",
    noPayments: "Aún no hay pagos",
    noPaymentsDetail: "Cuando se inscriba o su conserje emita una factura, aparecerá aquí con un enlace de pago seguro y un recibo.",
    stripeSecurity: "Pagos protegidos por Stripe · nunca cobramos las tarifas del NYPD ni de DCJS.",
    governmentFees: "Tarifas que paga directamente al NYPD",
    governmentFeesDetail: "Nunca se pagan a nosotros — se pagan al presentar y al tomar las huellas.",
    applicationFee: "Tarifa de solicitud del NYPD",
    fingerprintFee: "Tarifa de huellas de DCJS",
    totalNypd: "Total para el NYPD",
    ofPaid: "de {total} pagado",
    viewInvoice: "Ver factura",
    receipt: "Recibo",
    payNext: "Pagar ahora: {amount}",
    payNow: "Pagar {amount} ahora",
    payDefault: "Pagar ahora",
    balanceDue: "Saldo pendiente",
    invoiceRequested: "factura solicitada el {date}",
    paidToDate: "Pagado hasta la fecha",
    plan: "Plan",
    balanceClear: "Saldo saldado",
    allPaid: "Todos sus pagos están al día",
    history: "Historial",
    item: "elemento",
    items: "elementos",
    statement: "Estado de cuenta",
    caseLabel: "Caso",
    comped: "Cortesía",
    downloadStatement: "Descargar estado de cuenta",
    fullConcierge: "Conserjería completa",
    selfGuided: "Autoguiado",
    starting: "Iniciando…",
    onlineSoonToast: "Los pagos en línea estarán disponibles pronto — su conserje le enviará una factura.",
    deposit: "Depósito",
  },
  license: {
    metadataTitle: "Su licencia",
    eyebrow: "Después de recibir la licencia",
    title: "Su licencia",
    lede: "Los plazos importantes: compras, inspecciones, reportes y renovación.",
    licensee: "Titular",
    handgunLicense: "Licencia de pistola",
    illustration: "Ilustración · no es una credencial",
    issued: "Emitida",
    expires: "Vence",
    beforeEyebrow: "Su licencia",
    beforeTitle: "Este será el centro de su licencia cuando sea aprobada",
    beforeIntro: "Después de que el NYPD emita su licencia, esta página le ayudará a seguir los plazos:",
    expiryRenewal: "Vencimiento y renovación",
    expiryRenewalDetail: "cuenta regresiva",
    purchaseWindows: "Plazos de compra",
    // ⚖ Legal-bearing copy intentionally falls back to reviewed English.
    reportingDuties: "Obligaciones de reporte",
    seeApplication: "Ver el estado de su solicitud",
    active: "Vigente",
    renewalOpen: "Renovación disponible",
    expired: "Vencida",
    validTitle: "Su licencia está vigente",
    renewTitle: "Es momento de renovar",
    expiredTitle: "Su licencia ha vencido",
    validUntil: "Válida hasta",
    daysLeft: "Quedan {days} días",
    runwayOpen: "El período de renovación está abierto.",
    runwayDetail: "Comience ahora para evitar que los documentos y las citas se acumulen cerca del vencimiento.",
    termElapsed: "Ha transcurrido el {percent}% del período de tres años",
    renewalOpens: "Se abre la renovación",
    dayShort: "días",
    congratulations: "Licencia emitida — felicitaciones.",
    reviewAsk: "Si tuvo una buena experiencia, una reseña breve ayuda a que otros neoyorquinos nos encuentren.",
    leaveReview: "Dejar una reseña",
    renewal: "Renovación",
    renewalContinue: "Su renovación está abierta — aparece en su lista.",
    renewalStart: "Comenzar mi renovación",
    opensApprox: "Se abre aprox. {date}",
    reciprocityTitle: "Dónde se reconoce su licencia",
    reciprocityDescription: "Consulte la reciprocidad de su licencia de NY, mantenida por Concealed Knowledge.",
    viewReciprocity: "Ver reciprocidad",
    pathEyebrow: "Ruta de su solicitud",
    pathTitle: "Compare o cambie su tipo de licencia",
    pathDescription: "Vea qué permite cada licencia, para quién es y qué capacitación, referencias y documentos requiere.",
    pathCurrent: "Ruta actual",
    pathUpdatesChecklist: "Actualiza el tipo de licencia y vuelve a crear su lista",
    pathUpdateAction: "Actualizar ruta",
    pathSafety: "Puede cambiar directamente mientras su caso sea nuevo. Cuando ya haya completado el cuestionario o agregado documentos, personas o respuestas preparadas, su conserje debe revisar el cambio para no perder ni clasificar mal el trabajo completado.",
    pathAskConcierge: "Consultar el cambio con su conserje",
    purchaseAuthorizations: "Autorizaciones de compra",
    nextPurchase: "Próxima compra {date}",
    noAuthorizations: "Aún no hay autorizaciones",
    noAuthorizationDetail: "regístrela cuando la División de Licencias la emita y nosotros seguiremos los plazos.",
    authorizationDate: "Fecha de autorización",
    handgun: "Pistola",
    handgunOptional: "Marca/modelo (opcional)",
    saveAuthorization: "Guardar autorización",
    logAuthorization: "Registrar una autorización",
    logNewAuthorization: "Registrar una nueva autorización",
    purchaseWindow: "Plazo de compra",
    inspection: "Inspección",
    inspected: "Inspeccionada",
    inspectionOverdue: "Inspección atrasada",
    bought: "Comprada",
    windowExpired: "Vencida",
    windowOpen: "Plazo abierto",
    handgunMissing: "Aún no se ingresó la pistola",
    usedOn: "Autorización de compra utilizada el {date}",
    daysPurchaseWindow: "Quedan {days} días en el plazo de compra",
    overdueContact: "Atrasado — contacte a su conserje",
    inspectedOn: "Inspeccionada el {date}",
    inspectionClockStarts: "El plazo de inspección comienza después de la compra",
    hoursInspection: "Quedan {hours} horas para presentarla a inspección",
    startsAfterPurchase: "Comienza después de la compra",
    purchaseDate: "Fecha de compra",
    markBought: "Marcar como comprada",
    markInspected: "Marcar como inspeccionada",
    edit: "Editar",
    savePurchaseDate: "Guardar fecha de compra",
    cancel: "Cancelar",
    authorized: "Autorizada el {date}",
    usedBought: "Utilizada · comprada el {date}",
    daysLeftUntil: "Quedan {days} días · hasta {date}",
    presentBy: "Preséntela antes del {date}",
    inspectionSaved: "Inspección registrada.",
    reportTitle: "¿Cambió algo? Repórtelo.",
    whatChanged: "¿Qué cambió?",
    moreReasons: "{count} motivos más",
    chooseChange: "Elija el cambio que mejor describa lo ocurrido.",
    describeChange: "Describa lo ocurrido o lo que cambió, con fechas.",
    fileReport: "Presentar el reporte",
    reportFiled: "Reporte presentado.",
    reportFollowUp: "Reporte presentado — su consultor le dará seguimiento con el paso exacto del NYPD.",
    recentReports: "Reportes recientes",
    acknowledged: "Confirmado",
    sent: "Enviado",
    dosTitle: "Actualización de estatus armado (NYS DOS)",
    outstanding: "Pendiente",
    filedDos: "Presentado ante DOS",
    approved: "Aprobado",
    dosApplication: "DOS-1619-f (solicitud de estatus armado)",
    firearmsCourse: "Certificado del curso de armas de 47 horas",
    returnGuardCard: "Devolver su tarjeta actual de guardia de seguridad",
    dosFee: "Tarifa de $25 de DOS pagada",
    saved: "Guardado.",
    undo: "Deshacer",
    markDone: "Marcar como hecho",
    keepingArmedStatus: "Mantener el estatus armado",
  },
  pages: {
    detailsEyebrow: "Preparado una vez, reutilizado en todas partes",
    detailsTitle: "Sus datos",
    detailsLede: "Toda la información que solicitan los formularios del NYPD, en un solo lugar. Corrija algo aquí y se corregirá en cada formulario.",
    documentsTitle: "Documentos",
    documentsLede: "Todos los archivos de su solicitud en un solo lugar — lo que aún necesitamos y lo que ya tenemos. Es la misma lista de requisitos, organizada por archivo en lugar de por paso.",
    formsEyebrow: "Preparados para usted",
    formsTitle: "Sus formularios",
    formsLede: "Completados previamente con sus respuestas. Su firma se agrega automáticamente — firme y presente con un toque, o descargue los que requieran notario o testigo.",
    finishIntakeTitle: "Primero complete su cuestionario",
    finishIntakeDetail: "para que cada formulario quede completamente llenado.",
    finishIntake: "Completar cuestionario",
    filingPackEyebrow: "Su expediente para presentar",
    filingPackTitle: "Todo para el portal del NYPD, en un solo PDF",
    filingPackAnswerOrder: "Las respuestas en el mismo orden del portal",
    filingPackDocumentOrder: "Qué documento corresponde a cada sección",
    filingPackDocuments: "Todos sus documentos organizados",
    // ⚖ Filing responsibility remains reviewed English pending counsel approval.
    documentsOnly: "Solo los documentos",
    peopleNotePrefix: "Las referencias personales y declaraciones juradas del hogar están en la página",
    peopleNoteLink: "Personas",
    peopleNoteSuffix: "— cada persona recibe un enlace privado, por lo que usted no prepara esos formularios.",
  },
  concierge: {
    fullConcierge: "Servicio de conserjería",
    welcome: "Hola",
    introCall: "Llamada inicial",
    join: "Entrar",
    documentsIn: "Documentos listos",
    detailsCaptured: "Datos guardados",
    workInProgress: "Lo que hacemos por usted",
    step: "Paso",
    of: "de",
    nextStep: "Su siguiente paso",
    bookIntroTitle: "Reserve su llamada inicial de 30 minutos",
    bookIntroDescription: "No necesita preparar nada — revisaremos su caso y responderemos sus preguntas.",
    chooseTime: "Solicitar mi llamada inicial",
    modalTitle: "Reserve su llamada inicial",
    modalDescription: "Elija una fecha y hora para su llamada inicial de 30 minutos.",
    scheduledToast: "Su llamada inicial está reservada — confirmaremos los detalles en breve.",
    frameTitle: "Programe su llamada inicial",
    trouble: "¿Tiene problemas?",
    openNewTab: "Abrir en otra pestaña",
    request: "Solicitar mi llamada inicial",
    sending: "Enviando…",
    requestReceived: "Solicitud recibida — nos comunicaremos para confirmar una hora.",
    book: "Reservar",
    heroLede: "Está en el plan de servicio completo. Preparamos y revisamos todo — usted revisa, aprueba y presenta su propia solicitud ante el NYPD con nuestra orientación.",
    conciergeNamed: "{name} es su conserje.",
    nypdTimeline: "Su solicitud está con el NYPD. Esta fase sigue el calendario del NYPD; nosotros la vigilaremos y le avisaremos cuando cambie su estado.",
    finish: "Complete {label}",
    openItem: "Abrir elemento",
    review: "Revisar",
    viewProgress: "Ver progreso",
    finishDetails: "Agregue una vez los datos restantes; los reutilizaremos en los documentos que preparemos.",
    detailsOnce: "Abrir sus datos",
    openDetails: "Abrir sus datos",
    continuePreparing: "seguimos preparando su expediente",
    firstItemDetails: "Este es el primer elemento que aún necesita de usted. Su equipo de conserjería se encargará del seguimiento.",
    teamFollowThrough: "revisamos lo que envíe y pasamos al siguiente elemento",
    reviewPacketTitle: "Revise y presente su expediente",
    reviewPacketDescription: "Su expediente está organizado y revisado. Revíselo y luego presente su propia solicitud.",
    reviewMyPacket: "Revisar mi expediente",
    workingTitle: "Estamos trabajando",
    workingDescription: "Su equipo está avanzando en la etapa actual del caso. No necesitamos nada nuevo de usted por ahora.",
    seeProgress: "Ver progreso del caso",
    yourTeam: "Su equipo",
    messageConcierge: "Escriba a su conserje",
    messageDescription: "Haga una pregunta o envíe información sin salir de su caso.",
    askAnything: "Pregunte lo que necesite a su conserje…",
    teamLabel: "Su equipo de conserjería",
    beingAssigned: "Asignación en curso",
    namedContact: "Su contacto asignado para el caso",
    assignedSoon: "Por lo general, en un día hábil",
    messageTeam: "Escribir a su equipo",
    unlimitedSupport: "Seguimiento habitual · apoyo ilimitado",
    peopleContact: "Personas con quienes nos comunicamos por usted",
    references: "Referencias",
    household: "Hogar",
    addNames: "Agregar nombres o ver el estado",
    finishLine: "La etapa final",
    reviewSubmit: "Revisar y presentar",
    finishLineDescription: "Cuando su expediente esté listo, usted lo aprueba aquí y luego presenta su propia solicitud con nuestra orientación.",
    unlocksAssembled: "Se habilita cuando el expediente esté organizado",
    readyReview: "Su expediente está listo para revisar. Usted presenta su propia solicitud al NYPD con nuestra orientación.",
    readyReviewDescription: "Su expediente está listo para revisar.",
    mobileUnlocks: "Se habilita cuando el expediente esté organizado y revisado.",
    next: "Siguiente",
    then: "Después",
    call: "Llamada inicial",
    minutes: "30 min",
    requestSent: "Solicitud enviada",
    hereToHelp: "{name} está aquí para ayudarle",
    hereToHelpTeam: "Estamos aquí para ayudarle",
    caseReady: "Caso encaminado",
    realAnswers: "Respuestas claras",
    confirmed: "Confirmado",
    information: "Su información",
    detailsReuse: "Datos que reutilizaremos por usted",
    completeOnce: "Complételos una sola vez. Usaremos los mismos datos verificados en cada documento que preparemos.",
    complete: "Completo",
    captured: "guardados",
    showFewer: "Mostrar menos secciones",
    moreSections: "{count} secciones más",
    milestoneDocuments: "Revisamos sus documentos",
    milestoneDocumentsDetail: "Revisamos cada archivo que envíe, confirmamos que sea legible y completo, y señalamos lo que falte.",
    milestoneWorksheet: "Preparamos su hoja de respuestas",
    milestoneWorksheetDetail: "Convertimos sus documentos y respuestas en una hoja lista para copiar al portal de solicitud del NYPD.",
    milestoneReferences: "Recopilamos sus referencias",
    milestoneReferencesDetail: "Las invitamos y damos seguimiento hasta recibir sus cartas notarizadas.",
    milestonePacket: "Organizamos su expediente",
    milestonePacketDetail: "Reunimos el expediente completo y realizamos nuestra revisión de calidad previa a la presentación.",
    milestoneReview: "Listo para que usted revise y presente",
    milestoneReviewDetail: "Usted aprueba el expediente y luego presenta su propia solicitud; le guiamos en cada paso.",
    vaultEyebrow: "Su bóveda de documentos",
    vaultTitle: "Documentos",
    filterDocuments: "Filtrar documentos",
    needYou: "Requiere de usted",
    withUs: "Con nosotros",
    done: "Listos",
    all: "Todos",
    caughtUp: "No necesitamos nada de usted ahora — mostramos todos los elementos.",
    vaultHelpTitle: "¿No sabe cómo obtener o cargar algo?",
    vaultHelpDetail: "Toque Cómo en cualquier elemento para ver las instrucciones aprobadas para ese requisito, o escriba a su equipo cuando quiera.",
    encrypted: "Cifrado · solo lo ve su equipo",
    documentCategories: "Categorías de documentos",
    whatWeNeed: "Lo que necesitamos de usted",
    items: "elementos",
    stepByStepHint: "Toque Cómo en cualquier elemento para ver una guía paso a paso.",
    uploadThese: "Cargue estos",
    yourDocuments: "Sus documentos",
    uploadSub: "Tome una foto o cargue un archivo",
    tellUsWho: "Díganos quiénes",
    peopleBundle: "Personas con quienes nos comunicamos por usted",
    peopleSub: "Solo nombres y correos — nosotros hacemos el resto",
    readSign: "Leer y firmar",
    prepareSign: "Nosotros preparamos; usted firma",
    prepareSignSub: "Completamos cada formulario — usted revisa y firma",
    confirmBundle: "Confirmar",
    feesSignoffs: "Tarifas y confirmaciones",
    feesSub: "Confirmaciones rápidas — nosotros gestionamos la mayoría",
    sponsorBundle: "De su patrocinador",
    sponsorDocuments: "Documentos del patrocinador",
    sponsorSub: "Elementos de solo lectura proporcionados para su caso",
    collapse: "Contraer",
    open: "Abrir",
    in: "listos",
    lettersBack: "cartas recibidas",
    affidavitsBack: "recibidas",
    addUpdateNames: "Agregar o actualizar nombres",
    feeDirect: "Tarifas del NYPD que pagará directamente: {amount} · nunca a nosotros",
    nothingNeeded: "Ya tenemos todo lo necesario.",
    nothingNeededDetail: "No necesita hacer nada por ahora.",
  },
  ui: {
    profileTitle: "Su perfil",
    profileDescription: "Sus datos de acceso, contraseña y privacidad.",
    profileEyebrow: "Cuenta",
    profileIdentityLabel: "Identidad de la cuenta",
    fullConcierge: "Conserjería completa",
    selfGuided: "Autoguiado",
    memberSince: "Miembro desde {date}",
    yourAccount: "Su cuenta",
    yourAccountDescription: "Su nombre y teléfono. Los cambios se guardan al tocar Guardar.",
    accountTitle: "Su cuenta",
    accountDescription: "Esta página guarda su nombre y teléfono. Su dirección, descripción física, historial de cinco años, persona de resguardo y los demás datos de la solicitud están en",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    signInEmail: "Correo de acceso",
    signInEmailHelp: "Este es el correo que usa para ingresar — contáctenos si necesita cambiarlo.",
    phone: "Teléfono",
    saved: "Guardado",
    saving: "Guardando…",
    saveChanges: "Guardar cambios",
    changePassword: "Cambiar contraseña",
    password: "Contraseña",
    passwordDescription: "Elija una nueva cuando quiera. Seguirá conectado en este dispositivo.",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar nueva contraseña",
    atLeastEight: "Al menos 8 caracteres",
    typeItAgain: "Escríbala de nuevo",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    passwordAtLeastEight: "Al menos 8 caracteres",
    passwordsMatch: "Las contraseñas coinciden",
    passwordUpdated: "Contraseña actualizada",
    updating: "Actualizando…",
    updatePassword: "Actualizar contraseña",
    applicationDetailsTitle: "¿Busca los datos de su solicitud?",
    applicationDetailsDescription: "Su dirección, descripción, historial de 5 años y persona de resguardo están en Sus datos y completan sus formularios automáticamente.",
    shortcuts: "Accesos directos",
    yourDetailsShortcut: "Sus datos",
    yourDetailsShortcutDescription: "Respuestas de la solicitud",
    yourDataShortcut: "Sus datos y privacidad",
    yourDataShortcutDescription: "Privacidad y solicitudes",
    languageShortcut: "Idioma",
    signOutShortcutDescription: "En este dispositivo",
    messagesTitle: "Mensajes",
    messagesDescription: "¿Tiene preguntas? Escriba cuando quiera a su especialista de Gun License NYC.",
    messagePlaceholder: "Escriba a su especialista…",
    checklistTitle: "Su lista",
    checklistComplete: "Cuestionario completo — esta es su lista personalizada. Cada elemento se completa cuando proporciona el documento.",
    checklistJourney: "Esta vista muestra el recorrido: lo que falta y qué hacer después. Documentos contiene todos los archivos, tanto pendientes como entregados.",
    checklistActions: "Las acciones que necesitamos de usted ahora. Documentos contiene todos los archivos, tanto pendientes como entregados.",
    peopleTitle: "Referencias y hogar",
    peopleDescription: "Agregue sus referencias personales y a todas las personas mayores de 18 años que viven con usted.",
    references: "Referencias",
    household: "Hogar",
    outreach: "Comunicaciones",
    outreachDescription: "Envíe a cada referencia un enlace para confirmar y declarar con un solo toque — no necesita una cuenta. Coordínelas para notarizar juntas las referencias y las declaraciones del hogar.",
    affidavits: "Declaraciones juradas",
    affidavitsDescription: "Cada adulto recibe un enlace para confirmar y notarizar su declaración — nosotros preparamos el documento. También puede cargar una copia notarizada.",
    addEmailInvite: "agregue un correo para invitar",
    differentEmail: "Confirmó un correo distinto: {email}",
    notarized: "notarizado",
    responded: "respondida",
    openedLink: "abrió el enlace",
    invited: "invitada",
    notInvited: "sin invitar",
    confirmed: "confirmada",
    resend: "Reenviar",
    sendLink: "Enviar enlace",
    revoke: "Revocar",
    formsSignatureSaved: "Firma guardada — sus formularios ahora se descargan firmados.",
    formsFiledToast: "Firmado y registrado — este requisito está completo.",
    yourSignature: "Su firma",
    signatureOnFileDetail: "Guardada — sus documentos se descargan firmados y los formularios elegibles pueden registrarse con un toque.",
    signatureEmptyDetail: "Firme una vez y cada formulario de abajo quedará firmado.",
    signaturePreview: "Vista previa de la firma",
    noSignatureOnFile: "No hay una firma guardada",
    noSignatureYet: "Aún no hay firma",
    onFile: "Guardada",
    cancel: "Cancelar",
    resign: "Firmar de nuevo",
    addSignature: "Agregar su firma",
    yourForms: "Sus formularios",
    preparedFiled: "{prepared} preparados · {filed} registrados",
    form: "Formulario",
    signingMethod: "Cómo se firma",
    status: "Estado",
    actions: "Acciones",
    filed: "Registrado ✓",
    notFiled: "Sin registrar",
    filing: "Registrando…",
    signFile: "Firmar y registrar",
    download: "Descargar",
    addSignatureHint: "Agregue su firma arriba para registrar este formulario con un toque.",
    oneTap: "Firmar y registrar con un toque",
    needsNotary: "Requiere notario",
    needsWitness: "Requiere testigo",
    downloadSignUpload: "Descargar, firmar y cargar",
    privacyTitle: "Sus datos",
    privacyDescription: "La información que conservamos para su solicitud y lo que puede pedirnos que hagamos con ella.",
    recordsHeld: "Cómo protegemos sus registros",
    recordsRuleOne: "Solo usted y nuestro personal pueden ver su caso. Los instructores nunca ven sus declaraciones.",
    recordsRuleTwo: "Los documentos se guardan con control de acceso y están cifrados tanto al almacenarse como al transmitirse.",
    recordsRuleThree: "Nunca vendemos su información ni la compartimos con instructores más allá de lo necesario para capacitarle.",
    askSomething: "Solicítenos algo",
    deletionTitle: "Lo que realmente hace la eliminación",
    deletionBody: "Eliminamos sus declaraciones, respuestas del cuestionario, documentos cargados y generados, registros del hogar y referencias, y notas de su caso — incluidos los archivos, no solo las filas de la base de datos.",
    deletionKeepTitle: "Una cosa que conservamos y por qué:",
    deletionKeepBody: "cuando firmó un documento electrónicamente, registramos una constancia protegida contra alteraciones. Conservamos la constancia de firma — fecha y hora, huella del documento y texto de consentimiento — porque demuestra que la firma se obtuvo válidamente y no contiene su historia personal. Eliminamos la imagen de su firma y retiramos la dirección IP y los datos del dispositivo.",
    deletionHonesty: "Preferimos explicarlo claramente antes que prometer una eliminación total que no realizamos. Si tiene preguntas, escriba a {email}.",
    yourRequests: "Sus solicitudes",
    dataCopy: "Una copia de sus datos",
    dataCorrection: "Una corrección",
    dataDeletion: "Eliminación",
    filedDate: "Presentada el {date}",
    sendCopy: "Enviarme una copia",
    sendCopyHint: "Reuniremos toda la información que conservamos sobre su caso.",
    fixSomething: "Corregir algo",
    fixSomethingHint: "Díganos qué está mal y lo corregiremos.",
    deleteData: "Eliminar mis datos",
    deleteDataHint: "Lea abajo lo que hace la eliminación antes de solicitarla — no se puede deshacer.",
    requestFiled: "Solicitud presentada — le daremos seguimiento por correo.",
    requestDetailPlaceholder: "Información adicional que desee compartir (opcional).",
    filingRequest: "Presentando…",
    submitRequest: "Presentar solicitud",
    remove: "Eliminar",
    referenceAdded: "Referencia agregada",
    family: "Familiar",
    unrelated: "Sin parentesco",
    noReferences: "Aún no hay referencias.",
    referencesAdded: "Se agregaron las {count} referencias. Recuerde notarizar cada una.",
    addReferenceCount: "Agregar una referencia ({current}/{required})",
    name: "Nombre",
    relationship: "Relación",
    relationshipExample: "p. ej., amistad, hermano/a",
    optional: "opcional",
    familyMember: "Esta persona es familiar",
    addReference: "Agregar referencia",
    cohabitantAdded: "Conviviente agregado",
    noCohabitants: "No hay convivientes registrados.",
    addCohabitant: "Agregar conviviente",
    cohabitantExample: "p. ej., cónyuge, compañero/a de vivienda",
    cohabitantEmail: "Correo electrónico (enviaremos el enlace de la declaración)",
    cohabitantEmailPlaceholder: "opcional — permite completarla por su cuenta",
    uploadNotarized: "Cargar documento notarizado",
    linkCopied: "Enlace copiado",
    copyLink: "Copiar enlace",
    noMessages: "Aún no hay mensajes. ¡Envíe un saludo!",
    sendError: "No se pudo enviar. Inténtelo de nuevo.",
    system: "Sistema",
    insertTemplate: "Insertar una plantilla de mensaje",
    insertTemplateOption: "Insertar una plantilla…",
    send: "Enviar",
    all: "Todos",
    toDo: "Pendientes",
    completed: "Completados",
    needsNotarization: "Requieren notarización",
    requirementsNotGenerated: "Aún no se han generado sus requisitos personalizados.",
    doneCount: "{done} / {total} completos",
    requirementsSatisfied: "{done} de {total} requisitos completos",
    checklistProgress: "Progreso de la lista",
    filterChecklist: "Filtrar su lista",
    nothingLeft: "No queda nada por hacer aquí — todos los elementos están completos.",
    nothingInView: "Aún no hay nada en esta vista.",
    notApplicable: "No corresponde a su caso ({count})",
    categoryIdentity: "Identidad",
    categoryResidence: "Residencia",
    categoryRecords: "Antecedentes y declaraciones",
    categoryCredentials: "Credenciales",
    categoryTraining: "Capacitación",
    categoryPeople: "Personas",
    categoryPrepared: "Formularios preparados",
    categoryConditional: "Requisitos adicionales",
    categorySponsor: "Patrocinador",
    categoryAdmin: "Tarifas y confirmaciones",
    welcome: "Bienvenido/a.",
    conciergeWillReach: "Su conserje de Gun License NYC se comunicará pronto para ayudarle a comenzar.",
    yourApplication: "Su solicitud",
    paymentUnlockTitle: "Eligió Conserjería completa — complete el pago para habilitarla",
    paymentUnlockDescription: "Cuando recibamos el pago, se abrirá su panel de servicio completo y nosotros continuaremos. Aún puede cambiar al plan Autoguiado antes de pagar.",
    finishEnrolling: "Completar inscripción",
    whereYouAre: "Su situación actual",
    yourNextStep: "Su siguiente paso",
    doneOf: "{done} de {total} completos",
    appealOpen: "Su plazo de apelación está abierto — 90 días, con reglas estrictas. Comience aquí.",
    licenseHubLink: "Su licencia — autorizaciones de compra, inspecciones, reportes y renovación",
    chooseWorkMode: "Elija cómo trabajaremos juntos — Autoguiado o Conserjería completa",
    choosePackage: "Elija su paquete — comience el servicio",
    intakeCompleteLink: "Cuestionario completo — vea su lista personalizada",
    intakeBuildLink: "Cuestionario de solicitud — cree su lista personalizada de documentos",
    trainingBooked: "Capacitación reservada — {date}",
    instructorNamed: "Su instructor: {name} — programe su sesión",
    instructorsInterested: "{count} instructores interesados — elija el suyo",
    instructorInterested: "1 instructor interesado — elija el suyo",
    trainingAwaiting: "Solicitud de capacitación enviada — esperando instructores interesados",
    findInstructor: "Encontrar un instructor local verificado",
    preparedDocuments: "Documentos que preparamos para usted — descargar y firmar",
    currentStage: "Etapa actual",
    nextLabel: "Siguiente //",
    fullTimeline: "Cronología completa de su solicitud",
    todos: "Pendientes",
    trainingLabel: "Capacitación",
    paidLabel: "Pagado",
    finishIntakeDetail: "Esto crea su lista personalizada de documentos; hasta que lo complete, no podemos determinar con precisión lo que necesita.",
    nothingNeededNow: "No necesitamos nada de usted por ahora",
    seeProvided: "Ver todo lo que ha proporcionado",
    seeHow: "Ver cómo obtenerlo",
    startNow: "Comenzar ahora",
    inviteNow: "Invitarlos ahora",
    takeLook: "Revisar",
    switchAccount: "Cambiar de cuenta",
    notifications: "Notificaciones",
    recentNotifications: "Notificaciones recientes de la cuenta",
    notificationMessage: "Mensaje",
    notificationDocument: "Documento",
    notificationAttention: "Requiere atención",
    notificationPeople: "Personas",
    notificationSchedule: "Agenda",
    notificationMilestone: "Etapa",
    notificationDefault: "Notificación",
    today: "Hoy",
    earlier: "Anteriores",
    caughtUp: "Está al día.",
    updatesAppear: "Las nuevas actualizaciones del caso aparecerán aquí.",
    unreadLabel: "Sin leer",
    newCount: "{count} nuevas",
    closeNotifications: "Cerrar notificaciones",
    filterNotifications: "Filtrar notificaciones",
    unreadOnly: "Sin leer",
    latestUpdates: "Está viendo las 15 actualizaciones más recientes.",
    openMessages: "Abrir mensajes",
    justNow: "Ahora mismo",
    minutesAgo: "hace {count} min",
    hoursAgo: "hace {count} h",
    daysAgo: "hace {count} d",
  },
}

export const CATALOGS: Record<Locale, DeepPartial<Messages>> = { en, es }

/** The English catalog is always complete — the fallback source. */
export const SOURCE: Messages = en
