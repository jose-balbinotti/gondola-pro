// ─────────────────────────────────────────────────────────────────────────────
// Field.tsx  –  componentes de formulário reutilizáveis: Field e SliderField
// ─────────────────────────────────────────────────────────────────────────────
import { Slider } from "@/components/ui/slider";

// ── Field ─────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Chave usada para limpar o valor padrão no foco */
  defaultValue?: string;
}

export function Field({ label, value, onChange, placeholder, defaultValue }: FieldProps) {
  const handleFocus = () => {
    if (defaultValue !== undefined && value === defaultValue) onChange("");
  };

  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

// ── SliderField ───────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

export function SliderField({ label, value, min, max, onChange }: SliderFieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 block">{label}</label>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
