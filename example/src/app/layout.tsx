import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "React Benin Payments - Demo",
  description: "Demonstration of FedaPay and KKiaPay integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
