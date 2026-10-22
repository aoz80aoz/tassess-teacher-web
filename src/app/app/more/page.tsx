"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Tabs";
import { QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { authPost } from "@/features/auth/auth-api";
import { emptySchool, MAX_PHOTO, NationalitySelect, PhotoField, SchoolFields, type SchoolValue } from "@/features/auth/ProfileFields";
import { initialOf, useTeacher } from "@/features/shell/use-teacher";
import { Endpoints } from "@/lib/api/endpoints";
import { toFormData } from "@/lib/api/client";
import { useApiMutation } from "@/lib/api/hooks";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

export default function ProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useTeacher();
  const [form, setForm] = useState({ name: "", manager_name: "", gender: "female", nationality_id: "" });
  const [school, setSchool] = useState<SchoolValue>(emptySchool);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"password" | "delete" | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const update = useApiMutation<unknown, FormData>(Endpoints.updateTeacherProfile, { invalidates: [Endpoints.getTeacherProfile] });
  const change = useApiMutation(Endpoints.changeTeacherPassword);
  const remove = useApiMutation(Endpoints.deleteTeacherAccount);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.data) setForm({ name: query.data.name, manager_name: query.data.manager_name ?? "", gender: query.data.gender, nationality_id: query.data.nationality_id ? String(query.data.nationality_id) : "" });
  }, [query.data]);

  function saveProfile() {
    if (photo && photo.size > MAX_PHOTO) return setPhotoError(S.auth.photoTooLarge);
    setPhotoError(null);
    // The Postman "update profile" fields; the school only when a new one was picked.
    update.mutate(
      toFormData({
        name: form.name.trim(),
        gender: form.gender,
        img: photo ?? undefined,
        nationality_id: form.nationality_id || undefined,
        school_id: school.school_id || undefined,
        manager_name: form.manager_name.trim(),
      }),
      {
        onSuccess: () => {
          setPhoto(null);
          setSchool(emptySchool);
          toast.show(S.more.profileSaved);
        },
        onError: toast.error,
      },
    );
  }

  return (
    <QueryView query={query}>
      {(t) => (
        <>
          <Card className="flex flex-col gap-5 p-7">
            <div className="flex flex-wrap items-center gap-4">
              {t.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(t.img) ?? ""} alt="" className="size-20 rounded-full object-cover" />
              ) : (
                <span className="grid size-20 place-items-center rounded-full bg-accent-200 text-3xl font-bold text-accent-ink" aria-hidden="true">
                  {initialOf(t.name)}
                </span>
              )}
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
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-ink-2">{S.auth.gender}</span>
                <Segmented
                  label={S.auth.gender}
                  value={form.gender as "male" | "female"}
                  onChange={(v) => setForm({ ...form, gender: v })}
                  options={[
                    { key: "female", label: S.auth.female, activeClass: "bg-primary" },
                    { key: "male", label: S.auth.male, activeClass: "bg-primary" },
                  ]}
                />
              </div>
              <NationalitySelect value={form.nationality_id} onChange={(v) => setForm({ ...form, nationality_id: v })} />
              <TextField label={S.auth.managerName} value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
              <PhotoField file={photo} current={fileUrl(t.img)} onChange={setPhoto} error={photoError} />
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
              <div>
                <div className="font-semibold">{S.more.currentSchool(t.school?.name ?? S.common.dash)}</div>
                <div className="text-sm text-muted">{S.more.changeSchool}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SchoolFields value={school} onChange={setSchool} allowCustom={false} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button
                icon="save"
                loading={update.isPending}
                disabled={!form.name.trim()}
                onClick={saveProfile}
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
