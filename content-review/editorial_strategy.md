# Estratégia Editorial — CAP Master Content Review

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
A pergunta existe no pack com texto idêntico, mas a opção marcada como `isCorrect`
difere da resposta oficial do PDF. Isso significa que alunos que usam o app
podem estar aprendendo a resposta errada.

**Estratégia:** PDF tem prioridade. Salvo exceção justificada, usar `ACCEPT_PDF_ANSWER`.

**Arquivo:** `content-review/p1_exact_question_wrong_answer.csv`

---

### 2. P2 — Respostas truncadas no pack (16 casos) ← REVISAR EM SEGUIDA

**Por quê é prioritário:**  
As respostas no pack foram cortadas no meio da frase durante a importação (bug).
O texto completo está disponível no PDF.

**Estratégia:** Substituir pelo texto completo do PDF após confirmação visual.
Usar `ACCEPT_PDF_ANSWER`.

**Arquivo:** `content-review/p2_truncated_answers.csv`

---

### 3. P3 — Pergunta quase idêntica, resposta diferente (24 casos) ← REVISAR DEPOIS

**Por quê requer cuidado:**  
A pergunta tem redação levemente diferente (sim ≥ 0.95 < 1.0). Pode ser:
- Variante legítima da mesma pergunta com resposta diferente válida;
- Pergunta do pack que foi editada e mudou de significado.

**Estratégia:** Revisão manual comparando contexto. Não assumir PDF automaticamente.
Usar `MANUAL_VARIANT_REVIEW` → decidir caso a caso.

**Arquivo:** `content-review/p3_near_exact_wrong_answer.csv`

---

### 4. REAL_NOT_FOUND — Perguntas ausentes do pack (1.675 casos) ← ETAPA SEPARADA

**O que são:**  
Perguntas presentes no PDF mas não encontradas no pack atual, mesmo com algoritmo
melhorado. Representam ~49% das perguntas do PDF sem cobertura.

**Estratégia futura (não executar ainda):**
- Revisar amostra para validar que são perguntas reais e não duplicatas com redação diferente;
- Decidir quais importar para o `questions-v2.json`;
- Nunca importar automaticamente sem validação editorial.

**Arquivo de referência:** `audit-results/autoescola_pdf_vs_pack/recheck_not_found.json`

---

## Valores de reviewerDecision

| Valor | Quando usar |
|---|---|
| `ACCEPT_PDF_ANSWER` | Resposta do PDF é claramente correta ou mais completa |
| `ACCEPT_PACK_ANSWER` | Resposta do pack está correta e PDF pode ter variante |
| `DISCARD` | Pergunta não deve constar no pack (ambígua, errada, fora de escopo) |
| `NEEDS_EXPERT` | Requer avaliação de especialista em transporte/CAP |
| `SKIP` | Deixar sem alterar por ora (decidir em iteração futura) |

---

## O Que NÃO Fazer

- **Não** corrigir automaticamente sem `reviewerDecision` preenchido.
- **Não** importar as 1.675 ausentes sem revisão editorial.
- **Não** gerar `questions-v2.json` antes de concluir a revisão dos P1 e P2.
- **Não** alterar `questions-v1.json` diretamente.
- **Não** alterar o Firestore ou o app.

---

## Fluxo Esperado

```
1. Revisor preenche reviewerDecision nos CSVs (P1 → P2 → P3)
2. Script apply_content_corrections.ts (não criado ainda) lê os CSVs revisados
3. Gera questions-v2.json com correções aplicadas
4. Novo audit confirma que conflitos foram resolvidos
5. Etapa separada: importar REAL_NOT_FOUND validados → questions-v2 ou v3
```

---

*Gerado em: 2026-06-05T13:35:49.234Z*  
*Nenhuma correção foi aplicada automaticamente.*
