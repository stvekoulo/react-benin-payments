"use client";

import {
  FedaPayButton,
  KkiaPayButton,
  useFedaPay,
  FedaPayLogo,
  KkiaPayLogo,
  formatXOF,
} from "react-benin-payments";

const COURSE_PRICE = 5000;

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            React Benin Payments
          </h1>
          <p className="text-slate-600">
            Demonstration des composants de paiement
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-white">
            <span className="text-sm font-medium uppercase tracking-wide opacity-80">
              Formation
            </span>
            <h2 className="text-2xl font-bold mt-1">Next.js Mastery</h2>
            <p className="text-emerald-100 mt-2 text-sm">
              Apprenez a creer des applications web modernes
            </p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{formatXOF(COURSE_PRICE)}</span>
              <span className="text-emerald-200 line-through text-lg">
                {formatXOF(10000)}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Boutons Pre-configures
              </h3>
              <div className="space-y-3">
                <FedaPayButton
                  config={{
                    transaction: {
                      amount: COURSE_PRICE,
                      description: "Formation Next.js Mastery",
                    },
                    customer: { email: "demo@example.com" },
                    onComplete: (response) => {
                      console.log("FedaPay - Paiement reussi !", response);
                      alert(`Paiement FedaPay reussi ! ID: ${response.transaction.reference}`);
                    },
                    onClose: () => {
                      console.log("FedaPay - Widget ferme");
                    },
                  }}
                  onPaymentError={(error) => {
                    console.error("FedaPay - Erreur:", error);
                    alert(`Erreur: ${error.message}`);
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-200 hover:shadow-emerald-300"
                  loadingText="Chargement de FedaPay..."
                  verifyingText="Verification en cours..."
                >
                  <FedaPayLogo width={24} height={24} className="text-white" />
                  Payer avec FedaPay
                </FedaPayButton>

                <KkiaPayButton
                  config={{
                    amount: COURSE_PRICE,
                    name: "Client Demo",
                    phone: "22967000000",
                    reason: "Formation Next.js Mastery",
                  }}
                  onSuccess={(data) => {
                    console.log("KKiaPay - Paiement reussi !", data);
                    alert(`Paiement KKiaPay reussi ! ID: ${data.transactionId}`);
                  }}
                  onFailed={(error) => {
                    console.error("KKiaPay - Echec:", error);
                    alert(`Echec: ${error.message}`);
                  }}
                  onPaymentClose={() => {
                    console.log("KKiaPay - Widget ferme");
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300"
                  loadingText="Chargement de KKiaPay..."
                  verifyingText="Verification en cours..."
                >
                  <KkiaPayLogo width={24} height={24} className="text-white" />
                  Payer avec KKiaPay
                </KkiaPayButton>
              </div>
            </section>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">
                  Ou payer avec une UI personnalisee
                </span>
              </div>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Mode Headless (Custom UI)
              </h3>
              <CustomPaymentButton amount={COURSE_PRICE} />
            </section>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              Paiement securise via FedaPay ou KKiaPay.
              Mode demonstration - Aucune transaction reelle.
            </p>
          </div>
        </div>

        <footer className="text-center mt-8 text-sm text-slate-500">
          <p>
            Made with care in Benin by{" "}
            <span className="font-semibold text-slate-700">Steven KOULO</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

function CustomPaymentButton({ amount }: { amount: number }) {
  const { openDialog, loading, scriptLoaded, isVerifying } = useFedaPay({
    transaction: {
      amount,
      description: "Paiement via bouton personnalise",
    },
    customer: { email: "custom@example.com" },
    onComplete: (response) => {
      console.log("Custom Button - Paiement reussi !", response);
      alert(`Paiement reussi via bouton custom ! ID: ${response.transaction.reference}`);
    },
    onClose: () => {
      console.log("Custom Button - Widget ferme");
    },
  });

  const isDisabled = loading || !scriptLoaded || isVerifying;

  const getButtonText = () => {
    if (loading) return "Initialisation...";
    if (isVerifying) return "Securisation...";
    return `Payer ${formatXOF(amount)}`;
  };

  return (
    <button
      onClick={openDialog}
      disabled={isDisabled}
      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      {getButtonText()}
    </button>
  );
}
