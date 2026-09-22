import { useEffect, useState } from 'react';
import { Copy, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isWorkspaceOwner, workspaceProfile } from '../utils/workspaceStorage';

type Role = 'owner' | 'admin' | 'attendant' | 'viewer';
type Member = { user_id: string; role: Role; profiles: { full_name: string; email: string } | null };
type MemberRecord = { user_id: string; role: Role };

const roleLabel: Record<Role, string> = { owner: 'Proprietário', admin: 'Administrador', attendant: 'Atendente', viewer: 'Consulta' };

export function TeamManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [role, setRole] = useState<'admin' | 'attendant' | 'viewer'>('attendant');
  const [invite, setInvite] = useState('');
  const [message, setMessage] = useState('');
  const isOwner = isWorkspaceOwner();

  const loadMembers = async () => {
    if (!supabase) return;
    const { data: memberData, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceProfile.workspaceId)
      .order('created_at');
    if (membersError) { setMessage(membersError.message); return; }

    const members = (memberData ?? []) as MemberRecord[];
    const userIds = members.map((member) => member.user_id);
    const { data: profileData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    if (profilesError) { setMessage(profilesError.message); return; }

    const profiles = new Map((profileData ?? []).map((profile) => [profile.id, { full_name: profile.full_name, email: profile.email }]));
    setMembers(members.map((member) => ({ ...member, profiles: profiles.get(member.user_id) ?? null })));
  };

  useEffect(() => { void loadMembers(); }, []);

  const createInvite = async () => {
    if (!supabase) return;
    setMessage('');
    const { data, error } = await supabase.rpc('create_workspace_invite', { invite_role: role });
    if (error) setMessage(error.message);
    else setInvite(data?.[0]?.code ?? '');
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(invite);
    setMessage('Código copiado. Ele expira em 14 dias e só pode ser usado uma vez.');
  };

  const updateRole = async (userId: string, nextRole: 'admin' | 'attendant' | 'viewer') => {
    if (!supabase) return;
    const { error } = await supabase.rpc('update_workspace_member_role', { member_id: userId, new_role: nextRole });
    if (error) setMessage(error.message);
    else void loadMembers();
  };

  if (!isOwner) return <section className="team-manager"><p className="team-info">A gestão da equipe é exclusiva do proprietário do workspace.</p></section>;

  return <section className="team-manager">
    <div className="team-heading"><UsersRound /><div><h2>Equipe do workspace</h2><p>Gere um código. O funcionário cria a própria conta e, na tela de primeiro acesso, escolhe “Tenho um convite”.</p></div></div>
    <div className="team-invite">
      <label>Perfil do convite<select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
        <option value="admin">Administrador</option>
        <option value="attendant">Atendente</option><option value="viewer">Consulta</option>
      </select></label>
      <button type="button" onClick={() => void createInvite()}>Gerar convite</button>
      {invite && <div className="team-code"><code>{invite}</code><button type="button" onClick={() => void copyInvite()}><Copy /> Copiar</button></div>}
    </div>
    {message && <p className="team-message">{message}</p>}
    <div className="team-members">
      {members.map((member) => <article key={member.user_id}><div><strong>{member.profiles?.full_name || 'Usuário sem nome'}</strong><span>{member.profiles?.email || member.user_id}</span></div>
        {workspaceProfile.role === 'owner' && member.role !== 'owner' ? <select value={member.role} onChange={(event) => void updateRole(member.user_id, event.target.value as 'admin' | 'attendant' | 'viewer')}><option value="admin">Administrador</option><option value="attendant">Atendente</option><option value="viewer">Consulta</option></select> : <b>{roleLabel[member.role]}</b>}
      </article>)}
    </div>
  </section>;
}
