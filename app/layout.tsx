import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto px-6 py-4 text-center text-xs text-neutral-500">
          <p>Unofficial practice. Not affiliated with Purdue University or Ed.</p>
          {/* Attribution required by CheerpJ's Community licence; see README. */}
          <p>
            Built with{" "}
            <a className="underline" href="https://cheerpj.com/" target="_blank" rel="noopener">
              CheerpJ
            </a>
            .
          </p>
        </footer>
      </body>
    </html>
  );
}
