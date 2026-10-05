import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  BookOpen, Camera, ChevronRight, CircleHelp, Download, Palette, RotateCcw, Ruler, Scale, Settings as SettingsIcon, Target, Trash2,
  Upload, UserRound, Dumbbell, type LucideIcon,
} from 'lucide-react';
import type { AccentKey, GoalType, Settings, UserProfile } from '@/types';
import { useData } from '@/store/DataContext';
import { useActiveWorkout } from '@/store/ActiveWorkoutContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Switch } from '@/components/ui/Switch';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ACCENTS, GOALS } from '@/data/labels';
import { dataService, parseImport, parseImportMedia } from '@/services/dataService';
import { downloadJson, readFileAsText, resizeImage } from '@/utils/files';
import { formatNumber, pluralWorkouts } from '@/utils/format';
import { latestWeight } from '@/utils/stats';
import { toISODate } from '@/utils/date';

type Sheet = 'personal' | 'goals' | 'settings' | 'theme' | null;

export default function ProfilePage() {
  usePageTitle('Профіль');
  const data = useData();
  const { user, settings } = data.data;
  const active = useActiveWorkout();
  const toast = useToast();
  const confirm = useConfirm();
  const [sheet, setSheet] = useState<Sheet>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const weight = latestWeight(data.data.bodyWeight);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      data.updateUser({ avatar: await resizeImage(file) });
      toast.success('Фото оновлено');
    } catch (e) {
      toast.error('Не вдалося оновити фото', (e as Error).message);
    }
  };

  const exportData = async () => {
    downloadJson(await dataService.toExportFile(data.data), `pulse-backup-${toISODate(new Date())}.json`);
    toast.success('Експорт готовий', 'JSON-файл збережено на пристрій');
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw: unknown = JSON.parse(await readFileAsText(file));
      const parsed = parseImport(raw);
      const media = parseImportMedia(raw);
      const ok = await confirm({
        title: 'Імпортувати дані?',
        description: `Поточні дані буде замінено: ${pluralWorkouts(parsed.sessions.length)}, ${parsed.plans.length} план(ів), ${parsed.bodyWeight.length} записів ваги.`,
        confirmLabel: 'Імпортувати',
        tone: 'primary',
      });
      if (!ok) return;
      await dataService.importMedia(media).catch(() => toast.error('Фото не імпортовано', 'Сховище браузера недоступне.'));
      await data.replaceAll(parsed);
      active.discard();
      toast.success('Дані імпортовано');
    } catch (e) {
      toast.error('Помилка імпорту', e instanceof SyntaxError ? 'Файл не є коректним JSON.' : (e as Error).message);
    }
  };

  const resetDemo = async () => {
    const ok = await confirm({
      title: 'Відновити демо-дані?',
      description: 'Усі поточні дані буде замінено прикладом. Спершу зроби експорт, якщо хочеш їх зберегти.',
      confirmLabel: 'Відновити',
    });
    if (!ok) return;
    await data.resetToDemo();
    active.discard();
    toast.success('Демо-дані відновлено');
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Видалити всі дані?',
      description: 'Плани, історія, вага й налаштування буде видалено з цього браузера. Дію не можна скасувати.',
      confirmLabel: 'Видалити все',
    });
    if (!ok) return;
    await data.clearAll();
    active.discard();
    toast.success('Дані видалено', 'Можна починати з чистого аркуша');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Профіль" />

      <Card padding="lg" className="relative overflow-clip">
        <div className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Avatar name={user.name} src={user.avatar} size={84} />
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              aria-label="Змінити фото"
              className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-accent text-black transition hover:brightness-110"
            >
              <Camera size={16} aria-hidden />
            </button>
            <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[22px] font-semibold tracking-tight">{user.name || 'Без імені'}</h2>
            <p className="mt-0.5 text-[14px] text-muted">{GOALS[user.goal].label}</p>
          </div>
        </div>
        <dl className="relative mt-5 grid grid-cols-3 gap-2">
          <ProfileStat icon={Ruler} label="Зріст" value={user.heightCm ? `${user.heightCm} см` : '—'} />
          <ProfileStat icon={Scale} label="Вага" value={weight ? `${formatNumber(weight.weight, 1)} кг` : '—'} />
          <ProfileStat icon={Dumbbell} label="Тренувань" value={String(data.sessions.length)} />
        </dl>
      </Card>

      <div className="mt-6 space-y-6">
        <MenuGroup title="Акаунт">
          <MenuItem icon={UserRound} label="Особисті дані" hint="Імʼя, зріст, фото" onClick={() => setSheet('personal')} />
          <MenuItem icon={Target} label="Цілі" hint={`${GOALS[user.goal].label} · ${user.weeklyWorkoutsTarget} трен./тиждень`} onClick={() => setSheet('goals')} />
          <MenuItem icon={Scale} label="Вага тіла" hint="Записи та графік" to="/weight" />
          <MenuItem icon={BookOpen} label="Бібліотека вправ" hint="Власні вправи" to="/exercises" />
        </MenuGroup>

        <MenuGroup title="Застосунок">
          <MenuItem icon={SettingsIcon} label="Налаштування" hint={`Відпочинок ${settings.restTimerSec ? `${settings.restTimerSec} с` : 'вимкнено'}`} onClick={() => setSheet('settings')} />
          <MenuItem icon={Palette} label="Тема" hint={`${ACCENTS[settings.accent].label}${settings.oled ? ' · OLED' : ''}`} onClick={() => setSheet('theme')} />
          <MenuItem icon={CircleHelp} label="Допомога" hint="Як користуватись, встановлення" to="/help" />
        </MenuGroup>

        <MenuGroup title="Дані">
          <MenuItem icon={Download} label="Експорт даних" hint="Завантажити JSON-резервну копію" onClick={() => void exportData()} />
          <MenuItem icon={Upload} label="Імпорт даних" hint="Відновити з JSON-файлу" onClick={() => importInput.current?.click()} />
          <MenuItem icon={RotateCcw} label="Відновити демо-дані" onClick={resetDemo} />
          <MenuItem icon={Trash2} label="Видалити всі дані" danger onClick={clearAll} />
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importData(e.target.files?.[0]); e.target.value = ''; }} />
        </MenuGroup>

        <p className="pb-4 text-center text-[13px] text-subtle">
          Pulse 1.0 · Дані зберігаються локально в цьому браузері.
          <br />
          Регулярно роби експорт, щоб не втратити історію.
        </p>
      </div>

      <PersonalSheet open={sheet === 'personal'} onClose={() => setSheet(null)} user={user} onSave={(p) => { data.updateUser(p); setSheet(null); toast.success('Дані збережено'); }} onPhoto={() => photoInput.current?.click()} />
      <GoalsSheet open={sheet === 'goals'} onClose={() => setSheet(null)} user={user} onSave={(p) => { data.updateUser(p); setSheet(null); toast.success('Цілі оновлено'); }} />
      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} settings={settings} onChange={data.updateSettings} />
      <ThemeSheet open={sheet === 'theme'} onClose={() => setSheet(null)} settings={settings} onChange={data.updateSettings} />
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-ctl bg-white/[0.03] p-3">
      <dt className="flex items-center gap-1 text-[12px] text-subtle">
        <Icon size={13} aria-hidden /> {label}
      </dt>
      <dd className="tabular mt-1 text-[16px] font-semibold">{value}</dd>
    </div>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="eyebrow mb-2 px-1">{title}</h2>
      <ul className="card divide-y divide-line overflow-hidden">{children}</ul>
    </section>
  );
}

function MenuItem({ icon: Icon, label, hint, onClick, to, danger }: { icon: LucideIcon; label: string; hint?: string; onClick?: () => void; to?: string; danger?: boolean }) {
  const inner = (
    <>
      <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', danger ? 'bg-negative/10 text-negative' : 'bg-white/[0.05] text-muted')}>
        <Icon size={19} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx('block text-[15px] font-medium', danger && 'text-negative')}>{label}</span>
        {hint && <span className="block truncate text-[13px] text-subtle">{hint}</span>}
      </span>
      {!danger && <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden />}
    </>
  );
  const cls = 'flex min-h-[60px] w-full items-center gap-3.5 px-4 py-2.5 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]';
  return (
    <li>
      {to ? (
        <Link to={to} className={cls}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cls}>
          {inner}
        </button>
      )}
    </li>
  );
}

function PersonalSheet({ open, onClose, user, onSave, onPhoto }: { open: boolean; onClose: () => void; user: UserProfile; onSave: (p: Partial<UserProfile>) => void; onPhoto: () => void }) {
  const [name, setName] = useState(user.name);
  const [height, setHeight] = useState<number | null>(user.heightCm);
  const [birthYear, setBirthYear] = useState<number | null>(user.birthYear);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(user.name);
      setHeight(user.heightCm);
      setBirthYear(user.birthYear);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Особисті дані"
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Скасувати
          </Button>
          <Button block onClick={() => onSave({ name: name.trim(), heightCm: height, birthYear })}>
            Зберегти
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Імʼя" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" data-autofocus />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Зріст, см" value={height} min={100} max={250} onChange={setHeight} />
          <NumberInput label="Рік народження" value={birthYear} min={1930} max={new Date().getFullYear()} onChange={setBirthYear} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Camera} onClick={onPhoto}>
            {user.avatar ? 'Змінити фото' : 'Додати фото'}
          </Button>
          {user.avatar && (
            <Button variant="ghost" onClick={() => onSave({ avatar: null })}>
              Прибрати фото
            </Button>
          )}
        </div>
        <p className="text-[13px] text-subtle">Вагу тіла записуй у розділі «Вага тіла» — так зберігається історія змін.</p>
      </div>
    </Modal>
  );
}

function GoalsSheet({ open, onClose, user, onSave }: { open: boolean; onClose: () => void; user: UserProfile; onSave: (p: Partial<UserProfile>) => void }) {
  const [goal, setGoal] = useState<GoalType>(user.goal);
  const [target, setTarget] = useState<number | null>(user.targetWeightKg);
  const [weekly, setWeekly] = useState<number>(user.weeklyWorkoutsTarget);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setGoal(user.goal);
      setTarget(user.targetWeightKg);
      setWeekly(user.weeklyWorkoutsTarget);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Цілі"
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Скасувати
          </Button>
          <Button block onClick={() => onSave({ goal, targetWeightKg: target, weeklyWorkoutsTarget: weekly })}>
            Зберегти
          </Button>
        </>
      }
    >
      <fieldset className="min-w-0 space-y-2">
        <legend className="label mb-2">Основна ціль</legend>
        {(Object.keys(GOALS) as GoalType[]).map((g) => (
          <label
            key={g}
            className={clsx(
              'flex min-h-[56px] cursor-pointer items-center gap-3 rounded-ctl border px-4 py-2.5 transition',
              goal === g ? 'border-accent/50 bg-accent/[0.08]' : 'border-line hover:border-white/15',
            )}
          >
            <input type="radio" name="goal" value={g} checked={goal === g} onChange={() => setGoal(g)} className="h-4 w-4 accent-[rgb(var(--c-accent))]" />
            <span>
              <span className="block text-[15px] font-medium">{GOALS[g].label}</span>
              <span className="block text-[13px] text-subtle">{GOALS[g].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <NumberInput label="Цільова вага, кг" value={target} decimals={1} step={0.5} min={30} max={250} onChange={setTarget} />
        <NumberInput label="Тренувань / тиждень" value={weekly} min={1} max={14} onChange={(v) => setWeekly(v ?? 1)} />
      </div>
    </Modal>
  );
}

function SettingsSheet({ open, onClose, settings, onChange }: { open: boolean; onClose: () => void; settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Налаштування" description="Зміни застосовуються одразу.">
      <p className="label mb-2">Таймер відпочинку</p>
      <SegmentedControl
        label="Тривалість відпочинку"
        value={String(settings.restTimerSec)}
        onChange={(v) => onChange({ restTimerSec: Number(v) })}
        options={[
          { value: '0', label: 'Вимк.' },
          { value: '60', label: '60 с' },
          { value: '90', label: '90 с' },
          { value: '120', label: '2 хв' },
          { value: '180', label: '3 хв' },
        ]}
      />
      <div className="mt-3 divide-y divide-line">
        <Switch
          label="Автоматичний відпочинок"
          description="Запускати таймер після кожного виконаного підходу"
          checked={settings.autoRestTimer}
          onChange={(v) => onChange({ autoRestTimer: v })}
        />
        <Switch label="Вібрація" description="Сигнал про кінець відпочинку та нові рекорди" checked={settings.vibration} onChange={(v) => onChange({ vibration: v })} />
      </div>
    </Modal>
  );
}

function ThemeSheet({ open, onClose, settings, onChange }: { open: boolean; onClose: () => void; settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Тема" description="Застосунок завжди темний — обери акцент.">
      <fieldset className="min-w-0">
        <legend className="label mb-2">Акцентний колір</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={settings.accent === k}
              onClick={() => onChange({ accent: k })}
              className={clsx(
                'flex h-14 items-center gap-3 rounded-ctl border px-4 text-left text-[15px] font-medium transition',
                settings.accent === k ? 'border-white/25 bg-white/[0.06]' : 'border-line hover:border-white/15',
              )}
            >
              <span className="h-6 w-6 rounded-full ring-2 ring-white/10" style={{ background: `rgb(${ACCENTS[k].accent})` }} aria-hidden />
              {ACCENTS[k].label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        <Switch label="OLED-чорний" description="Повністю чорне тло — економить заряд на OLED-екранах" checked={settings.oled} onChange={(v) => onChange({ oled: v })} />
      </div>
    </Modal>
  );
}
