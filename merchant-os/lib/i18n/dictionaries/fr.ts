import type { Dictionary } from "./en";

const fr: Dictionary = {
  app: {
    name: "Merchant OS",
    tagline: "Opérations e-commerce en paiement à la livraison"
  },
  nav: {
    groups: { operations: "Opérations", catalog: "Catalogue", money: "Finances", growth: "Croissance", system: "Système" },
    commandCenter: "Tableau de bord",
    orders: "Commandes",
    shipping: "Expéditions",
    returns: "Retours",
    customers: "Clients",
    support: "Service client",
    products: "Produits",
    inventory: "Stock",
    production: "Production",
    finance: "Finance",
    cod: "Encaissements",
    marketing: "Marketing",
    assistant: "Assistant IA",
    settings: "Paramètres",
    designSystem: "Design system",
    comingInPhase: "Phase {phase}",
    collapse: "Réduire la barre latérale",
    expand: "Agrandir la barre latérale",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu"
  },
  topbar: {
    search: "Rechercher…",
    searchShortcut: "Ctrl K",
    searchPlaceholder: "Rechercher des pages et actions",
    searchEmpty: "Aucun résultat.",
    searchAvailable: "Pages",
    searchSoon: "Pas encore disponible",
    notifications: "Notifications",
    notificationsEmpty: "Rien de nouveau",
    notificationsEmptyHint: "Les alertes de stock, retards de commande et rappels COD apparaîtront ici.",
    preferences: "Préférences",
    theme: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",
    language: "Langue"
  },
  commandCenter: {
    title: "Tableau de bord",
    description: "Votre activité en un coup d'œil, calculée à partir des vraies commandes, du stock et des encaissements.",
    setupTitle: "Connectez votre base de données pour commencer",
    setupDescription:
      "Merchant OS n'affiche jamais de chiffres fictifs. Les indicateurs apparaîtront une fois votre projet Supabase connecté et vos commandes enregistrées.",
    stepProject: "Créer un projet Supabase",
    stepMigrations: "Appliquer les migrations de supabase/migrations",
    stepEnv: "Définir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY",
    configured: "Configuré",
    notConfigured: "Non configuré",
    manualStep: "Étape manuelle",
    nextTitle: "Prochaine étape",
    nextDescription:
      "La phase 2 ajoute la connexion, les produits, le stock, les commandes, les expéditions, les retours et le suivi COD sur cette base."
  },
  orderStatus: {
    new: "Nouvelle",
    confirmation_pending: "À confirmer",
    confirmed: "Confirmée",
    preparing: "En préparation",
    ready_to_ship: "Prête à expédier",
    shipped: "Expédiée",
    delivered: "Livrée",
    cancelled: "Annulée",
    refused: "Refusée",
    returned: "Retournée",
    exchange_requested: "Échange demandé"
  },
  common: {
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Enregistrer",
    delete: "Supprimer",
    close: "Fermer",
    loading: "Chargement…",
    required: "Obligatoire",
    optional: "Facultatif"
  },
  designSystem: {
    title: "Design system",
    description: "Référence des composants partagés. Visible en développement uniquement.",
    buttons: "Boutons",
    inputs: "Champs de formulaire",
    badges: "Statuts de commande",
    metrics: "Indicateurs",
    table: "Tableau",
    feedback: "Retours visuels",
    emptyState: "État vide",
    skeleton: "Squelette de chargement",
    sampleLabel: "Les valeurs ci-dessous sont des exemples et sont indiquées comme telles.",
    toastButton: "Afficher une notification",
    toastMessage: "Enregistré",
    dialogButton: "Supprimer l'élément",
    dialogTitle: "Supprimer cet élément ?",
    dialogDescription: "Cette action est irréversible.",
    deleted: "Élément supprimé",
    fieldName: "Nom du produit",
    fieldPrice: "Prix (MAD)",
    fieldNotes: "Notes internes",
    fieldCity: "Ville",
    hintPrice: "Utilisez un point ou une virgule pour les décimales, sans séparateur de milliers."
  }
};

export default fr;
