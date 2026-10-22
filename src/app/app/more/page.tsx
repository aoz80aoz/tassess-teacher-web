"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { authPost } from "@/features/auth/auth-api";
import { initialOf, useTeacher } from "@/features/shell/use-teacher";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation } from "@/lib/api/hooks";
import { S } from "@/lib/strings";

export default function ProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useTeacher();
  const [form, setForm] = useState({ name: "", manager_name: "" });
  const [dialog, setDialog] = useState<"password" | "delete" | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const update = useApiMutation(Endpoints.updateTeacherProfile, { invalidates: [Endpoints.getTeacherProfile] });
  const change = useApiMutation(Endpoints.changeTeacherPassword);
  const remove = useApiMutation(Endpoints.deleteTeacherAccount);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.data) setForm({ name: query.data.name, manager_name: query.data.manager_name ?? "" });
  }, [query.data]);

  return (
    <QueryView query={query}>
      {(t) => (
        <>
          <Card className="flex flex-col gap-5 p-7">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-20 place-items-center rounded-full bg-accent-200 text-3xl font-bold text-accent-ink" aria-hidden="true">
                {initialOf(t.name)}
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{t.name}</h2>
                <Chip tone={t.is_subscribed ? "success" : "neutral"} className="mt-1">
                  {t.is_subscribed ? S.more.subscribed : S.more.notSubscribed}
                </Chip>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={S.auth.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label={S.auth.phone} value={t.phone} dir="ltr" readOnly disabled />
              <TextField label={S.auth.managerName} value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
              <TextField label={S.auth.school} value={t.school?.name ?? ""} readOnly disabled />
              <TextField label={S.auth.region} value={t.school?.region.name ?? ""} readOnly disabled />
              <TextField label={S.auth.nationality} value={t.nationality?.name ?? ""} readOnly disabled />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button
                icon="save"
                loading={update.isPending}
                disabled={!form.name.trim()}
                onClick={() => update.mutate({ name: form.name.trim(), manager_name: form.manager_name.trim() }, { onSuccess: () => toast.show(S.more.profileSaved), onError: toast.error })}
              >
                {S.common.save}
              </Button>
              <Button variant="outline" icon="lock" onClick={() => setDialog("password")}>
                {S.more.changePassword}
              </Button>
              <Button variant="danger" icon="trash" onClick={() => setDialog("delete")}>
                {S.more.deleteAccount}
              </Button>
            </div>
          </Card>

          <Dialog
            open={dialog === "password"}
            onClose={() => setDialog(null)}
            title={S.more.changePassword}
            size="sm"
            footer={
              <Button
                loading={change.isPending}
                onClick={() => {
                  if (pw.next.length < 6) return setPwError(S.errors.passwordShort);
                  if (pw.next !== pw.confirm) return setPwError(S.errors.passwordsMismatch);
                  setPwError(null);
                  change.mutate(
                    { current_password: pw.current, new_password: pw.next },
                    {
                      onSuccess: () => {
                        toast.show(S.more.passwordChanged);
                        setPw({ current: "", next: "", confirm: "" });
                        setDialog(null);
                      },
                      onError: (e) => setPwError(e.message),
                    },
                  );
                }}
              >
                {S.common.save}
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              <TextField label={S.more.currentPassword} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <TextField label={S.more.newPassword} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <TextField label={S.auth.confirmPassword} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwError} />
            </div>
          </Dialog>

          <DeleteAccount
            open={dialog === "delete"}
            onClose={() => setDialog(null)}
            loading={remove.isPending}
            onConfirm={(password) =>
              remove.mutate(
                { password },
                {
                  onSuccess: async () => {
                    await authPost("logout").catch(() => null);
                    queryClient.clear();
                    router.replace("/");
                  },
                  onError: toast.error,
                },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}

function DeleteAccount({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: (password: string) => void; loading: boolean }) {
  const [password, setPassword] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.more.deleteAccount}
      size="sm"
      footer={
        <>
          <Button className="!bg-danger hover:!bg-danger-ink" disabled={!password} loading={loading} onClick={() => onConfirm(password)}>
            {S.more.deleteAccount}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <p className="mb-4 leading-7 text-ink-2">{S.more.deleteAccountBody}</p>
      <TextField label={S.auth.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
    </Dialog>
  );
}
