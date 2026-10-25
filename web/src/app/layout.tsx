import type { ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { Providers } from "../components/Providers";
import "./globals.css";

export const metadata = {
  title: "ReleaseCheck",
  description: "Your all-in-one release checklist tool",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="page">
            <PageHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
