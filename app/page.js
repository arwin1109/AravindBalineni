import { linkedinBlogs } from "@/content/portfolio/blogs";
import AboutSection from "./components/sections/home/about";
import Blog from "./components/sections/home/blog";
import ContactSection from "./components/sections/home/contact";
import Education from "./components/sections/home/education";
import Experience from "./components/sections/home/experience";
import HeroSection from "./components/sections/home/hero";
import Projects from "./components/sections/home/projects";
import Skills from "./components/sections/home/skills";

export default function Home() {

  return (
    <div>
      <HeroSection />
      <AboutSection />
      <Experience />
      <Skills />
      <Projects />
      <Education />
      <Blog blogs={linkedinBlogs} />
      <ContactSection />
    </div>
  )
};
