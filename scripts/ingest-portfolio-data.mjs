#!/usr/bin/env node
/**
 * Populates public.portfolio_vec with chunked portfolio content + embeddings,
 * for the floating RAG chatbot (see app/api/chat/route.js).
 *
 * Required env vars (put them in .env or export them before running):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COHERE_API_KEY
 *   (EMBEDDING_MODEL optional — defaults to embed-v4.0, see lib/rag/llmClient.js)
 *
 * Run with: npm run ingest:portfolio
 * Safe to re-run: it clears and re-inserts every row each time.
 *
 * Sources: content/portfolio/*.js (also rendered on the site UI), plus a
 * fixed RESUME_ONLY_FACTS block below sourced from
 * "public/Aravind Balineni Resume.pdf" for facts on the resume that aren't
 * broken out in content/portfolio/*.js (certifications, awards, detailed
 * skill categories, domains). Keep that block in sync with the resume by
 * hand — it deliberately doesn't parse the PDF at ingest time.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

import { personalData } from "../content/portfolio/personal.js";
import { experiences } from "../content/portfolio/experience.js";
import { educations } from "../content/portfolio/education.js";
import { skillsData } from "../content/portfolio/skills.js";
import { projectsData } from "../content/portfolio/projects.js";
import { linkedinBlogs } from "../content/portfolio/blogs.js";
import { createEmbedding } from "../lib/rag/llmClient.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

requireEnv("COHERE_API_KEY", process.env.COHERE_API_KEY);
requireEnv("SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

// Facts that are on the public resume (public/Aravind Balineni Resume.pdf)
// but aren't broken out as their own fields in content/portfolio/*.js.
// Intentionally excludes anything not already public on that resume —
// e.g. no named clients, no internal team/infra details.
const RESUME_ONLY_FACTS = {
  certifications: [
    "UiPath Certified Developer Professional",
    "UiPath Specialized AI Professional",
    "UiPath Certified Agentic Automation Associate",
  ],
  awards: [
    "Top Performer, Accelirate (Q2 2024 to 2025)",
    "Bronze, Accelirate Championship Program (2024 and 2025)",
    "Spot Award, Accelirate (Q3 2022 to 2023)",
    "Star Performer, Tech Mahindra (2018 and 2020)",
    "Digital Warrior Award, Tech Mahindra (2021)",
  ],
  skillCategories: [
    { label: "AI & Agents", items: "LangChain, LangGraph, UiPath BYOA, agentic workflows, human-in-the-loop automation, AI classification & extraction" },
    { label: "RPA Platforms", items: "UiPath Studio, Orchestrator, REFramework, Custom Activities, n8n, webhooks, event-driven pipelines, Document Understanding, ABBYY FineReader, ABBYY Cloud OCR, Microsoft OCR, Tesseract, ML extractors" },
    { label: "Programming", items: "Python, Java, VB.Net, SQL, Google Apps Script, Python-Flask" },
    { label: "Integrations", items: "REST APIs, Salesforce, ServiceNow, JIRA, Amazon S3, Kibana, relational databases" },
    { label: "DevOps", items: "Docker, Git, Jenkins, CI/CD, self-hosted automation agents" },
  ],
  domains: "Healthcare (Prior Authorization, Claims), Telecom, Finance",
};

function buildDocuments() {
  const docs = [];

  docs.push({
    content: `${personalData.name} — ${personalData.designation}. ${personalData.description} Based in ${personalData.address}. Contact: ${personalData.email}, LinkedIn: ${personalData.linkedIn}, GitHub: ${personalData.github}.`,
    metadata: { section: "personal", source: "content/portfolio/personal.js" },
  });

  docs.push({
    content: `${personalData.name} has ${personalData.yearsOfExperience} of experience, has delivered ${personalData.projectsDelivered}, and has mentored ${personalData.engineersMentored}.`,
    metadata: { section: "personal", source: "content/portfolio/personal.js", title: "highlights" },
  });

  for (const exp of experiences) {
    docs.push({
      content: `${exp.title} at ${exp.company} (${exp.duration}). ${exp.description}`,
      metadata: { section: "experience", source: "content/portfolio/experience.js", title: exp.title },
    });
  }

  for (const edu of educations) {
    docs.push({
      content: `Education: ${edu.title}, ${edu.institution} (${edu.duration}).`,
      metadata: { section: "education", source: "content/portfolio/education.js", title: edu.title },
    });
  }

  docs.push({
    content: `Technical skills: ${skillsData.join(", ")}.`,
    metadata: { section: "skills", source: "content/portfolio/skills.js" },
  });

  for (const project of projectsData) {
    docs.push({
      content: `Project: ${project.name} (role: ${project.role}). ${project.description} Tools/tech: ${project.tools.join(", ")}.`,
      metadata: { section: "projects", source: "content/portfolio/projects.js", title: project.name },
    });
  }

  for (const blog of linkedinBlogs) {
    docs.push({
      content: `Blog post: "${blog.title}". ${blog.description} Read it at ${blog.url}.`,
      metadata: { section: "blogs", source: "content/portfolio/blogs.js", title: blog.title },
    });
  }

  docs.push({
    content: `${personalData.name}'s certifications: ${RESUME_ONLY_FACTS.certifications.join(", ")}.`,
    metadata: { section: "certifications", source: "resume" },
  });

  docs.push({
    content: `${personalData.name}'s awards and recognition: ${RESUME_ONLY_FACTS.awards.join("; ")}.`,
    metadata: { section: "awards", source: "resume" },
  });

  for (const category of RESUME_ONLY_FACTS.skillCategories) {
    docs.push({
      content: `${personalData.name}'s ${category.label} skills: ${category.items}.`,
      metadata: { section: "skills", source: "resume", title: category.label },
    });
  }

  docs.push({
    content: `${personalData.name} has delivered automation work across these industry domains: ${RESUME_ONLY_FACTS.domains}.`,
    metadata: { section: "skills", source: "resume", title: "domains" },
  });

  return docs;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const documents = buildDocuments();
  console.log(`Prepared ${documents.length} chunks from content/portfolio/*.js`);

  const rows = [];
  for (const [index, doc] of documents.entries()) {
    const label = doc.metadata.title || doc.metadata.section;
    process.stdout.write(`Embedding ${index + 1}/${documents.length}: ${label}... `);
    const embedding = await createEmbedding(doc.content);
    rows.push({
      content: doc.content,
      chunk_index: index,
      metadata: doc.metadata,
      embedding,
    });
    console.log("done");
  }

  console.log("Clearing existing portfolio_vec rows...");
  const { error: deleteError } = await supabase.from("portfolio_vec").delete().neq("id", 0);
  if (deleteError) throw new Error(`Failed to clear portfolio_vec: ${deleteError.message}`);

  console.log(`Inserting ${rows.length} rows into portfolio_vec...`);
  const { error: insertError } = await supabase.from("portfolio_vec").insert(rows);
  if (insertError) throw new Error(`Failed to insert into portfolio_vec: ${insertError.message}`);

  console.log("Done — portfolio_vec is up to date.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
