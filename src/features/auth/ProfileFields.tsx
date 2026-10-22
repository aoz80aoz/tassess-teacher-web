"use client";

import { useEffect, useState } from "react";
import { Checkbox, Select, TextField } from "@/components/ui/Field";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Named, NationalitiesAndRegions } from "@/lib/api/types";
import { S } from "@/lib/strings";

// Fields shared by registration and the profile: the school chain
// (region → city → district → school) and the teacher's photo.

export const MAX_PHOTO = 2 * 1024 * 1024;

export interface SchoolValue {
  region_id: string;
  city_id: string;
  district_id: string;
  school_id: string;
  /** Typed when the school is missing from the list (registration only). */
  school_name: string;
}

export const emptySchool: SchoolValue = { region_id: "", city_id: "", district_id: "", school_id: "", school_name: "" };

const options = (list: Named[] | undefined) =>
  (list ?? []).map((o) => (
    <option key={o.id} value={o.id}>
      {o.name}
    </option>
  ));

export function useNationalitiesAndRegions() {
  return useApiQuery<NationalitiesAndRegions>(Endpoints.nationalitiesAndRegions, undefined, { staleTime: Infinity });
}

export function NationalitySelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const lookups = useNationalitiesAndRegions();
  return (
    <Select label={S.auth.nationality} value={value} onChange={(e) => onChange(e.target.value)} error={error}>
      <option value="">{S.common.selectPlaceholder}</option>
      {options(lookups.data?.nationalities)}
    </Select>
  );
}

export function SchoolFields({ value, onChange, allowCustom, errors = {} }: { value: SchoolValue; onChange: (v: SchoolValue) => void; allowCustom: boolean; errors?: Partial<Record<keyof SchoolValue, string>> }) {
  const lookups = useNationalitiesAndRegions();
  const cities = useApiQuery<Named[]>(Endpoints.cities, { region_id: value.region_id }, { enabled: Boolean(value.region_id) });
  const districts = useApiQuery<Named[]>(Endpoints.districts, { city_id: value.city_id }, { enabled: Boolean(value.city_id) });
  const schools = useApiQuery<Named[]>(Endpoints.schools, { district_id: value.district_id }, { enabled: Boolean(value.district_id) });
  const [custom, setCustom] = useState(Boolean(value.school_name));

  return (
    <>
      <Select label={S.auth.region} value={value.region_id} error={errors.region_id} onChange={(e) => onChange({ ...emptySchool, region_id: e.target.value, school_name: value.school_name })}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(lookups.data?.regions)}
      </Select>
      <Select label={S.auth.city} value={value.city_id} disabled={!value.region_id} error={errors.city_id} onChange={(e) => onChange({ ...value, city_id: e.target.value, district_id: "", school_id: "" })}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(cities.data)}
      </Select>
      <Select label={S.auth.district} value={value.district_id} disabled={!value.city_id} error={errors.district_id} onChange={(e) => onChange({ ...value, district_id: e.target.value, school_id: "" })}>
        <option value="">{S.common.selectPlaceholder}</option>
        {options(districts.data)}
      </Select>
      {custom ? (
        <TextField label={S.auth.schoolName} value={value.school_name} error={errors.school_name} onChange={(e) => onChange({ ...value, school_name: e.target.value })} />
      ) : (
        <Select label={S.auth.school} value={value.school_id} disabled={!value.district_id} error={errors.school_id} onChange={(e) => onChange({ ...value, school_id: e.target.value })}>
          <option value="">{S.common.selectPlaceholder}</option>
          {options(schools.data)}
        </Select>
      )}
      {allowCustom && (
        <Checkbox
          className="sm:col-span-2"
          label={S.auth.schoolNotListed}
          checked={custom}
          onChange={(e) => {
            setCustom(e.target.checked);
            // The backend takes exactly one of school_id and school_name.
            onChange({ ...value, school_id: "", school_name: "" });
          }}
        />
      )}
    </>
  );
}

export function PhotoField({ file, current, onChange, error }: { file: File | null; current?: string | null; onChange: (f: File | null) => void; error?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const shown = preview ?? current ?? null;

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="text-sm font-medium text-ink-2">
        {S.auth.photo} ({S.common.optional})
      </span>
      <div className="flex flex-wrap items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="size-16 rounded-full bg-soft" aria-hidden="true" />
        )}
        <label className="cursor-pointer rounded-xl border-[1.5px] border-line px-4 py-2.5 text-sm font-semibold text-primary hover:border-primary">
          {S.auth.choosePhoto}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
        {file && (
          <button type="button" className="min-h-11 text-sm text-danger" onClick={() => onChange(null)}>
            {S.auth.removePhoto}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
