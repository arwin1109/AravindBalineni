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
 * Safe to re-run: it clears and re-inserts every row each time, since the
 * corpus is small and fully derived from content/portfolio/*.js.
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
