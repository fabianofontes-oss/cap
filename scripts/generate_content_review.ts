/**
 * generate_content_review.ts
 *
 * Generates manual review files for content quality issues found in the audit.
 * Does NOT modify any app files, Firestore, or data packs.
 *
 * Reads:
 *   audit-results/autoescola_pdf_vs_pack/recheck_conflicts.json
 *
 * Writes:
 *   content-review/p1_exact_question_wrong_answer.csv
 *   content-review/p2_truncated_answers.csv
 *   content-review/p3_near_exact_wrong_answer.csv
 *   content-review/review_summary.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const CONFLICTS_P  = resolve(ROOT, 'audit-results/autoescola_pdf_vs_pack/recheck_conflicts.json');
const OUT_DIR      = resolve(ROOT, 'content-review');

// ─── CSV helper ────────────────────────────────────────────────────────────
function esc(v: unknown): string {
  if (v == null) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

function writeCSV(path: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) { writeFileSync(path, '', 'utf8'); return; }
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.map(esc).join(','),
    ...rows.map(r => keys.map(k => esc(r[k])).join(',')),
  ];
  writeFileSync(path, '\uFEFF' + lines.join('\r\n'), 'utf8'); // BOM for Excel
  console.log(`  ✓ ${path.replace(ROOT + '\\', '')}  (${rows.length} rows)`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
function main() {
  if (!existsSync(CONFLICTS_P)) {
    console.error(`Missing: ${CONFLICTS_P}`);
    console.error('Run "npm run audit:recheck" first.');
    process.exit(1);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const conflicts: Record<string, unknown>[] = JSON.parse(readFileSync(CONFLICTS_P, 'utf8'));

  // ── P1: exact question, wrong answer (sim = 1.0, REAL_ANSWER_CONFLICT) ────
  const p1 = conflicts
    .filter(r => r['conflictType'] === 'REAL_ANSWER_CONFLICT' && r['similarity'] === 1)
    .map(r => ({
      priority:            'P1_EXACT_QUESTION_WRONG_ANSWER',
      pdfIndex:            r['pdfNumber'],
      packId:              r['packId'],
      category:            r['packCategory'],
      question:            r['pdfQuestion'],
      pdfAnswer:           r['pdfAnswerText'],
      packAnswer:          r['packCorrectText'],
      sourcePriority:      'PDF_AUTOESCOLA_PRIMARY',
      recommendedAction:   'prefer_pdf_answer_review_required',
      reviewerDecision:    '',
      notes:               '',
    }));

  // ── P2: truncated pack answers ────────────────────────────────────────────
  const p2 = conflicts
    .filter(r => r['conflictType'] === 'PACK_ANSWER_TRUNCATED')
    .map(r => ({
      priority:             'P2_PACK_ANSWER_TRUNCATED',
      pdfIndex:             r['pdfNumber'],
      packId:               r['packId'],
      category:             r['packCategory'],
      question:             r['pdfQuestion'],
      truncatedPackAnswer:  r['packCorrectText'],
      fullPdfAnswer:        r['pdfAnswerText'],
      sourcePriority:       'PDF_AUTOESCOLA_PRIMARY_TRUNCATED_FIX',
      recommendedAction:    'prefer_pdf_answer_review_required',
      reviewerDecision:     '',
      notes:                '',
    }));

  // ── P3: near-exact question (sim >= 0.95 < 1.0), wrong answer ─────────────
  const p3 = conflicts
    .filter(r =>
      r['conflictType'] === 'REAL_ANSWER_CONFLICT' &&
      typeof r['similarity'] === 'number' &&
      (r['similarity'] as number) >= 0.95 &&
      (r['similarity'] as number) < 1
    )
    .map(r => ({
      priority:           'P3_NEAR_EXACT_WRONG_ANSWER',
      pdfIndex:           r['pdfNumber'],
      packId:             r['packId'],
      category:           r['packCategory'],
      similarity:         r['similarity'],
      pdfQuestion:        r['pdfQuestion'],
      packQuestion:       r['packQuestion'],
      pdfAnswer:          r['pdfAnswerText'],
      packAnswer:         r['packCorrectText'],
      sourcePriority:     'MANUAL_VARIANT_REVIEW',
      recommendedAction:  'manual_review_variant',
      reviewerDecision:   '',
      notes:              '',
    }));

  // ── Write CSVs ────────────────────────────────────────────────────────────
  console.log('\nGenerating content-review files...\n');
  writeCSV(resolve(OUT_DIR, 'p1_exact_question_wrong_answer.csv'), p1);
  writeCSV(resolve(OUT_DIR, 'p2_truncated_answers.csv'),           p2);
  writeCSV(resolve(OUT_DIR, 'p3_near_exact_wrong_answer.csv'),     p3);

  // ── Review summary JSON ───────────────────────────────────────────────────
  const summary = {
    generatedAt:            new Date().toISOString(),
    warning:                'Nenhuma correcao foi aplicada automaticamente. Todos os arquivos sao apenas para revisao manual.',
    sourcePriority: {
      primary:   'PDF_AUTOESCOLA',
      secondary: 'PACK_INTERNET',
      note:      'O PDF da autoescola e a fonte principal de validacao de conteudo. O pack atual e fonte complementar.',
    },
    reviewOrder: [
      'P1_EXACT_QUESTION_WRONG_ANSWER',
      'P2_TRUNCATED_ANSWERS',
      'P3_NEAR_EXACT_WRONG_ANSWER',
      'REAL_NOT_FOUND_CANDIDATES',
    ],
    sourcePdf:              'C:\\Users\\julia\\Desktop\\FABIANO\\Projetos\\capdocumentos\\3500 preguntas cap.pdf',
    sourcePack:             'public/data/questions-v1.json',
    sourceAudit:            'audit-results/autoescola_pdf_vs_pack/recheck_conflicts.json',
    totalP1:                p1.length,
    totalP2:                p2.length,
    totalP3:                p3.length,
    totalCriticalReviewItems: p1.length + p2.length + p3.length,
    realNotFoundCandidates: 1675,
    files: {
      p1:               'content-review/p1_exact_question_wrong_answer.csv',
      p2:               'content-review/p2_truncated_answers.csv',
      p3:               'content-review/p3_near_exact_wrong_answer.csv',
      editorialStrategy:'content-review/editorial_strategy.md',
    },
    reviewerDecision_values: [
      'ACCEPT_PDF_ANSWER  — usar a resposta do PDF como correta',
      'ACCEPT_PACK_ANSWER — manter a resposta do pack como correta',
      'DISCARD            — remover a pergunta do pack',
      'NEEDS_EXPERT       — requer revisao por especialista',
      'SKIP               — deixar sem alterar por ora',
    ],
    workflow: [
      '1. Abrir o CSV no Excel ou Google Sheets.',
      '2. Para cada linha, comparar pdfAnswer vs packAnswer.',
      '3. Lembrar: PDF e a referencia principal. Em caso de duvida, preferir ACCEPT_PDF_ANSWER.',
      '4. Preencher a coluna reviewerDecision com um dos valores acima.',
      '5. Adicionar comentario livre em notes se necessario.',
      '6. Salvar o arquivo sem renomear.',
      '7. Nenhuma alteracao sera aplicada ate que o script de correcao seja executado manualmente.',
    ],
  };

  writeFileSync(resolve(OUT_DIR, 'review_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(`  ✓ content-review/review_summary.json`);

  // ── Editorial strategy Markdown ───────────────────────────────────────────
  const strategy = `# Estratégia Editorial — CAP Master Content Review

## Fonte Principal vs Fonte Complementar

| Fonte | Papel | Prioridade |
|---|---|---|
| **PDF da Autoescola** (3500 preguntas cap.pdf) | Referência oficial de conteúdo | **PRIMÁRIA** |
| **Pack atual** (questions-v1.json, 5.554 perguntas) | Base complementar de origem diversa | Secundária |

O pack atual foi originado de diversas fontes da internet e pode conter respostas
imprecisas, truncadas ou desatualizadas em relação às respostas oficiais do ministério
de transporte presentes no PDF.

---

## Resultados da Auditoria

| Métrica | Valor |
|---|---|
| Perguntas reais no PDF | 3.422 |
| Cobertura do pack (revisada) | ~51,1% |
| REAL_NOT_FOUND (ausentes do pack) | 1.675 |
| REAL_ANSWER_CONFLICT | 187 |
| PACK_ANSWER_TRUNCATED | 16 |

---

## Ordem de Revisão

### 1. P1 — Pergunta idêntica, resposta diferente (145 casos) ← REVISAR PRIMEIRO

**Por quê é prioritário:**  
A pergunta existe no pack com texto idêntico, mas a opção marcada como \`isCorrect\`
difere da resposta oficial do PDF. Isso significa que alunos que usam o app
podem estar aprendendo a resposta errada.

**Estratégia:** PDF tem prioridade. Salvo exceção justificada, usar \`ACCEPT_PDF_ANSWER\`.

**Arquivo:** \`content-review/p1_exact_question_wrong_answer.csv\`

---

### 2. P2 — Respostas truncadas no pack (16 casos) ← REVISAR EM SEGUIDA

**Por quê é prioritário:**  
As respostas no pack foram cortadas no meio da frase durante a importação (bug).
O texto completo está disponível no PDF.

**Estratégia:** Substituir pelo texto completo do PDF após confirmação visual.
Usar \`ACCEPT_PDF_ANSWER\`.

**Arquivo:** \`content-review/p2_truncated_answers.csv\`

---

### 3. P3 — Pergunta quase idêntica, resposta diferente (24 casos) ← REVISAR DEPOIS

**Por quê requer cuidado:**  
A pergunta tem redação levemente diferente (sim ≥ 0.95 < 1.0). Pode ser:
- Variante legítima da mesma pergunta com resposta diferente válida;
- Pergunta do pack que foi editada e mudou de significado.

**Estratégia:** Revisão manual comparando contexto. Não assumir PDF automaticamente.
Usar \`MANUAL_VARIANT_REVIEW\` → decidir caso a caso.

**Arquivo:** \`content-review/p3_near_exact_wrong_answer.csv\`

---

### 4. REAL_NOT_FOUND — Perguntas ausentes do pack (1.675 casos) ← ETAPA SEPARADA

**O que são:**  
Perguntas presentes no PDF mas não encontradas no pack atual, mesmo com algoritmo
melhorado. Representam ~49% das perguntas do PDF sem cobertura.

**Estratégia futura (não executar ainda):**
- Revisar amostra para validar que são perguntas reais e não duplicatas com redação diferente;
- Decidir quais importar para o \`questions-v2.json\`;
- Nunca importar automaticamente sem validação editorial.

**Arquivo de referência:** \`audit-results/autoescola_pdf_vs_pack/recheck_not_found.json\`

---

## Valores de reviewerDecision

| Valor | Quando usar |
|---|---|
| \`ACCEPT_PDF_ANSWER\` | Resposta do PDF é claramente correta ou mais completa |
| \`ACCEPT_PACK_ANSWER\` | Resposta do pack está correta e PDF pode ter variante |
| \`DISCARD\` | Pergunta não deve constar no pack (ambígua, errada, fora de escopo) |
| \`NEEDS_EXPERT\` | Requer avaliação de especialista em transporte/CAP |
| \`SKIP\` | Deixar sem alterar por ora (decidir em iteração futura) |

---

## O Que NÃO Fazer

- **Não** corrigir automaticamente sem \`reviewerDecision\` preenchido.
- **Não** importar as 1.675 ausentes sem revisão editorial.
- **Não** gerar \`questions-v2.json\` antes de concluir a revisão dos P1 e P2.
- **Não** alterar \`questions-v1.json\` diretamente.
- **Não** alterar o Firestore ou o app.

---

## Fluxo Esperado

\`\`\`
1. Revisor preenche reviewerDecision nos CSVs (P1 → P2 → P3)
2. Script apply_content_corrections.ts (não criado ainda) lê os CSVs revisados
3. Gera questions-v2.json com correções aplicadas
4. Novo audit confirma que conflitos foram resolvidos
5. Etapa separada: importar REAL_NOT_FOUND validados → questions-v2 ou v3
\`\`\`

---

*Gerado em: ${new Date().toISOString()}*  
*Nenhuma correção foi aplicada automaticamente.*
`;

  writeFileSync(resolve(OUT_DIR, 'editorial_strategy.md'), strategy, 'utf8');
  console.log(`  ✓ content-review/editorial_strategy.md`);

  console.log('\n' + '─'.repeat(55));
  console.log(`P1  Exact question / wrong answer  : ${p1.length} items`);
  console.log(`P2  Truncated pack answers         : ${p2.length} items`);
  console.log(`P3  Near-exact / wrong answer      : ${p3.length} items`);
  console.log(`──────────────────────────────────────`);
  console.log(`    Total items for review          : ${p1.length + p2.length + p3.length}`);
  console.log('─'.repeat(55));
  console.log(`\nOutput folder: content-review/`);
  console.log('No data was modified.');
}

main();
