"use client";

import { BeninPaymentProvider } from "react-benin-payments";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BeninPaymentProvider
      fedaPayPublicKey="pk_sandbox_I838HGU-2wAoi-Of6tI5hM6h"
      kkiaPayPublicKey="13484850a8d511f094bed3211391e77d"
      defaultCurrency="XOF"
      isTestMode={true}
      debug={true}
    >
      {children}
    </BeninPaymentProvider>
  );
}
