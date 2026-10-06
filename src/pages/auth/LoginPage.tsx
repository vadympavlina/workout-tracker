import { useState, type FormEvent } from 'react';
import { ArrowLeft, Dumbbell, Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authErrorMessage, resetPassword, signIn } from '@/services/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTheme } from '@/hooks/useTheme';
import { DEFAULT_SETTINGS } from '@/data/demo';

/** Sign-in only — accounts are created by the owner in the Firebase console. */
export default function LoginPage() {
  usePageTitle('Вхід');
  useTheme(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) return setError('Вкажи email.');
    if (mode === 'login' && !password) return setError('Вкажи пароль.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        return; // the auth gate takes over
      }
      await resetPassword(email);
      setInfo('Якщо такий акаунт існує, ми надіслали лист із посиланням для зміни пароля. Перевір пошту (і «Спам»).');
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  };

  return (
    <main
      className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-x-clip px-5"
      style={{ paddingTop: 'calc(24px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
    >
      <div className="glow-blob -right-24 -top-24 h-72 w-72 bg-accent/[0.14]" aria-hidden />
      <div className="relative flex items-center gap-2.5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-black shadow-glow">
          <Dumbbell size={20} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="text-[20px] font-bold tracking-[-0.04em]">Pulse</span>
      </div>

      <form onSubmit={(e) => void submit(e)} className="relative flex flex-1 flex-col justify-center py-10" noValidate>
        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setInfo('');
            }}
            className="mb-6 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-white/[0.06] px-4 text-[14px] font-medium transition hover:bg-white/[0.1]"
          >
            <ArrowLeft size={16} aria-hidden /> До входу
          </button>
        )}
        <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.045em]">{mode === 'login' ? 'Вхід' : 'Відновлення пароля'}</h1>
        <p className="mt-2 text-[15px] text-muted">
          {mode === 'login' ? 'Твої тренування синхронізуються між пристроями.' : 'Вкажи email акаунта — надішлемо посилання для нового пароля.'}
        </p>

        <div className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {mode === 'login' && (
            <div className="relative">
              <Input
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="[&_input]:pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                className="absolute bottom-0.5 right-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:text-fg"
              >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-[14px] border border-negative/25 bg-negative/[0.08] px-4 py-3 text-[14px] text-negative">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="mt-4 rounded-[14px] border border-positive/25 bg-positive/[0.07] px-4 py-3 text-[14px] text-fg">
            {info}
          </p>
        )}

        <Button type="submit" size="lg" block icon={mode === 'login' ? LogIn : Mail} className="mt-6" disabled={busy}>
          {busy ? 'Зачекай…' : mode === 'login' ? 'Увійти' : 'Надіслати посилання'}
        </Button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setError('');
            }}
            className="mx-auto mt-4 h-11 rounded-full px-4 text-[14px] font-medium text-muted transition hover:text-fg"
          >
            Забули пароль?
          </button>
        )}
      </form>

      <p className="relative text-center text-[13px] text-subtle">Немає акаунта? Його створює адміністратор застосунку.</p>
    </main>
  );
}
