import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
type Role = 'admin' | 'attendant' | 'viewer';

async function hashCpf(cpf: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cpf.replace(/\D/g, '')));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await userClient.auth.getUser();
    const { data: isSuperAdmin } = await userClient.rpc('is_system_admin');
    if (!user || !isSuperAdmin) return Response.json({ error: 'Sem permissão.' }, { status: 403, headers: corsHeaders });

    const { workspaceId, nome, email, cpf, cargo, role } = await request.json() as { workspaceId: string; nome: string; email: string; cpf: string; cargo: string; role: Role };
    if (!workspaceId || !nome?.trim() || !email?.trim() || !/^\d{11}$/.test(cpf.replace(/\D/g, '')) || !cargo?.trim() || !['admin', 'attendant', 'viewer'].includes(role)) {
      return Response.json({ error: 'Dados inválidos.' }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), { data: { full_name: nome.trim() } });
    if (inviteError || !invitation.user) return Response.json({ error: inviteError?.message ?? 'Não foi possível enviar o convite.' }, { status: 400, headers: corsHeaders });

    const userId = invitation.user.id;
    const { error: profileError } = await adminClient.from('profiles').upsert({ id: userId, full_name: nome.trim(), email: email.trim().toLowerCase(), cpf_hash: await hashCpf(cpf), cargo: cargo.trim(), updated_at: new Date().toISOString() });
    const { error: membershipError } = await adminClient.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: userId, role });
    if (profileError || membershipError) return Response.json({ error: profileError?.message ?? membershipError?.message }, { status: 400, headers: corsHeaders });
    return Response.json({ ok: true }, { status: 201, headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Erro interno.' }, { status: 500, headers: corsHeaders });
  }
});
