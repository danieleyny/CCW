# Gun License NYC editorial workflow

The blog may publish frequently, but it must never become an automated copy machine. The goal is original, useful NYC licensing context—not volume for its own sake.

## Safe daily workflow

1. Select one news report, official rule update, or recurring applicant question.
2. Create a private scaffold with `pnpm blog:draft -- --slug … --title … --source https://…`.
3. Write an original explanation. Link the original report; never copy its text, headline structure, photos, or distinctive framing.
4. Add primary authority for every licensing or legal rule. A news report is not the authority for what the law requires.
5. Add the useful layer only Gun License NYC can provide: how the development affects the published NYC process, what records an applicant should preserve, or which official page changed.
6. Run a human fact-check and legal-boundary review. Case-specific legal judgment is routed to a New York-licensed attorney.
7. Move the approved file from `content/blog-drafts/` to `content/blog/`, change `status` to `published`, and add an honest `updated` date only when the substance is re-reviewed.
8. Build and inspect the article before deployment. Publication automatically adds it to `/blog`, the sitemap, RSS, Article structured data and the guide collection schema.

## Never publish

- Copied or lightly rewritten news articles.
- Unreviewed AI output or invented citations.
- Graphic crime recaps written only to attract clicks.
- Tactical advice about using a firearm or legal advice about a person's specific incident.
- Claims that Gun License NYC represents, files for, expedites or guarantees an applicant.
- A story with no original NYC licensing value beyond what the source already says.

## Recommended cadence

Quality beats daily volume. Aim for two or three reviewed pieces per week: one official-process update, one answer to a real applicant question, and—only when it has genuine relevance—one original analysis of a reported event.
