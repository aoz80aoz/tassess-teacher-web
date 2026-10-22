"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Select, TextArea, TextField } from "@/components/ui/Field";
import { EmptyState, QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TONE } from "@/features/more/tickets";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Paginate, Ticket } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { S } from "@/lib/strings";

export default function HelpCenterPage() {
  const toast = useToast();
  const router = useRouter();
  const query = useApiQuery<{ tickets: Ticket[]; paginate: Paginate }>(Endpoints.helpCenter, { page: 1 });
  const categories = useApiQuery<string[]>(Endpoints.helpCenterCategories, undefined, { staleTime: Infinity });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "", subject: "", message: "" });
  const [error, setError] = useState<string | null>(null);
  const create = useApiMutation<Ticket | null>(Endpoints.createHelpCenter, { invalidates: [Endpoints.helpCenter] });

  function submit(e: FormEvent) {
    e.preventDefault();
    const category = form.category || categories.data?.[0] || "";
    if (!category || !form.subject.trim() || !form.message.trim()) {
      setError(S.errors.required);
      return;
    }
    create.mutate(
      { category, subject: form.subject.trim(), message: form.message.trim() },
      {
        onSuccess: (t) => {
          toast.show(S.more.ticketCreated);
          setOpen(false);
          setForm({ category: "", subject: "", message: "" });
          // Open the new ticket when the API returns it; else stay on the list.
          if (t?.id) router.push(`/app/more/help/${t.id}`);
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{S.more.help}</h2>
        <Button icon="plus" onClick={() => setOpen(true)}>
          {S.more.newTicket}
        </Button>
      </div>
      <QueryView query={query}>
        {(d) =>
          d.tickets.length === 0 ? (
            <EmptyState icon="chat" title={S.more.noTickets} />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {d.tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/app/more/help/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4 hover:border-primary">
                    <span>
                      <strong className="block">{t.subject}</strong>
                      <span className="text-sm text-muted" dir="ltr">
                        {t.ticket_number}
                      </span>
                      <span className="text-sm text-muted"> · {formatDate(t.created_at)}</span>
                    </span>
                    <Chip tone={TICKET_TONE[t.status]}>{S.more.ticketStatus[t.status]}</Chip>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={S.more.newTicket}
        footer={
          <Button type="submit" form="ticket-form" loading={create.isPending}>
            {S.common.send}
          </Button>
        }
      >
        <form id="ticket-form" onSubmit={submit} className="flex flex-col gap-4">
          <Select label={S.more.ticketCategory} value={form.category || categories.data?.[0] || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {(categories.data ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <TextField label={S.more.ticketSubject} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <TextArea label={S.more.ticketMessage} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Dialog>
    </Card>
  );
}
