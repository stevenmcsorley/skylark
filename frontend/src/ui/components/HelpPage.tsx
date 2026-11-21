/**
 * How Skylark works, in the order a new person needs it: where to start, what each page is for,
 * how to send errors, and what an agent can do.
 */

const panel = 'rounded-lg border border-slate-700 bg-slate-950 p-5'
const h2 = 'text-lg font-semibold text-slate-100'
const term = 'font-medium text-slate-100'

const START: Array<[string, string]> = [
  ['Add an app', 'Open Inbox (or Apps) and name the thing that will send errors: a website, an API, a script.'],
  ['Connect it', 'Apps, then Setup. Paste the snippet into your code and press Send test event. The status turns to Connected when the first event lands.'],
  ['Read the Inbox', 'Every error that needs you appears here, newest first, with a count and the app it came from.'],
  ['Open an issue', 'Read the stack trace and the chart. Resolve it, ignore it, assign it, or hand it off.'],
  ['Hand off to an agent', 'Hand off opens a ticket in GitHub or Ossicone that an agent or a teammate picks up. Connect the tracker under Settings, then Integrations.'],
]

const PAGES: Array<[string, string]> = [
  ['Inbox', 'What needs you right now, across every app. This is the home page.'],
  ['Apps', 'One app at a time. Health shows its open issues and the last 24 hours. Setup has the snippet. Releases and Alerts hold its release history and who gets told. Charts shows volume over time.'],
  ['Explore', 'Search every raw event with filters for level, environment and release.'],
  ['Settings', 'Agents and API for connecting AI agents, Integrations for trackers, and this Help page.'],
]

const TERMS: Array<[string, string]> = [
  ['App', 'Anything that sends errors to Skylark. It has its own ingest token and DSN.'],
  ['Event', 'One captured occurrence: a thrown error, a message or a log line, with its stack, level, environment and release.'],
  ['Issue', 'Events with the same fingerprint rolled up into one problem, with a count and first and last seen. This is what you work on.'],
  ['New and Regressed', 'New means first seen in the last 24 hours. Regressed means you resolved it and a new event reopened it.'],
  ['Release and deploy', 'A version of your app and the record that it went out. They let Skylark tie a new error to the change that caused it.'],
  ['Alert rule', 'Sends an email or webhook when an issue crosses a threshold in a time window.'],
]

const STACKS: Array<[string, string]> = [
  ['Any Sentry SDK', 'Use the DSN from Apps, Setup. Python, JavaScript, Node, Go, Ruby, PHP and .NET SDKs all work.'],
  ['Browser or React', 'initSkylark and SkylarkErrorBoundary, in examples/react'],
  ['Node (Express)', 'error-handling middleware, in examples/node-express'],
  ['Python (FastAPI, Flask)', 'a global exception handler, in examples/python-fastapi and examples/python-flask'],
  ['Anything else', 'one HTTP POST, shown below'],
]

const AGENT_EXAMPLES: Array<[string, string[]]> = [
  ['See what needs you', ['“Show unresolved issues in billing-api, worst first.”', '“Is anything new since the last deploy?”']],
  ['Investigate', ['“What is the stack trace on the latest event in issue 12?”', '“Any spike in errors in the last 24 hours?”']],
  ['Act', ['“Resolve issue 42 and comment why.”', '“Open a GitHub issue for issue 7.”']],
  ['Set up', ['“Create an app called billing-api.”', '“Send a test event so I can see it works.”']],
]

export function HelpPage() {
  return (
    <div className="space-y-6" data-testid="help-page">
      <section className={panel}>
        <h2 className={h2}>Where to start</h2>
        <ol className="mt-3 space-y-3 text-sm text-slate-300">
          {START.map(([t, d], i) => (
            <li key={t} className="flex gap-3"><span className="w-5 shrink-0 tabular-nums text-slate-400">{i + 1}.</span><span><span className={term}>{t}.</span> {d}</span></li>
          ))}
        </ol>
      </section>

      <section className={panel}>
        <h2 className={h2}>What each page is for</h2>
        <dl className="mt-3 divide-y divide-slate-700">
          {PAGES.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
              <dt className={`text-sm ${term}`}>{t}</dt>
              <dd className="text-sm text-slate-300">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={panel}>
        <h2 className={h2}>Words you will see</h2>
        <dl className="mt-3 divide-y divide-slate-700">
          {TERMS.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
              <dt className={`text-sm ${term}`}>{t}</dt>
              <dd className="text-sm text-slate-300">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={panel}>
        <h2 className={h2}>Sending errors from your app</h2>
        <p className="mt-1 text-sm text-slate-300">The quickest route is a Sentry SDK pointed at your DSN. Ready-made examples ship in the repo under <code>examples/</code>.</p>
        <dl className="mt-3 divide-y divide-slate-700">
          {STACKS.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className={`text-sm ${term}`}>{t}</dt>
              <dd className="text-sm text-slate-300">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-slate-300">Without an SDK, send one authenticated POST to your app&rsquo;s ingest endpoint:</p>
        <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-100">{`POST /api/events/ingest/token/<INGEST_TOKEN>/
Content-Type: application/json

{ "message": "Something broke", "level": "error",
  "environment": "production", "release": "1.2.3",
  "stack": "…", "tags": [{"key":"area","value":"checkout"}] }`}</pre>
      </section>

      <section className={panel}>
        <h2 className={h2}>Working with an agent</h2>
        <p className="mt-1 text-sm text-slate-300">Skylark runs an MCP server, so an AI agent can read issues, resolve them and open tickets in plain language. Create a token under Settings, Agents and API, then ask:</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {AGENT_EXAMPLES.map(([group, prompts]) => (
            <div key={group} className="rounded-md border border-slate-700 p-3">
              <div className={`text-sm ${term}`}>{group}</div>
              <ul className="mt-1 space-y-1 text-sm text-slate-300">
                {prompts.map(p => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
