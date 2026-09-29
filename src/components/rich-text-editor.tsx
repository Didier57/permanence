"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { sanitizeRichText } from "@/lib/html";

const LINK_COLOR = "#2563eb";

const FONTS = [
  { label: "Par defaut", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

const SIZES = [
  { label: "Taille", value: "" },
  { label: "Tres petit", value: "1" },
  { label: "Petit", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Moyen", value: "4" },
  { label: "Grand", value: "5" },
  { label: "Tres grand", value: "6" },
  { label: "Enorme", value: "7" },
];

const COLORS = ["#0f172a", "#dc2626", "#ea580c", "#16a34a", "#0284c7", "#7c3aed", "#64748b", "#ffffff"];

const TOOL_BUTTON =
  "rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100";

export function RichTextEditor({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [color, setColor] = useState("#0f172a");

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML === defaultValue) return;
    el.innerHTML = defaultValue;
  }, [defaultValue]);

  function sync() {
    const el = editorRef.current;
    if (el && inputRef.current) {
      inputRef.current.value = el.innerHTML;
    }
  }

  function exec(command: string, value?: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    sync();
  }

  function applyColor(next: string) {
    setColor(next);
    exec("foreColor", next);
  }

  function styleAnchors() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("a").forEach((node) => {
      const anchor = node as HTMLAnchorElement;
      if (anchor.style.color === "") anchor.style.color = LINK_COLOR;
      anchor.style.textDecoration = "underline";
    });
  }

  function createLink() {
    const el = editorRef.current;
    if (!el) return;
    const url = window.prompt("Adresse du lien (https://...)", "https://");
    if (!url || !url.trim() || url.trim() === "https://") return;
    const selection = window.getSelection();
    const hasSelection =
      selection !== null &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      el.contains(selection.anchorNode);

    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    if (hasSelection) {
      document.execCommand("createLink", false, url.trim());
    } else {
      const anchor = document.createElement("a");
      anchor.setAttribute("href", url.trim());
      anchor.textContent = url.trim();
      anchor.style.color = LINK_COLOR;
      anchor.style.textDecoration = "underline";
      selection?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      range.insertNode(anchor);
      const caret = document.createRange();
      caret.setStartAfter(anchor);
      caret.collapse(true);
      selection?.addRange(caret);
    }
    styleAnchors();
    sync();
  }

  function removeLink() {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    el.querySelectorAll("a").forEach((node) => {
      const anchor = node as HTMLAnchorElement;
      const touched =
        range.intersectsNode(anchor) ||
        anchor.contains(range.startContainer) ||
        anchor.contains(range.endContainer);
      if (!touched) return;
      const parent = anchor.parentNode;
      if (!parent) return;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
    });
    sync();
  }

  function switchToSource() {
    if (editorRef.current && sourceRef.current) {
      sourceRef.current.value = editorRef.current.innerHTML;
    }
    setMode("source");
  }

  function switchToVisual() {
    if (editorRef.current && sourceRef.current) {
      editorRef.current.innerHTML = sourceRef.current.value;
    }
    sync();
    setMode("visual");
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white shadow-sm">
      <input type="hidden" name={name} ref={inputRef} defaultValue={defaultValue} />

      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("bold")} title="Gras">
          <strong>G</strong>
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("italic")} title="Italique">
          <em>I</em>
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("underline")} title="Souligne">
          <span className="underline">S</span>
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("strikeThrough")} title="Barre">
          <span className="line-through">A</span>
        </button>

        <span className="mx-1 h-5 w-px bg-slate-300" />

        <select
          className="rounded border border-slate-300 bg-white px-1 py-1 text-xs"
          defaultValue=""
          onChange={(event) => exec("fontName", event.target.value)}
          title="Police"
        >
          {FONTS.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          className="rounded border border-slate-300 bg-white px-1 py-1 text-xs"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) exec("fontSize", event.target.value);
          }}
          title="Taille de police"
        >
          {SIZES.map((size) => (
            <option key={size.label} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <span className="mx-1 h-5 w-px bg-slate-300" />

        <span className="flex items-center gap-1" title="Couleur du texte">
          <input
            type="color"
            value={color}
            onChange={(event) => applyColor(event.target.value)}
            className="h-7 w-7 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
          />
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => applyColor(swatch)}
              title={`Couleur ${swatch}`}
              aria-label={`Couleur ${swatch}`}
              className="h-5 w-5 rounded border border-slate-300"
              style={{ backgroundColor: swatch }}
            />
          ))}
        </span>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("hiliteColor", "#fef08a")} title="Surligner">
          Surligner
        </button>

        <span className="mx-1 h-5 w-px bg-slate-300" />

        <button type="button" className={TOOL_BUTTON} onClick={() => exec("formatBlock", "<h2>")} title="Titre">
          Titre
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("formatBlock", "<h3>")} title="Sous-titre">
          Sous-titre
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("formatBlock", "<p>")} title="Paragraphe">
          Paragraphe
        </button>

        <span className="mx-1 h-5 w-px bg-slate-300" />

        <button type="button" className={TOOL_BUTTON} onClick={createLink} title="Inserer un lien">
          Lien
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={removeLink} title="Retirer le lien">
          Sans lien
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300" />

        <button type="button" className={TOOL_BUTTON} onClick={() => exec("insertUnorderedList")} title="Liste a puces">
          Liste
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("insertOrderedList")} title="Liste numerotee">
          1.
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("justifyLeft")} title="Aligner a gauche">
          Gauche
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("justifyCenter")} title="Centrer">
          Centre
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("justifyRight")} title="Aligner a droite">
          Droite
        </button>
        <button type="button" className={TOOL_BUTTON} onClick={() => exec("removeFormat")} title="Effacer la mise en forme">
          Effacer
        </button>

        <span className="ml-auto" />
        {mode === "visual" ? (
          <button type="button" className={TOOL_BUTTON} onClick={switchToSource} title="Modifier le code HTML">
            HTML
          </button>
        ) : (
          <button type="button" className={TOOL_BUTTON} onClick={switchToVisual} title="Revenir a l'editeur visuel">
            Visuel
          </button>
        )}
      </div>

      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          onPaste={(event) => {
            event.preventDefault();
            const html = event.clipboardData.getData("text/html");
            const text = event.clipboardData.getData("text/plain");
            const cleaned = html ? sanitizeRichText(html) : null;
            document.execCommand("styleWithCSS", false, "true");
            if (cleaned) {
              document.execCommand("insertHTML", false, cleaned);
            } else if (text) {
              document.execCommand("insertText", false, text);
            }
            styleAnchors();
            sync();
          }}
          data-placeholder={placeholder}
          className={cn(
            "min-h-[140px] px-3 py-2 text-sm text-slate-900 outline-none",
            "[&_a]:font-medium [&_a]:text-blue-600 [&_a]:underline",
            "empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]",
          )}
        />
      ) : (
        <textarea
          ref={sourceRef}
          defaultValue={defaultValue}
          className="min-h-[140px] w-full px-3 py-2 font-mono text-xs text-slate-900 outline-none"
          onChange={(event) => {
            if (inputRef.current) inputRef.current.value = event.target.value;
          }}
        />
      )}
    </div>
  );
}
