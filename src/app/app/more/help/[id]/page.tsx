"use client";

import clsx from "clsx";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TICKET_TONE } from "@/features/more/tickets";
import { toFormData, type ApiBody } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Ticket, TicketReply } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const toast = useToast();
  const query = useApiQuery<{ ticket: Ticket; replies: TicketReply[] }>(Endpoints.helpCenterDetails, { ticket_id: ticketId });
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const reply = useApiMutation<unknown, ApiBody>(Endpoints.createHelpCenterReply, { invalidates: [Endpoints.helpCenterDetails] });

  function send() {
    const body = { ticket_id: ticketId, message: message.trim(), attachment: attachment ?? undefined };
    reply.mutate(attachment ? toFormData(body) : body, {
      onSuccess: () => {
        setMessage("");
        setAttachment(null);
      },
      onError: toast.error,
    });
  }

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
                  {r.attachment && (
                    <a href={fileUrl(r.attachment) ?? r.attachment} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                      <Icon name="link" className="size-4" />
                      {S.more.openAttachment}
                    </a>
                  )}
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
              <div className="flex flex-wrap items-center gap-3">
                <Button icon="chat" disabled={!message.trim()} loading={reply.isPending} onClick={send}>
                  {S.common.send}
                </Button>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-line px-4 text-sm font-semibold text-primary hover:border-primary">
                  <Icon name="link" className="size-4" />
                  <span className="max-w-56 truncate">{attachment ? attachment.name : S.more.attachment}</span>
                  <input type="file" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                </label>
                {attachment && (
                  <button type="button" className="min-h-11 text-sm text-danger" onClick={() => setAttachment(null)}>
                    {S.common.delete}
                  </button>
                )}
              </div>
            </Card>
          )}
          {ticket.status === "closed" && <RateTicket ticket={ticket} />}
        </>
      )}
    </QueryView>
  );
}

function RateTicket({ ticket }: { ticket: Ticket }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const rate = useApiMutation(Endpoints.rateHelpCenter, { invalidates: [Endpoints.helpCenterDetails] });

  if (ticket.rating) {
    return (
      <Card className="flex flex-col gap-1">
        <strong>{S.more.yourRating(ticket.rating)}</strong>
        {ticket.rating_comment && <p className="text-muted">{ticket.rating_comment}</p>}
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <strong>{S.more.rateTitle}</strong>
      <div role="radiogroup" aria-label={S.more.rateTitle} className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={S.more.rateStar(n)} onClick={() => setRating(n)} className={clsx("grid size-11 place-items-center rounded-xl", n <= rating ? "text-accent" : "text-line-2")}>
            <Icon name="star" className="size-7" />
          </button>
        ))}
      </div>
      <TextArea label={`${S.more.rateComment} (${S.common.optional})`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button
        className="self-start"
        disabled={!rating}
        loading={rate.isPending}
        onClick={() => rate.mutate({ ticket_id: ticket.id, rating, rating_comment: comment.trim() || undefined }, { onSuccess: () => toast.show(S.more.rateThanks), onError: toast.error })}
      >
        {S.more.rateSend}
      </Button>
    </Card>
  );
}
