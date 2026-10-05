import { useRef, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { ArrowRight, Check, ChevronLeft, Dumbbell, Sparkles, Upload } from 'lucide-react';
import type { AppData, GoalType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { ActivityRings } from '@/components/ui/ActivityRings';
import { useToast } from '@/components/ui/Toast';
import { GOALS } from '@/data/labels';
import { createDemoData, createStarterPlans, emptyData } from '@/data/demo';
import { dataService, parseImport, parseImportMedia } from '@/services/dataService';
import { readFileAsText } from '@/utils/files';
import { toISODate } from '@/utils/date';
import { uid } from '@/utils/id';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Props {
  finish: (data: AppData) => Promise<void>;
}

/** First launch: start fresh with a short profile, explore the demo, or restore a backup. */
export default function Onboarding({ finish }: Props) {
  usePageTitle('Ласкаво просимо');
  const [step, setStep] = useState<'welcome' | 'profile'>('welcome');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [goal, setGoal] = useState<GoalType>('muscle');
  const [weekly, setWeekly] = useState(3);
  const [starter, setStarter] = useState(true);
  const [nameError, setNameError] = useState('');

  const run = async (make: () => Promise<AppData> | AppData) => {
    setBusy(true);
    try {
      await finish(await make());
    } catch (e) {
      toast.error('Не вдалося зберегти', (e as Error).message);
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Як до тебе звертатися?');
      return;
    }
    void run(() => {
      const base = emptyData();
      return {
        ...base,
        user: { ...base.user, name: name.trim(), heightCm: height, goal, weeklyWorkoutsTarget: weekly },
        plans: starter ? createStarterPlans() : [],
        bodyWeight: weight ? [{ id: uid(), date: toISODate(new Date()), weight }] : [],
      };
    });
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    await run(async () => {
      const raw: unknown = JSON.parse(await readFileAsText(file));
      const parsed = parseImport(raw);
      await dataService.importMedia(parseImportMedia(raw)).catch(() => {});
      return parsed;
    }).catch(() => {});
  };

  return (
    <main
      className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-x-clip px-5"
      style={{ paddingTop: 'calc(24px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
    >
      <div className="glow-blob -right-24 -top-24 h-72 w-72 bg-accent/[0.14]" aria-hidden />
      <div className="glow-blob -left-24 top-1/3 h-64 w-64 bg-volume/[0.08]" aria-hidden />

      {step === 'welcome' ? (
        <div className="relative flex flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-black shadow-glow">
              <Dumbbell size={20} strokeWidth={2.4} aria-hidden />
            </span>
            <span className="text-[20px] font-bold tracking-[-0.04em]">Pulse</span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <ActivityRings
              size={200}
              stroke={20}
              gap={5}
              label="Ілюстрація: кільця активності"
              rings={[
                { label: 'Тренування', value: 0.82, max: 1, color: 'move' },
                { label: 'Обсяг', value: 0.64, max: 1, color: 'volume' },
                { label: 'Підходи', value: 0.9, max: 1, color: 'sets' },
              ]}
            />
            <h1 className="mt-10 text-[38px] font-bold leading-[1.02] tracking-[-0.045em]">
              Тренуйся.
              <br />
              Записуй. Рости.
            </h1>
            <p className="mt-4 max-w-xs text-[16px] text-muted">
              Плани на тиждень, швидкий запис підходів, рекорди та прогрес — усе на твоєму телефоні.
            </p>
          </div>

          <div className="space-y-3">
            <Button size="lg" block iconRight={ArrowRight} onClick={() => setStep('profile')} disabled={busy}>
              Почати
            </Button>
            <Button size="lg" block variant="secondary" icon={Sparkles} onClick={() => void run(() => createDemoData())} disabled={busy}>
              Подивитись демо
            </Button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="mx-auto flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-muted transition hover:text-fg"
            >
              <Upload size={16} aria-hidden />
              Відновити з резервної копії
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void restore(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="relative flex flex-1 flex-col" noValidate>
          <button
            type="button"
            onClick={() => setStep('welcome')}
            aria-label="Назад"
            className="-ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] transition hover:bg-white/[0.1]"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <h1 className="mt-6 text-[32px] font-bold leading-[1.05] tracking-[-0.04em]">Трохи про тебе</h1>
          <p className="mt-2 text-[15px] text-muted">Це можна змінити будь-коли в профілі.</p>

          <div className="mt-8 flex-1 space-y-5">
            <Input
              label="Імʼя"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              error={nameError}
              autoComplete="given-name"
              maxLength={40}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Зріст, см" value={height} min={100} max={250} onChange={setHeight} />
              <NumberInput label="Вага, кг" value={weight} decimals={1} step={0.5} min={30} max={300} onChange={setWeight} />
            </div>

            <fieldset className="min-w-0">
              <legend className="label mb-2">Ціль</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GOALS) as GoalType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={goal === g}
                    onClick={() => setGoal(g)}
                    className={clsx(
                      'h-11 rounded-full px-4 text-[14px] font-medium transition',
                      goal === g ? 'bg-fg text-black' : 'bg-white/[0.06] text-muted hover:text-fg',
                    )}
                  >
                    {GOALS[g].label}
                  </button>
                ))}
              </div>
            </fieldset>

            <NumberInput label="Тренувань на тиждень" value={weekly} min={1} max={14} onChange={(v) => setWeekly(v ?? 1)} />

            <button
              type="button"
              role="checkbox"
              aria-checked={starter}
              onClick={() => setStarter((v) => !v)}
              className="flex w-full items-start gap-3 rounded-[18px] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.06]"
            >
              <span
                className={clsx(
                  'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition',
                  starter ? 'bg-accent text-black' : 'bg-white/[0.08]',
                )}
              >
                {starter && <Check size={16} strokeWidth={3} aria-hidden />}
              </span>
              <span>
                <span className="block text-[15px] font-medium">Додати готовий план</span>
                <span className="block text-[13px] text-subtle">4 тренування: Груди + Руки, Спина + Біцепс, Ноги + Прес, Повне тіло — можна змінити</span>
              </span>
            </button>
          </div>

          <Button type="submit" size="lg" block icon={Check} className="mt-8" disabled={busy}>
            Готово
          </Button>
        </form>
      )}
    </main>
  );
}
