import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildForward | Curriculum intelligence",
  description: "Evidence-backed project continuity and cohort competency forecasts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
