"use client";
import * as React from "react";
import { Download, Trash2, Check } from "lucide-react";
import { Badge, Button, Card, Field, Select, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/shell/Page";
import { useRepo } from "@/data/client";
import { deleteMemory, upsertMemory } from "@/data/commands";
import type { Memory } from "@/domain";
import { useT } from "@/i18n/useT";

const TYPES: Memory["type"][] = ["working", "episodic", "semantic", "procedural"];
const RETENTION: Record<Memory["type"], string> = { working: "Session only", episodic: "1 school year", semantic: "Until source changes", procedural: "Until revoked (admin-approved)" };

export function MemoryCenter() {
  const t = useT();
  const { state, act } = useRepo();
  const [type, setType] = React.useState<Memory["type"]>("episodic");
  const [content, setContent] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state.memories, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classrelay-memories.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const save = () => {
    if (!content.trim()) return;
    const ex = editing ? state.memories.find((m) => m.id === editing) : undefined;
    const r = act(upsertMemory, { id: ex?.id, type, scope: ex?.scope ?? "district", content: content.trim(), source: ex?.source ?? "Memory Center (manual)", confidence: ex?.confidence ?? 1, consentBasis: ex?.consentBasis ?? "Legitimate interest: district operations", approved: type !== "procedural" || ex?.approved === true });
    if (r.ok) {
      setContent("");
      setEditing(null);
    }
  };
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("ai.memory.title")}</h2>
        <Button size="sm" variant="outline" onClick={exportJson}>
          <Download aria-hidden /> {t("ai.memory.export")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <Field label="Memory type" htmlFor="mem-type">
          <Select id="mem-type" value={type} onChange={(e) => setType(e.target.value as Memory["type"])}>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={editing ? `Edit ${editing}` : "New memory"} htmlFor="mem-content" hint="Student-sensitive data is rejected for long-term memory.">
          <Textarea id="mem-content" rows={2} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <Button onClick={save} disabled={!content.trim()}>
          Save
        </Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {TYPES.map((ty) => {
          const ms = state.memories.filter((m) => m.type === ty);
          return (
            <section key={ty}>
              <h3 className="font-semibold capitalize">
                {ty} <span className="text-xs font-normal text-slate-600">Retention: {RETENTION[ty]}</span>
              </h3>
              {!ms.length ? (
                <EmptyState title={`No ${ty} memories`} />
              ) : (
                <ul className="mt-1 space-y-2">
                  {ms.map((m) => (
                    <li key={m.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                      <p>{m.content}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {m.scope} · {m.source} · {m.consentBasis}
                        {m.expiresAt ? ` · expires ${m.expiresAt.slice(0, 10)}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!m.approved && <Badge tone="amber">Awaiting approval</Badge>}
                        {ty === "procedural" && !m.approved && (
                          <Button size="sm" variant="outline" onClick={() => act(upsertMemory, { ...m, approved: true })}>
                            <Check aria-hidden /> Approve playbook
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(m.id);
                            setType(m.type);
                            setContent(m.content);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => act(deleteMemory, m.id)} aria-label={`Delete memory ${m.id}`}>
                          <Trash2 aria-hidden /> Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Card>
  );
}
