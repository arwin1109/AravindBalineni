# Aravind Balineni - Developer Portfolio

A responsive and highly interactive developer portfolio built to showcase experience, skills, and projects using modern web technologies. This project is configured to display blogs dynamically mapped from direct sources like LinkedIn.

## 🚀 Built With

- **Next.js 15** - React framework for production
- **React 19** - Library for building user interfaces
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Production-ready animations
- **Nodemailer** - Seamless email implementation
- **Lottie React** - Lightweight animations

## ⚙️ Features

- **Hero & About**: Compelling introduction and professional profile.
- **Experience & Education**: Timeline of professional background and academic credentials.
- **Skills**: Detailed representation of technical skills using modern tags and animated carousels.
- **Projects**: Showcase of significant hands-on coding work and deployed applications.
- **Blog Pipeline**: Curated lists of external publications mapped via LinkedIn links, rendering high-quality embedded cover images securely.
- **Contact Integration**: An integrated contact form powered by EmailJS & Nodemailer.

## 📦 Getting Started

### Prerequisites

Ensure you have Node.js installed on your operating system.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/arwin1109/developer-portfolio.git
cd developer-portfolio
```

2. Install dependent packages
```bash
npm install
```

3. Create your `.env` configuration file
```bash
cp .env.example .env
```
Ensure you update the email integrations details, URLs or GTM secrets inside `.env` correctly.

4. Start the Application
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the live site inside your browser.

## 📄 Docker / Deployment setup

You can also run this program utilizing Docker:
```bash
docker-compose up --build
```
Additionally, `Dockerfile.dev` and `Dockerfile.prod` are provided to make custom CI/CD pipelines deployment simple and straightforward.

## 📝 Modification

Inside `./content/portfolio`, modify data like:
- `blogs.js`
- `experience.js`
- `personal.js`
- `projects.js`
- `skills.js`

To customize the portfolio with your information seamlessly.

*Built to represent technical achievements and professional capabilities.*
