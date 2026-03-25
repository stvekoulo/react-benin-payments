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

function generateEnvExample(
  useFeda: boolean,
  useKkia: boolean,
  sandbox: boolean
): string {
  const lines: string[] = [
    "# react-benin-payments — généré par npx react-benin-payments init",
    "",
  ];
  if (useFeda) {
    lines.push("# FedaPay");
    lines.push(
      sandbox
        ? "NEXT_PUBLIC_FEDAPAY_KEY=pk_sandbox_XXXXXXXXXXXXXXXX"
        : "NEXT_PUBLIC_FEDAPAY_KEY=pk_live_XXXXXXXXXXXXXXXX"
    );
    lines.push("");
  }
  if (useKkia) {
    lines.push("# KKiaPay");
    lines.push(
      sandbox
        ? "NEXT_PUBLIC_KKIAPAY_KEY=pk_test_XXXXXXXXXXXXXXXX"
        : "NEXT_PUBLIC_KKIAPAY_KEY=pk_live_XXXXXXXXXXXXXXXX"
    );
    lines.push("");
  }
  lines.push(`NEXT_PUBLIC_PAYMENT_SANDBOX=${sandbox}`);
  return lines.join("\n");
}

function generateProviderTemplate(useFeda: boolean, useKkia: boolean): string {
  return `"use client";

import { BeninPaymentProvider } from "react-benin-payments";

export function PaymentProviders({ children }: { children: React.ReactNode }) {
  return (
    <BeninPaymentProvider
${useFeda ? `      fedaPayPublicKey={process.env.NEXT_PUBLIC_FEDAPAY_KEY}\n` : ""}${useKkia ? `      kkiaPayPublicKey={process.env.NEXT_PUBLIC_KKIAPAY_KEY}\n` : ""}      isTestMode={process.env.NEXT_PUBLIC_PAYMENT_SANDBOX === "true"}
      defaultCurrency="XOF"
    >
      {children}
    </BeninPaymentProvider>
  );
}
`;
}

function generateVerifyRoute(provider: "fedapay" | "kkiapay" | "both"): string {
  const providerComment =
    provider === "both"
      ? "// Adaptez selon le provider (fedapay | kkiapay) reçu dans le body"
      : `// Provider : ${provider}`;

  return `import { NextRequest, NextResponse } from "next/server";

${providerComment}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { transactionId, provider } = body;

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId manquant" }, { status: 400 });
  }

  // TODO : vérifiez la transaction côté serveur avec l'API ${provider === "kkiapay" ? "KKiaPay" : "FedaPay"}
  // Exemple FedaPay :
  //   const res = await fetch(\`https://api.fedapay.com/v1/transactions/\${transactionId}\`, {
  //     headers: { Authorization: \`Bearer \${process.env.FEDAPAY_SECRET_KEY}\` },
  //   });
  //   const data = await res.json();
  //   if (data.v1_transaction?.status !== "approved") {
  //     return NextResponse.json({ error: "Paiement non approuvé" }, { status: 400 });
  //   }

  return NextResponse.json({ success: true, transactionId });
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

    // 3. Générer la route de vérification
    const withVerify =
      (await askChoice(
        rl,
        "Générer une route API de vérification Next.js ?",
        ["oui", "non"],
        "oui"
      )) === "oui";

    print("");
    info("Génération des fichiers...");
    print("");

    // .env.local.example
    writeFile(
      ".env.local.example",
      generateEnvExample(useFeda, useKkia, sandbox)
    );

    // providers.tsx
    writeFile(
      "src/providers/payment.tsx",
      generateProviderTemplate(useFeda, useKkia)
    );

    // Route de vérification
    if (withVerify) {
      const provider =
        useFeda && useKkia ? "both" : useFeda ? "fedapay" : "kkiapay";
      writeFile(
        "src/app/api/verify-payment/route.ts",
        generateVerifyRoute(provider as "fedapay" | "kkiapay" | "both")
      );
    }

    print("");
    print(`${BOLD}Prochaines étapes :${RESET}`);
    print(`  1. Copiez ${CYAN}.env.local.example${RESET} → ${CYAN}.env.local${RESET} et renseignez vos clés`);
    print(`  2. Importez ${CYAN}PaymentProviders${RESET} dans votre layout :`);
    print(`     ${DIM}// app/layout.tsx${RESET}`);
    print(`     ${DIM}import { PaymentProviders } from "@/providers/payment";${RESET}`);
    print(`     ${DIM}<PaymentProviders>{children}</PaymentProviders>${RESET}`);
    if (withVerify) {
      print(`  3. Complétez la logique dans ${CYAN}src/app/api/verify-payment/route.ts${RESET}`);
    }
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
