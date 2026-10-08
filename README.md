# DJ35 — AI-Assisted DJ Scheduling

**From group-chat availability to a monthly DJ schedule.**

DJ35 is a web application built for a real venue to simplify its monthly DJ planning. Instead of manually reading availability messages, checking dates, and resolving clashes, the manager can paste the group chat into the app, review the extracted availability, and build a schedule with AI assistance and explicit scheduling rules.

[Application](https://dj35.vercel.app/) (password-protected) · [Source code](https://github.com/FilTheo/dj35)

## The problem

DJ availability arrives as informal Greek-language messages: specific dates, exclusions, references to weekdays, and last-minute changes. The venue also needs to consider fairness, DJs who missed a previous month, and special requests. Turning all of this into a consistent monthly roster is repetitive and prone to conflicts.

DJ35 turns that workflow into a reviewable process. The manager stays in control of the final schedule.

## What it does

- **Extracts availability from Greek chat messages.** A Gemini-based extraction step converts free text into structured DJ names, dates, exclusions, and scheduling constraints, flagging ambiguous inputs for review.
- **Makes straightforward assignments automatically.** A deterministic engine assigns priority DJs with limited options and dates with only one available DJ, then identifies unresolved conflicts.
- **Proposes solutions to conflicts.** An AI step suggests assignments and, for more complex cases, alternative scenarios with explanations.
- **Checks scheduling rules.** A separate deterministic verifier detects duplicate bookings, unfilled dates, unassigned priority DJs, and violations of supported hard constraints. Unresolved issues remain visible rather than being silently treated as solved.
- **Supports manual planning.** The manager can change assignments directly in the calendar, adjust proposed schedules, and manage the DJ pool.
- **Keeps a month-by-month workflow.** Schedules can be saved, finalized, and copied as formatted text; unassigned DJs can receive priority in the following month.

## How it works

```text
Greek group-chat messages + manager constraints
                     |
                     v
          AI availability extraction
                     |
                     v
              Manager review
                     |
                     v
        Rule-based scheduling engine
                     |
            Remaining conflicts?
                     |
                     v
         AI-assisted suggestions
                     |
                     v
          Deterministic verification
                     |
                     v
      Review / edit / finalize / export
```

The design separates tasks where language models help (interpreting messages and proposing resolutions) from tasks where explicit logic is preferable (automatic assignments and checking constraints). **AI-generated schedules are proposals, not mathematical guarantees of optimality.**

## Technical overview

| Component | Technology |
| --- | --- |
| Web application | Next.js, React, TypeScript, Tailwind CSS |
| AI extraction and conflict resolution | Google Gemini via Vercel AI SDK |
| Structured AI output and input checks | Zod |
| Scheduling logic and verification | TypeScript, rule-based engine |
| Persistence | Vercel KV when configured; in-memory fallback for local use |
| Deployment | Vercel |

The code is organized under `src/app/` (UI and API routes), `src/components/` (calendar, roster, review panels), and `src/lib/` (AI steps, scheduling engine, verifier, schemas, and storage).

## Run locally

**Requirements:** Node.js and npm, a Google Gemini API key.

```bash
git clone https://github.com/FilTheo/dj35.git
cd dj35
npm install
```

Create `.env.local` in the project root:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
APP_PASSWORD=choose_a_local_password
APP_SECRET_TOKEN=use_a_long_random_secret
```

Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in using `APP_PASSWORD`. Without Vercel KV credentials, saved schedules use process-local memory and will not survive a restart.

## Scope and limitations

DJ35 is a focused application for one venue's planning workflow, not a general-purpose staff scheduling platform. The current rules assume at most **one DJ per date** and **one gig per DJ per month**. AI suggestions can be imperfect, so the interface includes human review and deterministic checks. The deployed application is password-protected rather than available as an open public demo.

**Privacy:** Chat messages sent for AI extraction are processed through the configured model provider. Use appropriate consent and data-handling practices; do not commit real chat transcripts, passwords, or API keys to the repository.

## Project context

Built as a practical application for a friend's venue, DJ35 is an example of taking an informal operational problem through data extraction, rule-based decision logic, AI-assisted interaction, and deployment into a working web application.
