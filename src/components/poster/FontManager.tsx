// ─────────────────────────────────────────────────────────────────────────────
// FontManager.tsx  –  painel para adicionar/remover fontes do Google Fonts.
//                     Usado tanto no EditorPage quanto no BatchPage.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addCustomFont, removeCustomFont, loadCustomFonts, type CustomFont } from "@/lib/customFonts";
import { validateGoogleFontName } from "@/lib/security";

interface Props {
  customFonts: CustomFont[];
  onFontsChange: (fonts: CustomFont[]) => void;
}

export default function FontManager({ customFonts, onFontsChange }: Props) {
  const [newFontName, setNewFontName] = useState("");
  const { toast } = useToast();

  const handleAdd = () => {
    const validationError = validateGoogleFontName(newFontName);

    if (validationError) {
      toast({ title: validationError, variant: "destructive" });
      return;
    }

    const font = addCustomFont(newFontName);
    if (font) {
      onFontsChange(loadCustomFonts());
      setNewFontName("");
      toast({ title: `Fonte "${font.name}" adicionada!` });
    } else {
      toast({ title: "Fonte já existe ou limite atingido", variant: "destructive" });
    }
  };

  const handleRemove = (name: string) => {
    removeCustomFont(name);
    onFontsChange(loadCustomFonts());
  };

  return (
    <div className="p-3 rounded-lg bg-muted/40 border border-dashed border-border">
      <label className="text-xs font-semibold text-muted-foreground mb-2 block">
        Adicionar fonte do Google Fonts
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={newFontName}
          onChange={(e) => setNewFontName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Ex: Montserrat, Roboto, Poppins..."
          className="flex-1 h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button variant="outline" size="sm" className="gap-1" onClick={handleAdd}>
          + Add
        </Button>
      </div>

      {customFonts.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {customFonts.map((f) => (
            <span
              key={f.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs text-foreground"
            >
              {f.name}
              <button
                onClick={() => handleRemove(f.name)}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
