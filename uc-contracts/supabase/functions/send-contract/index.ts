// UC CONTRACTS — Edge Function: send-contract
// Recebe { generated_contract_id, recipients?, cc?, bcc?, message? }
// 1) Gera uma URL assinada (temporária) para o PDF no bucket "contracts"
// 2) Envia e-mail via Resend com o link do contrato
// 3) Grava o despacho em contract_dispatches e atualiza o status do contrato/solicitação
//
// PRÉ-REQUISITO: configurar o secret RESEND_API_KEY no projeto Supabase:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
// (crie uma conta gratuita em resend.com e um domínio/remetente verificado)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { generated_contract_id, recipients = [], cc = [], bcc = [], message = '' } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: corsHeaders });

    const { data: contract, error: cError } = await supabaseAdmin
      .from('generated_contracts')
      .select('*, request:contract_requests(*, party:contracted_parties(email, full_name, company_name))')
      .eq('id', generated_contract_id)
      .single();
    if (cError || !contract) throw new Error('Contrato não encontrado');

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 60 * 60 * 24 * 7); // 7 dias
    if (urlError) throw urlError;

    const partyEmail = contract.request?.party?.email;
    const finalRecipients = recipients.length > 0 ? recipients : [partyEmail].filter(Boolean);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && finalRecipients.length > 0) {
      const emailResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'UC Contracts <contratos@ucnadv.com>', // troque pelo remetente verificado no Resend
          to: finalRecipients,
          cc, bcc,
          subject: 'Seu contrato está pronto — Ulysses Cabette Advogados',
          html: `<p>${message || 'Segue o link do seu contrato para revisão e assinatura.'}</p><p><a href="${signedUrlData.signedUrl}">Abrir contrato (PDF)</a></p>`
        })
      });
      if (!emailResp.ok) {
        const errText = await emailResp.text();
        console.error('Falha ao enviar e-mail via Resend:', errText);
      }
    }

    await supabaseAdmin.from('contract_dispatches').insert({
      generated_contract_id, recipients: finalRecipients, cc, bcc, message, sent_by: user.id
    });
    await supabaseAdmin.from('generated_contracts').update({ status: 'sent' }).eq('id', generated_contract_id);
    await supabaseAdmin.from('contract_requests').update({ current_stage: 'sent' }).eq('id', contract.contract_request_id);
    await supabaseAdmin.from('audit_log').insert({
      entity_type: 'generated_contracts', entity_id: generated_contract_id, action: 'sent', performed_by: user.id,
      metadata: { recipients: finalRecipients }
    });

    return new Response(JSON.stringify({ status: 'sent', recipients: finalRecipients, url: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
});
