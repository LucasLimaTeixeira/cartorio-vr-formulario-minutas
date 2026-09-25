import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
type Role = 'admin' | 'attendant' | 'viewer';

async function hashCpf(cpf: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cpf.replace(/\D/g, '')));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cpfValido(valor: string) {
  const n = valor.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const digito = (tamanho: number) => {
    const soma = [...n.substring(0, tamanho)].reduce((total, d, i) => total + Number(d) * (tamanho + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(n[9]) && digito(10) === Number(n[10]);
}

const resposta = (corpo: Record<string, unknown>, status: number) => Response.json(corpo, { status, headers: corsHeaders });

// Cadastra o usuário direto no banco, já confirmado e com a senha inicial definida pelo Super Admin.
// Nenhum e-mail é enviado.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const [{ data: { user } }, { data: isSuperAdmin }] = await Promise.all([userClient.auth.getUser(), userClient.rpc('is_system_admin')]);
    if (!user || !isSuperAdmin) return resposta({ error: 'Sem permissão.' }, 403);

    const { workspaceId, nome, email, cpf, cargo, role, senha } = await request.json() as { workspaceId: string; nome: string; email: string; cpf: string; cargo: string; role: Role; senha: string };
    if (!workspaceId || !nome?.trim() || !email?.trim() || !cargo?.trim() || !['admin', 'attendant', 'viewer'].includes(role)) {
      return resposta({ error: 'Dados inválidos.' }, 400);
    }
    if (!cpfValido(cpf ?? '')) return resposta({ error: 'CPF inválido: confira os números digitados.' }, 400);
    if (!senha || senha.length < 12) return resposta({ error: 'A senha inicial deve ter pelo menos 12 caracteres.' }, 400);

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: subscription, error: subscriptionError }, { count, error: memberCountError }] = await Promise.all([
      adminClient.from('workspace_subscriptions').select('max_users').eq('workspace_id', workspaceId).maybeSingle(),
      adminClient.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    ]);
    if (subscriptionError || memberCountError || !subscription) return resposta({ error: 'Não foi possível validar o limite do cartório.' }, 400);
    if ((count ?? 0) >= subscription.max_users) return resposta({ error: `Este cartório atingiu o limite de ${subscription.max_users} usuários.` }, 400);

    const emailNormalizado = email.trim().toLowerCase();
    const { data: criado, error: createError } = await adminClient.auth.admin.createUser({
      email: emailNormalizado,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome.trim() },
    });
    if (createError || !criado.user) {
      const jaExiste = createError?.message?.toLowerCase().includes('already') || createError?.status === 422;
      return resposta({ error: jaExiste ? 'Já existe um usuário com este e-mail.' : createError?.message ?? 'Não foi possível cadastrar o usuário.' }, 400);
    }

    const userId = criado.user.id;
    const { error: profileError } = await adminClient.from('profiles').upsert({ id: userId, full_name: nome.trim(), email: emailNormalizado, cpf_hash: await hashCpf(cpf), cargo: cargo.trim(), updated_at: new Date().toISOString() });
    const { error: membershipError } = profileError ? { error: null } : await adminClient.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: userId, role });
    if (profileError || membershipError) {
      // Sem perfil ou vínculo o usuário ficaria órfão: desfaz o cadastro para poder tentar de novo.
      await adminClient.auth.admin.deleteUser(userId);
      return resposta({ error: profileError?.message ?? membershipError?.message }, 400);
    }
    return resposta({ ok: true }, 201);
  } catch {
    return resposta({ error: 'Erro interno.' }, 500);
  }
});
