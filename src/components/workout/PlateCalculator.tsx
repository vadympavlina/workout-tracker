import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { NumberInput } from '@/components/ui/NumberInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { platesPerSide } from '@/utils/plates';
import { formatNumber } from '@/utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Weight to load, usually the current set's weight. */
  initialWeight: number | null;
}

/** Competition-style plate colours; height scales with plate size. */
const PLATE_STYLE: Record<number, { color: string; h: number; text: string }> = {
  25: { color: '#e5484d', h: 112, text: '#fff' },
  20: { color: '#3e83f8', h: 112, text: '#fff' },
  15: { color: '#f5c542', h: 100, text: '#111' },
  10: { color: '#3fbf6f', h: 88, text: '#111' },
  5: { color: '#f2f2f2', h: 70, text: '#111' },
  2.5: { color: '#3a3a40', h: 56, text: '#fff' },
  1.25: { color: '#a5a5ad', h: 46, text: '#111' },
};

export function PlateCalculator({ open, onClose, initialWeight }: Props) {
  const [target, setTarget] = useState<number | null>(initialWeight);
  const [bar, setBar] = useState('20');

  useEffect(() => {
    if (open) setTarget(initialWeight);
  }, [open, initialWeight]);

  const load = platesPerSide(target ?? 0, Number(bar));
  const counts = load.perSide.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }), {});

  return (
    <Modal open={open} onClose={onClose} title="Калькулятор дисків" description="Що повісити на кожну сторону штанги">
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <NumberInput label="Вага на штанзі, кг" value={target} decimals={2} step={2.5} min={0} max={500} onChange={setTarget} />
          <div>
            <p className="label mb-1.5">Гриф</p>
            <SegmentedControl
              label="Вага грифа"
              value={bar}
              onChange={setBar}
              options={[
                { value: '20', label: '20' },
                { value: '15', label: '15' },
                { value: '10', label: '10' },
              ]}
              className="h-[54px] items-center"
            />
          </div>
        </div>

        {/* Bar illustration: one side, sleeve on the right. */}
        <div className="flex h-36 items-center overflow-hidden rounded-[20px] bg-white/[0.04] px-4" role="img" aria-label={`На кожну сторону: ${load.perSide.join(' + ') || 'нічого'} кг`}>
          <div className="h-3 w-10 shrink-0 rounded-l-full bg-[#9a9aa2]" aria-hidden />
          <div className="h-6 w-2 shrink-0 rounded-sm bg-[#c5c5cc]" aria-hidden />
          <div className="flex items-center gap-[3px] pl-1">
            {load.perSide.map((p, i) => {
              const style = PLATE_STYLE[p] ?? PLATE_STYLE[1.25];
              return (
                <div
                  key={i}
                  className="flex animate-pop items-center justify-center rounded-[5px] font-mono text-[10px] font-bold [writing-mode:vertical-rl]"
                  style={{ height: style.h, width: p >= 10 ? 22 : 16, background: style.color, color: style.text, animationDelay: `${i * 50}ms` }}
                  aria-hidden
                >
                  {formatNumber(p, 2)}
                </div>
              );
            })}
          </div>
          <div className="h-3 flex-1 rounded-r-full bg-[#9a9aa2]" aria-hidden />
        </div>

        <div className="space-y-2">
          <p className="eyebrow">На кожну сторону</p>
          {load.perSide.length === 0 ? (
            <p className="text-[15px] text-muted">Лише гриф — дисків не потрібно.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {Object.entries(counts)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([plate, n]) => (
                  <li key={plate} className="flex items-center gap-2 rounded-full bg-white/[0.06] py-1.5 pl-1.5 pr-3.5 text-[14px] font-semibold">
                    <span className="h-5 w-5 rounded-full" style={{ background: PLATE_STYLE[Number(plate)]?.color }} aria-hidden />
                    {n} × {formatNumber(Number(plate), 2)} кг
                  </li>
                ))}
            </ul>
          )}
          <p className={clsx('text-[14px]', load.remainder !== 0 ? 'text-warning' : 'text-muted')}>
            Разом: <span className="metric font-semibold text-fg">{formatNumber(load.total, 2)} кг</span>
            {load.remainder > 0 && ` — точно ${formatNumber(target ?? 0, 2)} кг набрати не вийде (бракує ${formatNumber(load.remainder, 2)} кг)`}
          </p>
        </div>
      </div>
    </Modal>
  );
}
