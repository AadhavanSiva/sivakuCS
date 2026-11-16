import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "sivakuCS",
  description: "Practice exams for Purdue CS 18000, with Java running in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* A full-height column: pages fill the space above a one-line footer
          (the exam workspace exactly; other pages scroll inside it). */}
      <body className="flex h-dvh flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <footer className="flex h-7 shrink-0 items-center justify-center gap-1 border-t border-neutral-500/20 px-4 text-center text-[11px] text-neutral-500">
          <span>Unofficial practice. Not affiliated with Purdue University or Ed.</span>
          {/* Attribution required by CheerpJ's Community licence; see README. */}
          <span>
            · Built with{" "}
            <a className="underline" href="https://cheerpj.com/" target="_blank" rel="noopener">
              CheerpJ
            </a>
            .
          </span>
          <span>
            ·{" "}
            <Link className="underline" href="/privacy">
              Privacy
            </Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
