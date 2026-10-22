"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { apiFile } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { saveBlob, stamp } from "@/lib/download";
import { S } from "@/lib/strings";

// The report sheet of the app (report_export_sheet.dart): the report tab
// exports what the page shows; the grades tab asks the backend for the
// evaluation grades of the chosen periods.

export function ExportDialog({
  open,
  onClose,
  classroomId,
  studentIds,
  onExportReport,
  reportLabel = S.students.exportStudentsData,
  filePrefix,
}: {
  open: boolean;
  onClose: () => void;
  classroomId: number;
  studentIds: number[];
  onExportReport: () => void;
  reportLabel?: string;
  filePrefix: string;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"report" | "grades">("report");
  const [p1, setP1] = useState(true);
  const [p2, setP2] = useState(true);
  const [loading, setLoading] = useState(false);

  async function exportGrades() {
    setLoading(true);
    try {
      // Both periods = no `phase` (both + totals); one = that period.
      const body: Record<string, unknown> = { group_id: classroomId, students_ids: studentIds };
      if (p1 !== p2) body.phase = p1 ? 1 : 2;
      saveBlob(await apiFile(Endpoints.evaluationElementsExport, body), `${filePrefix}_grades_${stamp()}.csv`);
      toast.show(S.export.downloaded);
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={S.students.exportChooseTitle} size="sm">
      <div className="flex flex-col gap-5">
        <Tabs
          label={S.students.exportChooseTitle}
          value={tab}
          onChange={setTab}
          items={[
            { key: "report", label: reportLabel },
            { key: "grades", label: S.students.exportGradesSheet },
          ]}
        />
        {tab === "report" ? (
          <Button
            icon="download"
            onClick={() => {
              onExportReport();
              toast.show(S.export.downloaded);
              onClose();
            }}
          >
            {S.common.download} {S.common.excel}
          </Button>
        ) : (
          <>
            <fieldset className="flex flex-wrap gap-6">
              <legend className="mb-1 w-full text-sm font-medium text-ink-2">{S.students.choosePeriods}</legend>
              <Checkbox label={S.common.period1} checked={p1} onChange={(e) => setP1(e.target.checked)} />
              <Checkbox label={S.common.period2} checked={p2} onChange={(e) => setP2(e.target.checked)} />
            </fieldset>
            <Button icon="download" disabled={!p1 && !p2} loading={loading} onClick={exportGrades}>
              {S.common.download} {S.common.excel}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
