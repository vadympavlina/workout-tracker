import { useState, type FormEvent } from 'react';
import { Plus, Scale, Target, Trash2 } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TopBar } from '@/components/ui/TopBar';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { TrendChart } from '@/components/charts/Chart';
import { fromISODate, toISODate } from '@/utils/date';
import { formatDate, formatNumber, formatSigned } from '@/utils/format';
import { latestWeight, sortWeights, weightSeries } from '@/utils/stats';

export default function WeightPage() {
  usePageTitle('Вага тіла');
  const { data, saveWeight, deleteWeight } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const latest = latestWeight(data.bodyWeight);
  const [date, setDate] = useState(toISODate(new Date()));
  const [weight, setWeight] = useState<number | null>(latest?.weight ?? null);
  const today = toISODate(new Date());

  const entries = sortWeights(data.bodyWeight);
  const series = weightSeries(data.bodyWeight).map((p) => ({ label: p.label, value: p.weight }));
  const target = data.user.targetWeightKg;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (weight == null || weight < 20 || weight > 400) {
      toast.error('Вкажи коректну вагу');
      return;
    }
    if (!date || date > today) {
      toast.error('Дата не може бути в майбутньому');
      return;
    }
    const replaced = data.bodyWeight.some((x) => x.date === date);
    saveWeight({ date, weight: Math.round(weight * 10) / 10 });
    toast.success(replaced ? 'Запис оновлено' : 'Вагу записано', `${formatDate(fromISODate(date))} — ${formatNumber(weight, 1)} кг`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar back="/profile" title="Вага тіла" subtitle="Регулярні заміри — краще ранком натщесерце" />

      <div className="space-y-6">
        <Card padding="lg">
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <NumberInput label="Вага, кг" value={weight} decimals={1} step={0.1} min={20} max={400} onChange={setWeight} />
            <Input label="Дата" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            <Button type="submit" icon={Plus} size="lg" className="h-14 sm:mb-0">
              Записати
            </Button>
          </form>
        </Card>

        {entries.length === 0 ? (
          <EmptyState icon={Scale} title="Ще немає записів" description="Додай перший замір — і тут зʼявиться графік змін." />
        ) : (
          <>
            <Card padding="lg">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="label">Поточна вага</p>
                  <p className="tabular mt-1 text-[30px] font-semibold leading-none tracking-tight">
                    {formatNumber(latest!.weight, 1)} <span className="text-[16px] font-medium text-muted">кг</span>
                  </p>
                </div>
                {target != null && (
                  <p className="flex items-center gap-1.5 text-[14px] text-muted">
                    <Target size={15} aria-hidden />
                    Ціль {formatNumber(target, 1)} кг
                    <span className="tabular text-subtle">({formatSigned(Math.round((target - latest!.weight) * 10) / 10, 'кг')})</span>
                  </p>
                )}
              </div>
              {series.length >= 2 ? (
                <TrendChart data={series} tone="body" domain={['auto', 'auto']} formatValue={(v) => `${formatNumber(v, 1)} кг`} ariaLabel="Графік зміни ваги" />
              ) : (
                <p className="py-8 text-center text-[14px] text-muted">Додай ще один запис, щоб побачити графік.</p>
              )}
            </Card>

            <Section title="Записи">
              <ul className="card divide-y divide-line">
                {entries.map((e, i) => {
                  const prev = entries[i + 1];
                  const delta = prev ? Math.round((e.weight - prev.weight) * 10) / 10 : null;
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2 pl-4 pr-2">
                      <span className="min-w-0 flex-1 text-[15px]">{formatDate(fromISODate(e.date))}</span>
                      {delta != null && delta !== 0 && (
                        <span className={`tabular text-[13px] ${delta > 0 ? 'text-positive' : 'text-muted'}`}>{formatSigned(delta)}</span>
                      )}
                      <span className="tabular w-20 text-right text-[16px] font-semibold">{formatNumber(e.weight, 1)} кг</span>
                      <IconButton
                        icon={Trash2}
                        label={`Видалити запис ${formatDate(fromISODate(e.date))}`}
                        size="sm"
                        onClick={async () => {
                          const ok = await confirm({ title: 'Видалити запис?', description: `${formatDate(fromISODate(e.date))} — ${formatNumber(e.weight, 1)} кг`, confirmLabel: 'Видалити' });
                          if (ok) deleteWeight(e.id);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
