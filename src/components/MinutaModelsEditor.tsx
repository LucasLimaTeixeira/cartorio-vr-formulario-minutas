import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { isWorkspaceOwner, loadWorkspaceState, saveWorkspaceState } from '../utils/workspaceStorage';

export type MinutaModels = Partial<Record<'procuracao' | 'apostilamento' | 'certidoes' | 'uniao_estavel' | 'pacto_antenupcial', string>>;

const options = [
  ['procuracao', 'Procuração'], ['apostilamento', 'Apostilamento'], ['certidoes', 'Certidões'], ['uniao_estavel', 'União estável'], ['pacto_antenupcial', 'Pacto antenupcial'],
] as const;

export function MinutaModelsEditor() {
  const [models, setModels] = useState<MinutaModels>(() => loadWorkspaceState('modelos-minuta', {}));
  const [type, setType] = useState<keyof MinutaModels>('procuracao');
  const [message, setMessage] = useState('');
  const value = models[type] ?? '[CORPO_GERADO]';
  useEffect(() => {
    if (!isWorkspaceOwner()) return;
    saveWorkspaceState('modelos-minuta', models);
  }, [models]);
  if (!isWorkspaceOwner()) {
    return <section className="team-manager"><p className="team-info">Somente o proprietário do workspace pode editar os modelos de minuta.</p></section>;
  }
  return <section className="team-manager">
    <div className="team-heading"><Save /><div><h2>Modelos de minutas</h2><p>Edite o texto padrão usado nas próximas minutas do workspace.</p></div></div>
    <div className="team-invite">
      <label>Tipo de minuta<select value={type} onChange={(event) => { setType(event.target.value as keyof MinutaModels); setMessage(''); }}>{options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </div>
    <p className="team-info">Mantenha <code>[CORPO_GERADO]</code> para inserir automaticamente os dados preenchidos no formulário. Você pode escrever parágrafos antes ou depois dele.</p>
    <textarea className="w-full min-h-96 mt-4 p-4 border border-gray-300 rounded-md font-serif text-sm leading-relaxed" value={value} onChange={(event) => setModels((current) => ({ ...current, [type]: event.target.value }))} />
    <div className="mt-4 flex items-center gap-3"><button type="button" className="booking-button" onClick={() => setMessage('Modelo salvo e sincronizado para este workspace.')}>Salvar modelo</button>{message && <span className="team-message">{message}</span>}</div>
  </section>;
}
