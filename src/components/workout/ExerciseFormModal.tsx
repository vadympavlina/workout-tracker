import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import type { Equipment, Exercise, IconKey, MuscleGroup } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/data/labels';
import { ICON_KEYS, ICONS } from '@/utils/icons';
import { uid } from '@/utils/id';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (exercise: Exercise) => void;
  initial?: Exercise | null;
}

const blank = (): Exercise => ({
  id: '',
  name: '',
  muscleGroup: 'chest',
  equipment: 'machine',
  description: '',
  icon: 'dumbbell',
  defaultSets: 3,
  defaultRepsMin: 8,
  defaultRepsMax: 12,
  isCustom: true,
});

export function ExerciseFormModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<Exercise>(blank);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial ?? blank());
      setError('');
    }
  }, [open, initial]);

  const patch = (p: Partial<Exercise>) => setForm((f) => ({ ...f, ...p }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError('Вкажи назву вправи');
    const repsMin = Math.min(form.defaultRepsMin, form.defaultRepsMax);
    const repsMax = Math.max(form.defaultRepsMin, form.defaultRepsMax);
    onSave({ ...form, name, description: form.description.trim(), id: form.id || `custom-${uid()}`, defaultRepsMin: repsMin, defaultRepsMax: repsMax });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Редагувати вправу' : 'Нова вправа'}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Скасувати
          </Button>
          <Button block type="submit" form="exercise-form">
            Зберегти
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={submit} className="space-y-4">
        <Input
          label="Назва"
          value={form.name}
          onChange={(e) => {
            patch({ name: e.target.value });
            setError('');
          }}
          placeholder="Напр., Жим гантелей сидячи"
          error={error}
          data-autofocus
          maxLength={60}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Група мʼязів"
            value={form.muscleGroup}
            onChange={(e) => patch({ muscleGroup: e.target.value as MuscleGroup })}
            options={Object.entries(MUSCLE_GROUPS).map(([value, label]) => ({ value, label }))}
          />
          <Select
            label="Обладнання"
            value={form.equipment}
            onChange={(e) => patch({ equipment: e.target.value as Equipment })}
            options={Object.entries(EQUIPMENT).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberInput label="Підходи" value={form.defaultSets} min={1} max={10} onChange={(v) => patch({ defaultSets: v ?? 1 })} />
          <NumberInput label="Повт. від" value={form.defaultRepsMin} min={1} max={100} onChange={(v) => patch({ defaultRepsMin: v ?? 1 })} />
          <NumberInput label="Повт. до" value={form.defaultRepsMax} min={1} max={100} onChange={(v) => patch({ defaultRepsMax: v ?? 1 })} />
        </div>
        <fieldset className="min-w-0">
          <legend className="label mb-2">Іконка</legend>
          <div className="grid grid-cols-6 gap-2">
            {ICON_KEYS.map((key: IconKey) => {
              const Icon = ICONS[key];
              const selected = form.icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Іконка ${key}`}
                  aria-pressed={selected}
                  onClick={() => patch({ icon: key })}
                  className={clsx(
                    'inline-flex h-12 items-center justify-center rounded-ctl border transition',
                    selected ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-elevated text-muted hover:text-fg',
                  )}
                >
                  <Icon size={20} aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>
        <Textarea
          label="Опис / техніка"
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Ключові моменти техніки (необовʼязково)"
          maxLength={400}
        />
      </form>
    </Modal>
  );
}
