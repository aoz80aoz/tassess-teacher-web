import { Card } from "@/components/ui/Card";
import { S } from "@/lib/strings";

export function LessonTextCard({ title, text, scale = 1 }: { title: string; text: string | null; scale?: number }) {
  return (
    <Card className="flex flex-col gap-2.5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="whitespace-pre-line leading-9 text-ink-2" style={{ fontSize: `${scale}rem` }}>
        {text?.trim() ? text : S.session.empty}
      </p>
    </Card>
  );
}
