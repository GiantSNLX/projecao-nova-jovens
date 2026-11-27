import { useState } from 'react';
import { ArrowRight, KeyRound } from 'lucide-react';
import type { MemberUser } from '../types/portal';
import { ProjectorMark } from './ProjectorMark';

interface LoginScreenProps {
  members: MemberUser[];
  onLoginSuccess: (member: MemberUser) => void;
}

export function LoginScreen({ members, onLoginSuccess }: LoginScreenProps) {
  const [senibId, setSenibId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDemoList, setShowDemoList] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSenib = senibId.trim();
    const cleanPin = pin.trim();

    if (!cleanSenib) {
      setError('Informe sua matrícula do SENIB.');
      return;
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setError('Digite um PIN numérico de 4 dígitos.');
      return;
    }

    const found = members.find(
      (m) => m.senibId === cleanSenib && m.pin === cleanPin && m.active,
    );

    if (!found) {
      setError('Matrícula do SENIB ou PIN inválidos.');
      return;
    }

    setError(null);
    onLoginSuccess(found);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-3.5">
          <ProjectorMark size={44} className="shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Projeção Nova Jovens
            </h1>
            <p className="text-sm text-ink-3">Acesso da equipe e ministérios</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="login-senib"
                className="block text-sm font-medium text-ink-2"
              >
                Matrícula SENIB
              </label>
              <input
                id="login-senib"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                value={senibId}
                onChange={(e) => setSenibId(e.target.value.replace(/\s+/g, ''))}
                placeholder="Ex.: 1042"
                className="font-mono-tech mt-1.5 min-h-[48px] w-full rounded-lg border border-line bg-sunken px-3.5 text-base text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-pin"
                className="block text-sm font-medium text-ink-2"
              >
                PIN (4 dígitos)
              </label>
              <input
                id="login-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="font-mono-tech mt-1.5 min-h-[48px] w-full rounded-lg border border-line bg-sunken px-3.5 text-base tracking-[0.35em] text-ink placeholder:tracking-normal placeholder:text-ink-4 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-rb-primary group mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white"
          >
            <span>Entrar</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        {/* Quiet demo helper to test any role without cluttering the form */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDemoList((v) => !v)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 text-sm text-ink-3 transition-colors hover:text-ink-2"
          >
            <KeyRound className="h-4 w-4" />
            <span>{showDemoList ? 'Ocultar matrículas de teste' : 'Ver matrículas de teste'}</span>
          </button>

          {showDemoList && (
            <div className="mt-2 divide-y divide-line-soft rounded-xl border border-line bg-surface">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSenibId(m.senibId);
                    setPin(m.pin);
                    setError(null);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-ink/5"
                >
                  <div>
                    <span className="font-medium text-ink">{m.name}</span>
                    <span className="ml-2 text-xs text-ink-3">{m.ministry}</span>
                  </div>
                  <span className="font-mono-tech text-xs text-accent">
                    {m.senibId} · {m.pin}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
