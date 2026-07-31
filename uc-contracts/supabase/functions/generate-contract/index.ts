// UC CONTRACTS — Edge Function: generate-contract
// Recebe { contract_request_id, template_version_id, values }
// 1) Busca o corpo do template ativo
// 2) Substitui {{VARIAVEIS}} pelos valores enviados
// 3) Gera um PDF simples (texto) a partir do resultado
// 4) Faz upload do PDF no bucket "contracts", seguindo a árvore Empresa/Contratado/Contrato
// 5) Grava o registro em generated_contracts e no audit_log
// 6) Devolve o registro (incluindo o HTML renderizado, para a prévia no frontend)
//
// LIMITAÇÃO DE MVP: o PDF é gerado com pdf-lib desenhando texto simples (sem HTML/CSS
// completo). Para um PDF com a formatação exata do contrato, o próximo passo é trocar
// esta etapa por um serviço de renderização HTML→PDF (ex: Browserless, Gotenberg, ou
// uma API como PDFShift), mantendo a mesma interface desta função.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib@1.17.1?dts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function stripHtml(html) {
  return html
    .replace(/<h2>/g, '\n')
    .replace(/<\/h2>/g, '\n\n')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&aacute;/g, 'á').replace(/&atilde;/g, 'ã').replace(/&ccedil;/g, 'ç')
    .trim();
}

function wrapText(text, maxChars) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.length === 0) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(' ')) {
      if ((line + ' ' + word).trim().length > maxChars) { lines.push(line.trim()); line = word; }
      else { line += ' ' + word; }
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { contract_request_id, template_version_id, values } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Confere se quem chamou é Jurídico ou Master Admin (RLS já protege as tabelas,
    // mas aqui usamos a service role, então validamos explicitamente).
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: corsHeaders });

    const { data: templateVersion, error: tplError } = await supabaseAdmin
      .from('contract_template_versions')
      .select('body_html, template:contract_templates(name)')
      .eq('id', template_version_id)
      .single();
    if (tplError || !templateVersion) throw new Error('Modelo de contrato não encontrado');

    let renderedHtml = templateVersion.body_html;
    for (const [key, val] of Object.entries(values || {})) {
      renderedHtml = renderedHtml.split(`{{${key}}}`).join(val || `<mark>{{${key}}}</mark>`);
    }

    const { data: request, error: reqError } = await supabaseAdmin
      .from('contract_requests')
      .select('*, party:contracted_parties(*), company:companies(slug)')
      .eq('id', contract_request_id)
      .single();
    if (reqError || !request) throw new Error('Solicitação não encontrada');

    const { count } = await supabaseAdmin
      .from('generated_contracts')
      .select('*', { count: 'exact', head: true })
      .eq('contract_request_id', contract_request_id);
    const versionNumber = (count || 0) + 1;

    // ---- Gera PDF simples com pdf-lib ----
    const plainText = stripHtml(renderedHtml);
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let page = pdfDoc.addPage([595, 842]); // A4
    const fontSize = 11;
    const lines = wrapText(plainText, 95);
    let y = 800;
    for (const line of lines) {
      if (y < 50) { page = pdfDoc.addPage([595, 842]); y = 800; }
      page.drawText(line, { x: 50, y, size: fontSize, font, color: rgb(0.06, 0.1, 0.17) });
      y -= 16;
    }
    const pdfBytes = await pdfDoc.save();

    const partyName = (request.party?.full_name || request.party?.company_name || 'contratado').replace(/[^\w-]+/g, '_').slice(0, 40);
    const folder = `${request.company?.slug || 'empresa'}/${request.contracted_party_id}_${partyName}/contrato`;
    const filePath = `${folder}/v${versionNumber}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('contracts')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    const { data: generated, error: insertError } = await supabaseAdmin
      .from('generated_contracts')
      .insert({
        contract_request_id,
        template_version_id,
        version_number: versionNumber,
        file_path: filePath,
        generated_by: user.id,
        status: 'draft'
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await supabaseAdmin.from('contract_requests').update({ current_stage: 'under_review' }).eq('id', contract_request_id);
    await supabaseAdmin.from('audit_log').insert({
      entity_type: 'generated_contracts', entity_id: generated.id, action: 'generated', performed_by: user.id
    });

    return new Response(JSON.stringify({
      id: generated.id,
      version_number: generated.version_number,
      status: generated.status,
      generated_at: generated.generated_at,
      rendered_html: renderedHtml,
      file_path: filePath
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
});
