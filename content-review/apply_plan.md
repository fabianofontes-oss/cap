# Plano Técnico de Aplicação de Correções — CAP Master

> **Estado:** Plano apenas. Nenhuma correção foi aplicada.  
> **Gerado em:** 2026-06-05  
> **Fonte de verdade:** `content-review/human_review_required.csv` (73 itens revistos por humano)

---

## 1. Arquivos de entrada

| Arquivo | Itens | Conteúdo |
|---|---|---|
| `content-review/p1_exact_question_wrong_answer.csv` | 145 | Perguntas idênticas, resposta diferente |
| `content-review/p2_truncated_answers.csv` | 16 | Respostas truncadas no pack |
| `content-review/p3_near_exact_wrong_answer.csv` | 24 | Perguntas quase idênticas, resposta diferente |
| `content-review/human_review_required.csv` | 73 | Decisões do revisor humano |
| `public/data/questions-v1.json` | 5 554 | Pack atual (fonte a ser corrigida — **leitura apenas**) |

**Regra de prioridade:** se um `packId` aparecer tanto no lote HIGH da IA como no CSV de revisão humana, a **decisão humana tem precedência**.

---

## 2. Decisões aplicáveis

### `ACCEPT_PDF_ANSWER`
- A resposta do PDF é a correta.
- Ação: encontrar no pack a opção cujo texto melhor corresponde ao `pdfAnswer` e marcar `isCorrect = true`; desmarcar as restantes.
- Caso nenhuma opção do pack corresponda (sim < 0.55): substituir o texto da opção atualmente marcada como correta pelo texto do PDF.
- Para P2 (truncado): atualizar o texto da opção truncada com o texto completo do PDF.

### `ACCEPT_PACK_ANSWER`
- A resposta do pack é considerada correta.
- Ação: **nenhuma alteração** ao pack. Apenas registo no log.

---

## 3. Decisões que NÃO serão aplicadas

| Decisão | Motivo |
|---|---|
| `NEEDS_EXPERT` | Requer especialista em transporte/CAP. Não há certeza suficiente. |
| `SKIP` | Explicitamente excluído pelo revisor. |
| *(vazio)* | Sem decisão registada — não tocar. |

---

## 4. Garantias de segurança

| Regra | Detalhe |
|---|---|
| **`questions-v1.json` não é alterado** | O script lê `v1` apenas como fonte; escreve exclusivamente para `questions-v2.json` |
| **`questions-v2.json` é arquivo separado** | Criado em `public/data/questions-v2.json`; não referenciado pelo app até `data-manifest.json` ser atualizado manualmente |
| **`data-manifest.json` não é alterado automaticamente** | A troca de `v1` → `v2` no manifest é um passo manual e deliberado, feito após validação |
| **Log de correções gerado** | `content-review/corrections_log.json` — entrada por entrada, com status e justificativa |
| **Resumo gerado** | `content-review/corrections_summary.json` — totais por tipo de correção |
| **Firestore não é tocado** | Nenhum script de aplicação interage com Firestore |
| **App não é alterado** | Nenhum ficheiro em `src/` é modificado |

---

## 5. Estimativa de correções se o plano fosse executado

### 5.1 Lote HIGH — pré-aprovado pela IA (sem revisão humana necessária)

| Grupo | Total no grupo | HIGH (pré-aprovados) |
|---|---|---|
| P1 — Pergunta idêntica, resposta diferente | 145 | **96** |
| P2 — Resposta truncada | 16 | **16** |
| P3 — Pergunta quase idêntica | 24 | **0** ¹ |
| **Subtotal HIGH** | **185** | **112** |

> ¹ Todos os P3 tinham `humanNeedsReview = true` — nenhum passou pelo lote automático.

### 5.2 Revisão humana — 73 itens

| Decisão | Count | Ação |
|---|---|---|
| `ACCEPT_PDF_ANSWER` | **60** | Corrige pack (troca opção correta ou substitui texto) |
| `ACCEPT_PACK_ANSWER` | **6** | Sem alteração (pack já correto) |
| `NEEDS_EXPERT` | **7** | Ignorado — sem alteração |

### 5.3 Totais consolidados

| Categoria | Count |
|---|---|
| **Correções que alteram o pack** | **172** |
| — P2 fix texto truncado (HIGH) | 16 |
| — P1/P3 troca opção correta (HIGH) | 96 |
| — P1/P3 troca opção correta (humano ACCEPT_PDF) | 60 |
| **Sem alteração (pack já correto)** | **6** |
| **Ignorados (NEEDS_EXPERT)** | **7** |
| **Total de decisões processadas** | **185** |

> **Nota sobre os 172:** alguns podem ser do tipo `REPLACE_OPTION_TEXT` — quando nenhuma das 4 opções do pack corresponde ao texto do PDF, o texto da opção atualmente (errada) marcada como correta é substituído pelo texto do PDF. Isso garante que a resposta certa exista como opção no quiz.

---

## 6. Passos para execução (quando autorizado)

```
1. Revisar e confirmar este plano.
2. Criar scripts/apply_content_corrections.ts conforme spec abaixo.
3. Executar: npx tsx scripts/apply_content_corrections.ts
4. Verificar public/data/questions-v2.json e content-review/corrections_log.json.
5. Testar o app localmente apontando para questions-v2.json.
6. Apenas após validação: atualizar data-manifest.json manualmente para apontar para v2.
7. Commit e deploy.
```

### Spec do script (resumo)

```
Input:
  - public/data/questions-v1.json
  - content-review/p1_*.csv, p2_*.csv, p3_*.csv
  - content-review/human_review_required.csv

Lógica:
  1. Parsear MD human_review_required.md → item_num → packId (mapeamento correto de ordem)
  2. Construir mapa packId → decisão_final (human override AI)
  3. Para cada ACCEPT_PDF_ANSWER:
     a. Localizar pergunta no pack por packId
     b. Encontrar opção com maior similaridade ao pdfAnswer (limiar 0.55)
     c. Se encontrada: marcar isCorrect=true, desmarcar as outras
     d. Se não encontrada: substituir texto da opção atualmente correta pelo pdfAnswer
  4. Para P2 ACCEPT_PDF_ANSWER:
     a. Encontrar opção truncada por similaridade
     b. Substituir text.es com fullPdfAnswer
  5. Para ACCEPT_PACK_ANSWER: registar no log, sem alteração
  6. Para NEEDS_EXPERT / vazio: saltar, registar no log

Output:
  - public/data/questions-v2.json  (NUNCA sobrescreve v1)
  - content-review/corrections_log.json
  - content-review/corrections_summary.json
```

---

*Este documento é apenas um plano. Nenhuma correção foi aplicada. Nenhum arquivo de app foi modificado.*
