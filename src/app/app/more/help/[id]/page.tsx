"use client";

import clsx from "clsx";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TONE } from "@/features/more/tickets";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Ticket, TicketReply } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { S } from "@/lib/strings";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const toast = useToast();
  const query = useApiQuery<{ ticket: Ticket; replies: TicketReply[] }>(Endpoints.helpCenterDetails, { ticket_id: ticketId });
  const [message, setMessage] = useState("");
  const reply = useApiMutation(Endpoints.createHelpCenterReply, { invalidates: [Endpoints.helpCenterDetails] });

  return (
    <QueryView query={query}>
      {({ ticket, replies }) => (
        <>
          <PageHeader
            crumbs={[{ label: S.more.help, href: "/app/more/help" }, { label: ticket.ticket_number }]}
            title={ticket.subject}
            meta={
              <div className="flex flex-wrap gap-2">
                <Chip tone={TICKET_TONE[ticket.status]}>{S.more.ticketStatus[ticket.status]}</Chip>
                <Chip tone="neutral">{ticket.category}</Chip>
              </div>
            }
          />
          <Card className="flex flex-col gap-3">
            {replies.map((r) => {
              const mine = r.sender_type === "teacher";
              return (
                <div key={r.id} className={clsx("flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-3", mine ? "self-start bg-primary-soft" : "self-end bg-accent-soft")}>
                  <span className="text-xs font-semibold text-muted">{mine ? S.more.you : S.more.support}</span>
                  <p className="whitespace-pre-line leading-7">{r.message}</p>
                  <span className="text-xs text-muted">
                    {formatDate(r.created_at)} · {formatTime(r.created_at)}
                  </span>
                </div>
              );
            })}
          </Card>
          {ticket.status !== "closed" && (
            <Card className="flex flex-col gap-3">
              <TextArea label={S.more.reply} placeholder={S.more.replyPlaceholder} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              <Button
                className="self-start"
                icon="chat"
                disabled={!message.trim()}
                loading={reply.isPending}
                onClick={() => reply.mutate({ ticket_id: ticketId, message: message.trim() }, { onSuccess: () => setMessage(""), onError: toast.error })}
              >
                {S.common.send}
              </Button>
            </Card>
          )}
        </>
      )}
    </QueryView>
  );
}
