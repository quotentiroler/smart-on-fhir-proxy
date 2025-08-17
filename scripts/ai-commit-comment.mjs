#!/usr/bin/env node

import { OpenAI } from "openai";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

const sha = process.env.HEAD_SHA;
console.log("Reviewing commit:", sha);
console.log("Trigger event:", process.env.GITHUB_EVENT_NAME);

// Try different diff strategies for different commit types
let diff = "";

try {
  // First, try to get the diff for a single commit
  diff = execSync(`git diff ${sha}^!`, { encoding: "utf-8" });
  
  // If diff is empty, try merge commit diff (for PR merges)
  if (!diff.trim()) {
    console.log("Single commit diff empty, trying merge commit diff...");
    diff = execSync(`git diff ${sha}^1 ${sha}`, { encoding: "utf-8" });
  }
  
  // If still empty, try comparing with HEAD~1
  if (!diff.trim()) {
    console.log("Merge diff empty, trying HEAD~1 comparison...");
    diff = execSync(`git diff HEAD~1 HEAD`, { encoding: "utf-8" });
  }
  
  // If still empty, try getting the last few commits (for workflow commits)
  if (!diff.trim()) {
    console.log("HEAD~1 diff empty, trying last 3 commits...");
    diff = execSync(`git diff HEAD~3 HEAD`, { encoding: "utf-8" });
  }
  
  // If still empty, get the commit message and changed files
  if (!diff.trim()) {
    console.log("All diffs empty, getting commit info...");
    const commitMsg = execSync(`git log -1 --pretty=format:"%s"`, { encoding: "utf-8" });
    const changedFiles = execSync(`git diff-tree --no-commit-id --name-only -r ${sha}`, { encoding: "utf-8" });
    diff = `Commit: ${commitMsg}\n\nChanged files:\n${changedFiles}`;
  }
} catch (error) {
  console.error("Error getting diff:", error);
  diff = `Error getting diff for commit ${sha}`;
}

console.log("Diff length:", diff.length);

// Skip if diff is too large (>50KB) or too small
if (diff.length > 50000) {
  console.log("Diff too large, skipping AI review");
  process.exit(0);
}

if (diff.length < 50) {
  console.log("Diff too small or empty, skipping AI review");
  process.exit(0);
}

try {
  const res = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      { 
        role: "system", 
        content: "You are a concise code diff explainer. Focus on what changed and why it might be significant for developers and helpful when tracking changes." 
      },
      { 
        role: "user", 
        content: `Review this git diff: \n\n${diff}\n\nProvide a concise summary starting with "The following changes were made in commit ${sha}:"`
      }
    ],
    max_completion_tokens: 300
  });
  const comment = res.choices.map(c => c.message.content).join("\n\n---\n\n");

  console.log("AI summary:\n", comment);

  // Only post comment if we have actual content and it's not a generic "provide diff" response
  if (comment && !comment.toLowerCase().includes("please provide") && !comment.toLowerCase().includes("i need")) {
    // Check if comment already exists to avoid duplicates
    const existingComments = await octokit.repos.listCommentsForCommit({
      owner,
      repo,
      commit_sha: sha,
    });
    
    const aiCommentExists = existingComments.data.some(c => 
      c.body.includes("🤖") || c.user.login.includes("bot")
    );
    
    if (!aiCommentExists) {
      await octokit.repos.createCommitComment({
        owner,
        repo,
        commit_sha: sha,
        body: `🤖 **AI Code Review Summary**\n\n${comment}`,
      });
      console.log("Posted comment to", sha);
    } else {
      console.log("AI comment already exists for", sha);
    }
  } else {
    console.log("Skipping comment - no meaningful diff found");
  }
} catch (err) {
  console.error("Failed to review or comment:", err);
  process.exit(1);
}
