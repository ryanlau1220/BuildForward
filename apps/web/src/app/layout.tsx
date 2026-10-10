import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildForward | Student learning decision support",
  description: "Check whether student projects can carry forward and review expected skill coverage at graduation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
