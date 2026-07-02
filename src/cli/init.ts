import readline from "readline";
import fs from "fs";
import path from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

function print(msg: string) {
  process.stdout.write(msg + "\n");
}

function success(msg: string) {
  print(`${GREEN}✔${RESET} ${msg}`);
}

function info(msg: string) {
  print(`${CYAN}ℹ${RESET} ${msg}`);
}

function warn(msg: string) {
  print(`${YELLOW}⚠${RESET}  ${msg}`);
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function askChoice(
  rl: readline.Interface,
  question: string,
  choices: string[],
  defaultChoice: string
): Promise<string> {
  const choiceStr = choices
    .map((c) => (c === defaultChoice ? `${BOLD}${c}${RESET}` : c))
    .join(" / ");
  const answer = await ask(rl, `${question} [${choiceStr}]: `);
  if (!answer) return defaultChoice;
  const match = choices.find((c) => c.toLowerCase() === answer.toLowerCase());
  return match ?? defaultChoice;
}

function writeFile(filePath: string, content: string, overwrite = false) {
  const abs = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(abs) && !overwrite) {
    warn(`${filePath} existe déjà — ignoré. Supprimez-le pour regénérer.`);
    return false;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf-8");
  success(`Créé : ${filePath}`);
  return true;
}

/**
 * Ce CLI ne suppose aucun framework particulier : il génère seulement un
 * fichier d'environnement + un composant provider React, sans route API
 * (chaque backend — Next.js, Express, un autre langage... — a sa propre
 * façon d'exposer un endpoint). Le seul détail qui varie réellement d'un
 * outil à l'autre est la convention de préfixe/accès aux variables
 * d'environnement côté client.
 */
type EnvFlavorId = "next" | "vite" | "cra" | "none";

interface EnvFlavor {
  /** Short, easy-to-type key the user answers with (e.g. "next"). */
  key: EnvFlavorId;
  /** Human-readable name, shown next to the key in the prompt. */
  description: string;
  prefix: string;
  /** Comment lire la variable dans le code (diffère selon le bundler). */
  accessor: (varName: string) => string;
  /** Next.js App Router exige "use client" sur les composants qui utilisent des hooks. */
  useClientDirective: boolean;
  mountingHint: string;
}

const ENV_FLAVORS: Record<EnvFlavorId, EnvFlavor> = {
  next: {
    key: "next",
    description: "Next.js",
    prefix: "NEXT_PUBLIC_",
    accessor: (v) => `process.env.${v}`,
    useClientDirective: true,
    mountingHint: 'Importez-le dans `app/layout.tsx` et enveloppez `{children}` avec.',
  },
  vite: {
    key: "vite",
    description: "Vite",
    prefix: "VITE_",
    accessor: (v) => `import.meta.env.${v}`,
    useClientDirective: false,
    mountingHint: "Importez-le dans votre composant racine (`src/main.tsx` ou `src/App.tsx`).",
  },
  cra: {
    key: "cra",
    description: "Create React App",
    prefix: "REACT_APP_",
    accessor: (v) => `process.env.${v}`,
    useClientDirective: false,
    mountingHint: "Importez-le dans votre composant racine (`src/index.tsx` ou `src/App.tsx`).",
  },
  none: {
    key: "none",
    description: "autre / aucun préfixe particulier",
    prefix: "",
    accessor: (v) => `process.env.${v}`,
    useClientDirective: false,
    mountingHint: "Importez-le à l'endroit où vous montez votre arbre de composants racine.",
  },
};

function generateEnvExample(
  useFeda: boolean,
  useKkia: boolean,
  sandbox: boolean,
  flavor: EnvFlavor
): string {
  const lines: string[] = [
    "# react-benin-payments — généré par npx react-benin-payments init",
    "",
  ];
  if (useFeda) {
    lines.push("# FedaPay");
    lines.push(
      sandbox
        ? `${flavor.prefix}FEDAPAY_KEY=pk_sandbox_XXXXXXXXXXXXXXXX`
        : `${flavor.prefix}FEDAPAY_KEY=pk_live_XXXXXXXXXXXXXXXX`
    );
    lines.push("");
  }
  if (useKkia) {
    lines.push("# KKiaPay");
    lines.push(
      sandbox
        ? `${flavor.prefix}KKIAPAY_KEY=pk_test_XXXXXXXXXXXXXXXX`
        : `${flavor.prefix}KKIAPAY_KEY=pk_live_XXXXXXXXXXXXXXXX`
    );
    lines.push("");
  }
  lines.push(`${flavor.prefix}PAYMENT_SANDBOX=${sandbox}`);
  return lines.join("\n");
}

function generateProviderTemplate(
  useFeda: boolean,
  useKkia: boolean,
  flavor: EnvFlavor
): string {
  const directive = flavor.useClientDirective ? `"use client";\n\n` : "";
  const fedaLine = useFeda
    ? `      fedaPayPublicKey={${flavor.accessor(`${flavor.prefix}FEDAPAY_KEY`)}}\n`
    : "";
  const kkiaLine = useKkia
    ? `      kkiaPayPublicKey={${flavor.accessor(`${flavor.prefix}KKIAPAY_KEY`)}}\n`
    : "";
  const sandboxExpr = `${flavor.accessor(`${flavor.prefix}PAYMENT_SANDBOX`)} === "true"`;

  return `${directive}import { BeninPaymentProvider } from "react-benin-payments";
import type { ReactNode } from "react";

export function PaymentProviders({ children }: { children: ReactNode }) {
  return (
    <BeninPaymentProvider
${fedaLine}${kkiaLine}      isTestMode={${sandboxExpr}}
      defaultCurrency="XOF"
    >
      {children}
    </BeninPaymentProvider>
  );
}
`;
}

async function main() {
  print("");
  print(`${BOLD}${CYAN}react-benin-payments — assistant de configuration${RESET}`);
  print(`${DIM}────────────────────────────────────────────────${RESET}`);
  print("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 1. Choix du provider
    const providerChoice = await askChoice(
      rl,
      "Quel(s) provider(s) voulez-vous utiliser ?",
      ["fedapay", "kkiapay", "les deux"],
      "les deux"
    );

    const useFeda =
      providerChoice === "fedapay" || providerChoice === "les deux";
    const useKkia =
      providerChoice === "kkiapay" || providerChoice === "les deux";

    // 2. Mode sandbox
    const sandboxChoice = await askChoice(
      rl,
      "Mode sandbox / test ?",
      ["oui", "non"],
      "oui"
    );
    const sandbox = sandboxChoice === "oui";

    // 3. Convention de variables d'environnement — le seul point qui diffère
    // réellement d'un outil à l'autre (Next.js, Vite, CRA, ou rien de tout ça).
    // Des clés courtes (next/vite/cra/none) plutôt que les noms complets,
    // pour rester faciles à taper.
    const flavorKeys = Object.keys(ENV_FLAVORS) as EnvFlavorId[];
    const flavorChoiceStr = flavorKeys
      .map((key) => {
        const f = ENV_FLAVORS[key];
        const entry = `${key}=${f.description}`;
        return key === "next" ? `${BOLD}${entry}${RESET}` : entry;
      })
      .join(" / ");
    const flavorAnswer = (
      await ask(
        rl,
        `Quel outil de build utilisez-vous (pour le préfixe des variables d'environnement) ? [${flavorChoiceStr}]: `
      )
    ).toLowerCase();
    // Accepte aussi bien la clé courte ("cra") que le libellé affiché entre
    // crochets ("create react app") — un utilisateur tape naturellement l'un
    // ou l'autre, les deux doivent être reconnus plutôt que de retomber
    // silencieusement sur Next.js.
    const flavorId: EnvFlavorId =
      flavorKeys.find(
        (key) => key === flavorAnswer || ENV_FLAVORS[key].description.toLowerCase() === flavorAnswer
      ) ?? "next";
    const flavor = ENV_FLAVORS[flavorId];

    print("");
    info("Génération des fichiers...");
    print("");

    // .env.example
    writeFile(".env.example", generateEnvExample(useFeda, useKkia, sandbox, flavor));

    // Composant provider
    writeFile(
      "src/providers/payment.tsx",
      generateProviderTemplate(useFeda, useKkia, flavor)
    );

    print("");
    print(`${BOLD}Prochaines étapes :${RESET}`);
    print(`  1. Copiez ${CYAN}.env.example${RESET} → ${CYAN}.env${RESET} (ou ${CYAN}.env.local${RESET}) et renseignez vos clés`);
    print(`  2. Importez ${CYAN}PaymentProviders${RESET} et enveloppez votre app avec :`);
    print(`     ${DIM}${flavor.mountingHint}${RESET}`);
    print(`     ${DIM}import { PaymentProviders } from "./providers/payment";${RESET}`);
    print(`     ${DIM}<PaymentProviders>{children}</PaymentProviders>${RESET}`);
    print(`  3. Ajoutez une vérification backend (indépendante du framework) —`);
    print(`     voir la section "Vérification Backend" de la documentation :`);
    print(`     ${CYAN}https://github.com/stvekoulo/react-benin-payments/blob/main/README.md#vérification-backend${RESET}`);
    print("");
    success("Configuration terminée !");
    print("");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
