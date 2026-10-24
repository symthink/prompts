import { useEffect, useMemo, useState } from 'react';

import { listDomains, listPrompts, type PromptDelivery, type PromptMeta } from '../../src/registry/index.js';
import { DEFAULT_VARIANT, fixturesById, type Fixture } from './fixtures.js';
import { renderFromJson, type RenderOutcome } from './render.js';

type DeliveryFilter = 'all' | PromptDelivery;

const DELIVERY_FILTERS: { value: DeliveryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'external-chat', label: 'external-chat' },
  { value: 'symthink-api', label: 'symthink-api' },
];

const toJson = (value: unknown) => `${JSON.stringify(value ?? {}, null, 2)}\n`;
const draftKey = (id: string, variant: string) => `${id}--${variant}`;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function Sidebar(props: {
  selectedId: string;
  onSelect: (id: string) => void;
  filter: DeliveryFilter;
  onFilter: (filter: DeliveryFilter) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const prompts = listPrompts(props.filter === 'all' ? {} : { delivery: props.filter });

  return (
    <nav className="sidebar">
      <h1 className="brand">
        @symthink/prompts <span className="muted">demo</span>
      </h1>
      <div className="chips" role="radiogroup" aria-label="Delivery">
        {DELIVERY_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={props.filter === option.value}
            className={`chip${props.filter === option.value ? ' chip--active' : ''}`}
            onClick={() => props.onFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {listDomains().map((domain) => {
        const domainPrompts = prompts.filter((meta) => meta.domain === domain);
        if (!domainPrompts.length) return null;
        const open = !collapsed.has(domain);
        return (
          <section key={domain} className="domain">
            <button
              type="button"
              className="domain__toggle"
              aria-expanded={open}
              onClick={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (open) next.add(domain);
                  else next.delete(domain);
                  return next;
                })
              }
            >
              <span className="domain__caret">{open ? '▾' : '▸'}</span>
              {domain}
              <span className="muted"> ({domainPrompts.length})</span>
            </button>
            {open && (
              <ul className="domain__list">
                {domainPrompts.map((meta) => (
                  <li key={meta.id}>
                    <button
                      type="button"
                      className={`prompt-link${meta.id === props.selectedId ? ' prompt-link--active' : ''}`}
                      onClick={() => props.onSelect(meta.id)}
                    >
                      <span>{meta.title}</span>
                      <code className="prompt-link__id">{meta.id}</code>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </nav>
  );
}

function VariablesHelp({ meta }: { meta: PromptMeta }) {
  if (!meta.variables.length) {
    return <p className="muted">This prompt has no variables. Its fixture is an empty object.</p>;
  }
  return (
    <table className="vars">
      <thead>
        <tr>
          <th>Variable</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {meta.variables.map((variable) => (
          <tr key={variable.name}>
            <td>
              <code>{variable.name}</code>
              {variable.required ? <span className="required" title="Required"> *</span> : null}
            </td>
            <td>
              <code>{variable.type}</code>
            </td>
            <td>{variable.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OutputBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="output">
      <header className="output__header">
        <h3>{title}</h3>
        <span className="muted">
          {text.length.toLocaleString()} chars · {text.split('\n').length} lines
        </span>
        <CopyButton text={text} />
      </header>
      <pre className="output__text">{text}</pre>
    </section>
  );
}

function RenderedOutput({ outcome }: { outcome: RenderOutcome }) {
  switch (outcome.kind) {
    case 'json-error':
      return (
        <div className="alert">
          <strong>Variables are not valid JSON.</strong> {outcome.message}
        </div>
      );
    case 'invalid':
      return (
        <div className="alert">
          <strong>Variables do not match the prompt's schema.</strong>
          <ul>
            {outcome.issues.map((issue, index) => (
              <li key={index}>
                <code>{issue.path || '(root)'}</code> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'error':
      return (
        <div className="alert">
          <strong>Render failed.</strong> {outcome.message}
        </div>
      );
    case 'ok':
      return typeof outcome.output === 'string' ? (
        <OutputBlock title="Prompt" text={outcome.output} />
      ) : (
        <>
          <OutputBlock title="System message" text={outcome.output.system} />
          <OutputBlock title="User message" text={outcome.output.user} />
        </>
      );
  }
}

function PromptWorkspace(props: {
  meta: PromptMeta;
  variant: string;
  onVariant: (variant: string) => void;
  drafts: Record<string, string>;
  onDraft: (key: string, json: string) => void;
}) {
  const { meta, variant, drafts } = props;
  const fixtures: Fixture[] = fixturesById[meta.id] ?? [];
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fixture = fixtures.find((item) => item.variant === variant);
  const fixtureJson = toJson(fixture?.vars);
  const key = draftKey(meta.id, variant);
  const json = drafts[key] ?? fixtureJson;
  const edited = drafts[key] != null && drafts[key] !== fixtureJson;

  const debouncedJson = useDebounced(json, 200);
  const outcome = useMemo(
    () => renderFromJson(meta.delivery, meta.id, debouncedJson),
    [meta.delivery, meta.id, debouncedJson],
  );

  async function save(fileName: string) {
    setSaveStatus('Saving…');
    try {
      JSON.parse(json);
      const response = await fetch(`/__fixtures/${encodeURIComponent(fileName)}`, { method: 'POST', body: json });
      if (!response.ok) throw new Error(await response.text());
      setSaveStatus(`Saved fixtures/${fileName}.json`);
    } catch (error) {
      setSaveStatus(`Save failed: ${(error as Error).message}`);
    }
  }

  function saveAsVariant() {
    const name = window.prompt('Variant name (lowercase letters, digits, dashes):', 'example')?.trim();
    if (!name) return;
    if (!/^[a-z0-9-]+$/.test(name)) {
      setSaveStatus('Variant names use lowercase letters, digits, and dashes only.');
      return;
    }
    void save(`${meta.id}--${name}`);
  }

  return (
    <main className="workspace">
      <header className="prompt-header">
        <div>
          <h2>{meta.title}</h2>
          <p className="prompt-header__id">
            <code>{meta.id}</code>
            <span className="badge">{meta.delivery}</span>
            <span className="badge">{meta.output}</span>
            <span className={`badge badge--${meta.usage.status}`}>{meta.usage.status}</span>
            {meta.usage.pasteBack ? <span className="badge">paste-back</span> : null}
          </p>
          <p>{meta.description}</p>
        </div>
      </header>

      <div className="columns">
        <section className="panel">
          <div className="toolbar">
            <label>
              Example{' '}
              <select value={variant} onChange={(event) => props.onVariant(event.target.value)}>
                {fixtures.length === 0 && <option value={DEFAULT_VARIANT}>(no fixture file)</option>}
                {fixtures.map((item) => (
                  <option key={item.variant} value={item.variant}>
                    {item.variant}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={!edited}
              onClick={() => props.onDraft(key, fixtureJson)}
            >
              Reset
            </button>
            <CopyButton text={json} label="Copy JSON" />
            {import.meta.env.DEV && (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() => void save(variant === DEFAULT_VARIANT ? meta.id : `${meta.id}--${variant}`)}
                >
                  Save fixture
                </button>
                <button type="button" className="button" onClick={saveAsVariant}>
                  Save as variant…
                </button>
              </>
            )}
          </div>
          {saveStatus && <p className="muted save-status">{saveStatus}</p>}
          <textarea
            className="editor"
            spellCheck={false}
            value={json}
            onChange={(event) => props.onDraft(key, event.target.value)}
            aria-label="Prompt variables (JSON)"
          />
          <h3>Variables</h3>
          <VariablesHelp meta={meta} />
          {meta.usage.notes && (
            <p className="muted">
              <strong>Notes:</strong> {meta.usage.notes}
            </p>
          )}
        </section>

        <section className="panel">
          <RenderedOutput outcome={outcome} />
        </section>
      </div>
    </main>
  );
}

export function App() {
  const [filter, setFilter] = useState<DeliveryFilter>('all');
  const [selectedId, setSelectedId] = useState(() => {
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    return listPrompts().some((meta) => meta.id === fromHash) ? fromHash : listPrompts()[0]!.id;
  });

  useEffect(() => {
    window.history.replaceState(null, '', `#${selectedId}`);
  }, [selectedId]);

  // Kept here (not in PromptWorkspace) so edits survive switching between prompts.
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const meta = listPrompts().find((item) => item.id === selectedId)!;
  const variant = variants[meta.id] ?? fixturesById[meta.id]?.[0]?.variant ?? DEFAULT_VARIANT;

  return (
    <div className="layout">
      <Sidebar selectedId={selectedId} onSelect={setSelectedId} filter={filter} onFilter={setFilter} />
      <PromptWorkspace
        key={meta.id}
        meta={meta}
        variant={variant}
        onVariant={(next) => setVariants((current) => ({ ...current, [meta.id]: next }))}
        drafts={drafts}
        onDraft={(key, json) => setDrafts((current) => ({ ...current, [key]: json }))}
      />
    </div>
  );
}
