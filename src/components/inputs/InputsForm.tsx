'use client';

import { QUESTION_BANK, SECTION_LABELS, type Question, type QuestionSection } from '@/lib/inputs';
import type { BrandProfile } from '@/lib/swag/swag-types';
import { Button } from '@/components/common';
import InputField from '@/components/swag/InputField';
import InputSection from '@/components/swag/InputSection';
import CustomDropdown from '@/components/swag/CustomDropdown';
import { useInputs } from './InputsContext';

const SECTION_ACCENT: Record<QuestionSection, 'green' | 'blue' | 'orange'> = {
  company: 'green',
  store: 'blue',
  audience: 'orange',
  goals: 'green',
};

const SECTION_SUBTITLE: Record<QuestionSection, string> = {
  company: 'who you are',
  store: 'your store economics',
  audience: 'owned-channel reach',
  goals: 'what you want from partners',
};

function MultiSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: readonly string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <div>
      <label className="block text-xs font-grotesk text-text-secondary mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-2.5 py-1 rounded-full text-xs font-grotesk border transition-colors ${
                on
                  ? 'bg-accent-green/15 border-accent-green text-accent-green'
                  : 'bg-bg-input border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-grotesk text-text-secondary mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary font-mono text-sm transition-all outline-none focus:border-accent-green"
      />
      {hint && <p className="text-[10px] text-text-muted mt-1 font-grotesk">{hint}</p>}
    </div>
  );
}

function QuestionInput({ q }: { q: Question }) {
  const { inputs, setField } = useInputs();
  const val = inputs[q.id];

  if (q.type === 'number') {
    const isPct = q.suffix === '%';
    const num = typeof val === 'number' ? val : 0;
    return (
      <InputField
        label={q.label}
        value={isPct ? num * 100 : num}
        onChange={(v) => setField(q.id, ((isPct ? v / 100 : v) as unknown) as BrandProfile[typeof q.id])}
        prefix={q.prefix}
        suffix={q.suffix}
        step={q.step}
        hint={q.hint}
      />
    );
  }

  if (q.type === 'select') {
    return (
      <CustomDropdown
        label={q.label}
        value={typeof val === 'string' ? val : ''}
        options={q.options || []}
        onChange={(v) => setField(q.id, (v as unknown) as BrandProfile[typeof q.id])}
        hint={q.hint}
      />
    );
  }

  if (q.type === 'multiselect') {
    return (
      <MultiSelectField
        label={q.label}
        value={Array.isArray(val) ? val : []}
        options={q.options || []}
        onChange={(v) => setField(q.id, (v as unknown) as BrandProfile[typeof q.id])}
      />
    );
  }

  return (
    <TextField
      label={q.label}
      value={typeof val === 'string' ? val : ''}
      onChange={(v) => setField(q.id, (v as unknown) as BrandProfile[typeof q.id])}
      hint={q.hint}
    />
  );
}

export default function InputsForm({ mode = 'page' }: { mode?: 'page' | 'inline' }) {
  const { save, saving, dirty, lastSavedAt, loading } = useInputs();
  const sections = Object.keys(SECTION_LABELS) as QuestionSection[];

  if (loading) {
    return <div className="text-sm text-text-muted font-grotesk p-4">loading your inputs...</div>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const qs = QUESTION_BANK.filter((q) => q.section === section);
        if (qs.length === 0) return null;
        return (
          <InputSection
            key={section}
            title={SECTION_LABELS[section]}
            subtitle={SECTION_SUBTITLE[section]}
            accent={SECTION_ACCENT[section]}
            defaultOpen={mode === 'page'}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {qs.map((q) => (
                <div key={q.id} className={q.type === 'multiselect' ? 'sm:col-span-2' : ''}>
                  <QuestionInput q={q} />
                </div>
              ))}
            </div>
          </InputSection>
        );
      })}

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={() => save()} disabled={saving || !dirty}>
          {saving ? 'saving...' : 'save inputs'}
        </Button>
        {dirty ? (
          <span className="text-xs text-text-muted font-grotesk">unsaved changes</span>
        ) : lastSavedAt ? (
          <span className="text-xs text-text-muted font-grotesk">saved</span>
        ) : null}
      </div>
    </div>
  );
}
