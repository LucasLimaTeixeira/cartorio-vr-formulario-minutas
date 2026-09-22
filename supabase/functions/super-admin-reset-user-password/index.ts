import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } },
    );
    const [{ data: { user } }, { data: isSuperAdmin }] = await Promise.all([
      userClient.auth.getUser(),
      userClient.rpc('is_system_admin'),
    ]);
    if (!user || !isSuperAdmin) return Response.json({ error: 'Sem permissão.' }, { status: 403, headers: corsHeaders });

    const { userId, password } = await request.json() as { userId?: string; password?: string };
    if (!userId || !password || password.length < 8) {
      return Response.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Erro interno.' }, { status: 500, headers: corsHeaders });
  }
});
