import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import RouteProgressBar from "@/components/ui/RouteProgressBar";

const fontHeading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "HostelMatch | Smart Hostel Allocation & Roommate Matching",
  description:
    "Automated, privacy-first roommate matching and first-come room selection for campus dorms and residential hostels.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontHeading.variable} ${fontBody.variable} h-full antialiased`}
    >
      <head>
        {/* Anti-flash inline script to prevent dark/light theme flickering */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var saved = localStorage.getItem("hostelmatch_theme");
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (saved === "dark" || (!saved && prefersDark)) {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (e) {}
            })()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-slate-50 dark:bg-[var(--bg-page)] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-150 page-bg-glow"
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <RouteProgressBar />
              </Suspense>
              <Navbar />
              <main className="flex-1 flex flex-col relative z-10">{children}</main>
              <Footer />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
