# Capacities for Vicinae

A [Vicinae](https://vicinae.com) extension for [Capacities](https://capacities.io). Two jobs, done fast:

- **Capture a thought** into today's daily note.
- **Capture a task** with priority, status, date, deadline and notes.

It talks to the Capacities API 2.0 (`api.capacities.io`) directly, so the Capacities desktop app does not need to be running.

## Commands

| Command | What it does |
| --- | --- |
| **Quick Thought** | Type the thought as the command argument and hit enter. Appends it to today's daily note. No form. |
| **Capture Note** | Opens a Markdown text area for longer notes. Appends to today's daily note. |
| **Create Task** | Form with title, date, deadline, priority, status and Markdown notes. Date and deadline offer Today, Tomorrow, Next week, Next month or a date picker, and you can type to filter them. Creates a Task object. |

Both daily-note commands add a timestamp heading, which is what Capacities does for anything appended via the API. Turn that off in the extension preferences if you prefer.

## Requirements

- Vicinae with extension support (built against `@vicinae/api` 0.28).
- A Capacities account on a plan that includes API access (Pro at the time of writing).
- An API token. In the Capacities desktop app go to **Settings → Capacities API**, pick the space you want to capture into, and grant the **api:write** scope.

A token is bound to one space. If you use several spaces and want to capture into more than one, you would need one token per space. This extension currently supports a single token, so it captures into a single space.

## Install

Until this is published to the Vicinae store, install it from source:

```bash
git clone https://github.com/ianbetteridge/vicinae-capacities.git
cd vicinae-capacities
npm install
npm run build
```

`npm run build` type-checks, bundles, and copies the extension into Vicinae's extension directory (`~/.local/share/vicinae/extensions/capacities` on Linux, honouring `XDG_DATA_HOME`). If this is the first extension you have installed from source, **restart Vicinae** afterwards. Vicinae only watches the extensions directory if it existed at startup, so a first install is not noticed until the next launch. Later rebuilds are picked up automatically. Then search for **Quick Thought**, **Capture Note** or **Create Task** and paste your API token when prompted. Searching for "Capacities" also finds them, but the Capacities app itself will rank above them because Vicinae matches the extension name at lower weight than a command title.

For development, `npm run dev` watches `src/` and hot-reloads the extension inside a running Vicinae.

## How it maps onto the Capacities API

- Daily note capture calls `POST /blocks/daily-note/append` with `markdown` and the `noTimeStamp` flag. Capacities processes the append asynchronously, so the note may take a moment to show up.
- Task creation calls `POST /object/markdown` with `structureId: "RootTask"`. Properties go in YAML frontmatter (`title`, `priority`, `status`, `date`, `deadline`), using the option names Capacities documents for the Task type. The body becomes the task's notes.
- The priority and status dropdowns are populated from `GET /space/structures` so they match the labels in your space. The result is cached for 24 hours because that endpoint allows only 10 requests a minute. If the lookup fails the stock Capacities labels are used.
- Dates are sent as all-day dates (`YYYY-MM-DD`) in your local calendar. "Next week" means the coming Monday and "Next month" the first of next month; the dropdown shows the resolved day next to each option.

Write endpoints allow 30 requests a minute. The extension surfaces rate-limit, bad-token, missing-scope and quota errors as toasts.

## Troubleshooting

- **The commands do not appear after `npm run build`.** Restart Vicinae. See the note in Install above.
- **"Capacities API error (HTTP 502)" on the first run.** Check the API token first. A mistyped token has been seen to come back from Capacities' gateway as a 502 rather than the 401 you would expect. Fix it under Vicinae Settings → Extensions → Capacities → API Token.
- **"Capacities rejected the API token" (401) or "Token lacks the api:write scope" (403).** Generate a new token in Capacities under Settings → Capacities API with the api:write scope, and make sure it is for the space you want to capture into.
- **"Capacities rate limit hit" (429).** Write endpoints allow 30 requests a minute. Wait a minute.

## Not supported (yet)

- Multiple spaces or switching space per capture.
- Time-of-day on task dates.
- Tags or collections on created tasks.
- The retired Capacities Beta API. Anything written against `/save-to-daily-note` stopped working on 1 September 2026; this extension does not use it.

## Licence

MIT. See `LICENSE`.
