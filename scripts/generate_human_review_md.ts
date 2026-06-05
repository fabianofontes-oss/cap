/**
 * generate_human_review_md.ts
 *
 * Reads content-review/human_review_required.csv and generates a clean
 * Markdown file for human or AI-assisted review.
 *
 * Does NOT apply any corrections. Read-only operation.
 *
 * Writes: content-review/human_review_required.md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');
const OUT_DIR    = resolve(ROOT, 'content-review');
const CSV_P      = resolve(OUT_DIR, 'human_review_required.csv');
const MD_P       = resolve(OUT_DIR, 'human_review_required.md');

// ─── Simple CSV parser (handles BOM + quoted fields) ───────────────────────
function parseLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(content: string): Record<string, string>[] {
  const text  = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

// ─── Markdown helpers ──────────────────────────────────────────────────────
function q(text: string): string {
  return text
    ? `> ${text.replace(/\n/g, '\n> ')}`
    : '> *(vazio)*';
}

function badge(decision: string, confidence: string): string {
  const icon = confidence === 'HIGH' ? '🟢' : confidence === 'MEDIUM' ? '🟡' : '🔴';
  return `${icon} **${decision}** (${confidence})`;
}

// ─── Main ──────────────────────────────────────────────────────────────────
function main() {
  if (!existsSync(CSV_P)) {
    console.error(`Missing: ${CSV_P}. Run "npx tsx scripts/ai_prefill_review.ts" first.`);
    process.exit(1);
  }

  const rows = parseCSV(readFileSync(CSV_P, 'utf8'));
  if (!rows.length) { console.error('CSV is empty.'); process.exit(1); }

  // Separate by group
  const p1    = rows.filter(r => r['priority'] === 'P1_EXACT_QUESTION_WRONG_ANSWER');
  const p2    = rows.filter(r => r['priority'] === 'P2_PACK_ANSWER_TRUNCATED');
  const p3    = rows.filter(r => r['priority'] === 'P3_NEAR_EXACT_WRONG_ANSWER');
  const total = rows.length;
  const needsExpert = rows.filter(r => r['aiSuggestedDecision'] === 'NEEDS_EXPERT').length;
  const mediums     = rows.filter(r => r['aiConfidence'] === 'MEDIUM').length;

  const lines: string[] = [];

  // ── Header & context ──────────────────────────────────────────────────────
  lines.push(`# Revisão Humana — CAP Master`);
  lines.push('');
  lines.push(`## Contexto`);
  lines.push('');
  lines.push('- **Fonte principal:** PDF da autoescola (`3500 preguntas cap.pdf` — Ministério de Transporte de Espanha).');
  lines.push('- **Fonte secundária:** pack atual (`questions-v1.json`, 5.554 perguntas de origem diversa).');
  lines.push('- **Objetivo:** decidir quais respostas devem ser corrigidas no pack antes de gerar `questions-v2.json`.');
  lines.push('- **Nenhuma correção foi aplicada ainda.** Este ficheiro é apenas para revisão.');
  lines.push('');

  // ── Summary ───────────────────────────────────────────────────────────────
  lines.push(`## Resumo`);
  lines.push('');
  const decided   = rows.filter(r => r['reviewerDecision']?.trim()).length;
  const dPdf      = rows.filter(r => r['reviewerDecision'] === 'ACCEPT_PDF_ANSWER').length;
  const dPack     = rows.filter(r => r['reviewerDecision'] === 'ACCEPT_PACK_ANSWER').length;
  const dExpert   = rows.filter(r => r['reviewerDecision'] === 'NEEDS_EXPERT').length;
  const dSkip     = rows.filter(r => r['reviewerDecision'] === 'SKIP').length;
  const dPending  = total - decided;

  lines.push(`- **Total de itens:** ${total}`);
  lines.push(`- **Decisões preenchidas:** ${decided} / ${total}`);
  lines.push(`- **Sem decisão (pendentes):** ${dPending}`);
  lines.push('');
  lines.push(`### Decisões do revisor`);
  lines.push('');
  lines.push(`| Decisão | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| ✅ \`ACCEPT_PDF_ANSWER\` | **${dPdf}** |`);
  lines.push(`| 🔵 \`ACCEPT_PACK_ANSWER\` | **${dPack}** |`);
  lines.push(`| 🔴 \`NEEDS_EXPERT\` | **${dExpert}** |`);
  lines.push(`| ⏭️ \`SKIP\` | **${dSkip}** |`);
  lines.push('');
  lines.push(`### Classificação da IA`);
  lines.push('');
  lines.push(`- **NEEDS_EXPERT (IA):** ${needsExpert}`);
  lines.push(`- **ACCEPT_PDF_ANSWER MEDIUM (IA):** ${mediums - needsExpert}`);
  lines.push(`- **P1 — Pergunta idêntica, resposta diferente:** ${p1.length}`);
  lines.push(`- **P2 — Resposta truncada no pack:** ${p2.length}`);
  lines.push(`- **P3 — Pergunta quase idêntica, resposta diferente:** ${p3.length}`);
  lines.push('');

  // ── Instructions ──────────────────────────────────────────────────────────
  lines.push(`## Instruções de decisão`);
  lines.push('');
  lines.push('Para cada item, preencher o campo **`Decisão do revisor`** com um dos valores:');
  lines.push('');
  lines.push('| Valor | Quando usar |');
  lines.push('|---|---|');
  lines.push('| `ACCEPT_PDF_ANSWER` | A resposta do PDF é a correta. Corrigir o pack. |');
  lines.push('| `ACCEPT_PACK_ANSWER` | A resposta do pack está correta. PDF pode ser variante. |');
  lines.push('| `NEEDS_EXPERT` | Não há certeza. Requer especialista em transporte / CAP. |');
  lines.push('| `SKIP` | Deixar sem alterar por ora. |');
  lines.push('');
  lines.push('> **Regra editorial:** quando em dúvida, o PDF tem prioridade como fonte oficial.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Items ─────────────────────────────────────────────────────────────────
  lines.push(`## Itens para revisão`);
  lines.push('');

  let idx = 0;

  // Helper to write one item block
  function writeItem(r: Record<string, string>, num: number): void {
    const pri  = r['priority'] ?? '';
    const tag  = pri === 'P1_EXACT_QUESTION_WRONG_ANSWER' ? 'P1'
               : pri === 'P2_PACK_ANSWER_TRUNCATED'       ? 'P2'
               : 'P3';

    const pdfIdx  = r['pdfIndex']   ?? '';
    const packId  = r['packId']     ?? '';
    const cat     = r['category']   ?? '';
    const aiSug   = r['aiSuggestedDecision'] ?? '';
    const aiConf  = r['aiConfidence']        ?? '';
    const aiReason = r['aiReason']           ?? '';

    // Question and answers vary by P1/P2/P3
    const question   = r['question']  || r['pdfQuestion']  || '';
    const packQ      = r['packQuestion'] ?? '';
    const pdfAns     = r['pdfAnswer'] || r['fullPdfAnswer'] || '';
    const packAns    = r['packAnswer'] || r['truncatedPackAnswer'] || '';

    lines.push(`### Item ${num} — ${tag} | PDF #${pdfIdx} | \`${packId}\` | ${cat}`);
    lines.push('');

    if (tag === 'P3' && packQ && packQ !== question) {
      lines.push(`**Pergunta no PDF:**  `);
      lines.push(`> ${question}`);
      lines.push('');
      lines.push(`**Pergunta no Pack:**  `);
      lines.push(`> ${packQ}`);
    } else {
      lines.push(`**Pergunta:**  `);
      lines.push(`> ${question}`);
    }
    lines.push('');

    if (tag === 'P2') {
      lines.push(`**Resposta completa no PDF (fonte principal):**  `);
      lines.push(q(pdfAns));
      lines.push('');
      lines.push(`**Resposta truncada no Pack ⚠️:**  `);
      lines.push(q(packAns));
    } else {
      lines.push(`**Resposta no PDF (fonte principal):**  `);
      lines.push(q(pdfAns));
      lines.push('');
      lines.push(`**Resposta no Pack:**  `);
      lines.push(q(packAns));
    }
    lines.push('');
    lines.push(`**Sugestão da IA:** ${badge(aiSug, aiConf)}  `);
    lines.push(`**Motivo:** ${aiReason}`);
    lines.push('');
    const decision = r['reviewerDecision']?.trim() ?? '';
    if (decision) {
      const icon = decision === 'ACCEPT_PDF_ANSWER'  ? '✅'
                 : decision === 'ACCEPT_PACK_ANSWER' ? '🔵'
                 : decision === 'NEEDS_EXPERT'       ? '🔴'
                 : decision === 'SKIP'               ? '⏭️'
                 : '❓';
      lines.push(`**Decisão do revisor:** ${icon} \`${decision}\``);
    } else {
      lines.push(`**Decisão do revisor:** \`_______________\``);
    }
    lines.push('');
    lines.push(`**Notas:** *(opcional)*`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // ── NEEDS_EXPERT first (highest urgency) ──────────────────────────────────
  const needsExpertRows = rows.filter(r => r['aiSuggestedDecision'] === 'NEEDS_EXPERT');
  if (needsExpertRows.length) {
    lines.push(`### 🔴 Grupo: NEEDS_EXPERT (${needsExpertRows.length} itens — revisão obrigatória)`);
    lines.push('');
    lines.push('> Estes itens a IA **não consegue decidir** com segurança. São perguntas MCQ onde o pack pode ter tido');
    lines.push('> um conjunto de opções diferente do PDF, ou variantes complexas. Requerem julgamento humano.');
    lines.push('');
    needsExpertRows.forEach(r => writeItem(r, ++idx));
  }

  // ── MEDIUM P1 ──────────────────────────────────────────────────────────────
  const medP1 = p1.filter(r => r['aiConfidence'] === 'MEDIUM');
  if (medP1.length) {
    lines.push(`### 🟡 Grupo: P1 — Pergunta idêntica, resposta diferente — Confiança MEDIUM (${medP1.length} itens)`);
    lines.push('');
    lines.push('> A IA sugere **ACCEPT_PDF_ANSWER** mas pede confirmação: respostas têm sobreposição parcial');
    lines.push('> ou são frases curtas onde pode haver sinónimos válidos.');
    lines.push('');
    medP1.forEach(r => writeItem(r, ++idx));
  }

  // ── MEDIUM P2 (should be 0, all P2 are HIGH, but just in case) ────────────
  const medP2 = p2.filter(r => r['aiConfidence'] === 'MEDIUM');
  if (medP2.length) {
    lines.push(`### 🟡 Grupo: P2 — Resposta truncada — Confiança MEDIUM (${medP2.length} itens)`);
    lines.push('');
    medP2.forEach(r => writeItem(r, ++idx));
  }

  // ── MEDIUM P3 ──────────────────────────────────────────────────────────────
  const medP3 = p3.filter(r => r['aiConfidence'] === 'MEDIUM');
  if (medP3.length) {
    lines.push(`### 🟡 Grupo: P3 — Pergunta quase idêntica, resposta diferente — Confiança MEDIUM (${medP3.length} itens)`);
    lines.push('');
    lines.push('> Perguntas com redação ligeiramente diferente (sim ≥ 0.95). A IA sugere PDF como referência');
    lines.push('> mas o contexto pode variar. Confirmar manualmente.');
    lines.push('');
    medP3.forEach(r => writeItem(r, ++idx));
  }

  // ── LOW confidence catch-all ───────────────────────────────────────────────
  const lowRows = rows.filter(r => r['aiConfidence'] === 'LOW' && r['aiSuggestedDecision'] !== 'NEEDS_EXPERT');
  if (lowRows.length) {
    lines.push(`### 🔴 Grupo: Confiança LOW (${lowRows.length} itens)`);
    lines.push('');
    lowRows.forEach(r => writeItem(r, ++idx));
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  lines.push(`---`);
  lines.push('');
  lines.push(`## Próximo passo`);
  lines.push('');
  lines.push('1. Preencher cada `Decisão do revisor` neste ficheiro ou no `human_review_required.csv`.');
  lines.push('2. Itens com `aiConfidence = HIGH` (112 ao total) **não precisam de revisão manual** — podem ser aprovados em lote.');
  lines.push('3. Após revisão, executar `scripts/apply_content_corrections.ts` (a criar) para gerar `questions-v2.json`.');
  lines.push('4. Nenhuma alteração é aplicada até esse script ser executado manualmente.');
  lines.push('');
  lines.push(`*Gerado em: ${new Date().toISOString()} — Nenhuma correção foi aplicada.*`);

  // ── Write ─────────────────────────────────────────────────────────────────
  writeFileSync(MD_P, lines.join('\n'), 'utf8');

  console.log(`\n✓ content-review/human_review_required.md`);
  console.log(`  Total items: ${total}`);
  console.log(`  NEEDS_EXPERT: ${needsExpert}`);
  console.log(`  MEDIUM: ${mediums}`);
  console.log(`  File size: ${(lines.join('\n').length / 1024).toFixed(1)} KB`);
}

main();
