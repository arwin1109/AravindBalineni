import { GoogleTagManager } from "@next/third-parties/google";
import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ChatWidget from "./components/chat-widget/chat-widget";
import Footer from "./components/layout/footer";
import Navbar from "./components/layout/navbar";
import ScrollToTop from "./components/ui/scroll-to-top";
import "./css/card.scss";
import "./css/globals.scss";
const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aravindbalineni.code2vibe.dev";
const title = "Portfolio of Aravind Balineni - Automation Technical Lead";
const description =
  "Automation Technical Lead with 11+ years in IT and 8+ years in intelligent automation. Delivered 70+ enterprise automations across healthcare, telecom, and finance using UiPath, agentic AI, document intelligence, and system integrations.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "Aravind Balineni",
    "Automation Technical Lead",
    "RPA",
    "UiPath",
    "Agentic AI",
    "n8n",
    "LangChain",
    "LangGraph",
    "Intelligent Automation",
    "Healthcare Automation",
  ],
  authors: [{ name: "Aravind Balineni", url: siteUrl }],
  icons: {
    icon: "/logo-ab.png",
    apple: "/logo-ab.png",
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Aravind Balineni Portfolio",
    images: [
      {
        url: "/card.png",
        width: 1682,
        height: 722,
        alt: "Aravind Balineni - Automation Technical Lead",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/card.png"],
    creator: "@ArwinInReal",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ToastContainer />
        <main className="min-h-screen relative mx-auto px-6 sm:px-12 lg:max-w-[70rem] xl:max-w-[76rem] 2xl:max-w-[92rem] text-white">
          <Navbar />
          {children}
          <ScrollToTop />
          <ChatWidget />
        </main>
        <Footer />
        {process.env.NEXT_PUBLIC_GTM && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM} />
        )}
      </body>
    </html>
  );
}
