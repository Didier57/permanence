"use client";

import { useState } from "react";
import { useTranslations } from "@/components/locale-provider";
import { cn } from "@/lib/cn";

export const DEFAULT_GROUP_COLOR = "#3b82f6";

const SWATCHES = [
  "#3b82f6",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
  "#0f172a",
];

function toHex(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return DEFAULT_GROUP_COLOR;
}

export function ColorPicker({
  name,
  id,
  defaultValue,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(toHex(defaultValue));
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={t("Choisir une couleur")}
          className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1"
        />
        <span className="font-mono text-xs text-slate-500">{value}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => setValue(swatch)}
            title={swatch}
            aria-label={t("Couleur {color}", { color: swatch })}
            className={cn(
              "h-6 w-6 rounded border",
              value === swatch
                ? "border-slate-900 ring-2 ring-slate-300"
                : "border-slate-300 hover:ring-2 hover:ring-slate-200",
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </div>
  );
}
