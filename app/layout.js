import { GoogleTagManager } from "@next/third-parties/google";
import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Footer from "./components/footer";
import ScrollToTop from "./components/helper/scroll-to-top";
import Navbar from "./components/navbar";
import "./css/card.scss";
import "./css/globals.scss";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Portfolio of Aravind Balineni - Automation Technical Lead",
  description:
    "This is the portfolio of Aravind Balineni. I am an Automation Technical Lead with extensive experience in RPA implementation and Python integration. I have a proven track record of innovation, solution consulting, and transforming traditional SDLC processes to Agile. I excel in customer engagement and people management, building and guiding high-performing teams.",
  icons: {
    icon: 'https://media.licdn.com/dms/image/v2/C5103AQG8N8uUA5X0lg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1579090848363?e=2147483647&v=beta&t=q6MmMak5V9jW-ObAO24Q6biONtuzMzfRPoEaFP6KU-U',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastContainer />
        <main className="min-h-screen relative mx-auto px-6 sm:px-12 lg:max-w-[70rem] xl:max-w-[76rem] 2xl:max-w-[92rem] text-white">
          <Navbar />
          {children}
          <ScrollToTop />
        </main>
        <Footer />
        {process.env.NEXT_PUBLIC_GTM && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM} />
        )}
      </body>
    </html>
  );
}
