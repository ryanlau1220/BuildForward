import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildForward | Decision workspace",
  description: "Review project continuity, cohort competency gaps, and curriculum evidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
