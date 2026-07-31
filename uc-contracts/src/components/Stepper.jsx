const STAGES = [
  { key: 'registration', label: 'Cadastro' },
  { key: 'hr_pending', label: 'RH' },
  { key: 'finance_pending', label: 'Financeiro' },
  { key: 'legal_review', label: 'Jurídico' },
  { key: 'contract_generated_pending', label: 'Geração' },
  { key: 'under_review', label: 'Revisão' },
  { key: 'sent', label: 'Envio' },
  { key: 'signed', label: 'Assinado' }
];

export default function Stepper({ currentStage }) {
  if (currentStage === 'rejected') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-signal-reject/10 px-3 py-1 text-signal-reject text-sm font-medium">
        Devolvido pelo Jurídico
      </div>
    );
  }
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  return (
    <div className="flex items-center flex-wrap gap-x-1 gap-y-2">
      {STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={stage.key} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono
                ${active ? 'bg-ink text-parchment' : done ? 'bg-brass/20 text-brass-dark' : 'bg-ink/5 text-ink/40'}`}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <span className="font-body">{stage.label}</span>
            </div>
            {i < STAGES.length - 1 && <div className="w-3 h-px bg-ink/15 mx-0.5" />}
          </div>
        );
      })}
    </div>
  );
}

export { STAGES };
