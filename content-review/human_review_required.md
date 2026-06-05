# Revisão Humana — CAP Master

## Contexto

- **Fonte principal:** PDF da autoescola (`3500 preguntas cap.pdf` — Ministério de Transporte de Espanha).
- **Fonte secundária:** pack atual (`questions-v1.json`, 5.554 perguntas de origem diversa).
- **Objetivo:** decidir quais respostas devem ser corrigidas no pack antes de gerar `questions-v2.json`.
- **Nenhuma correção foi aplicada ainda.** Este ficheiro é apenas para revisão.

## Resumo

- **Total de itens:** 73
- **Decisões preenchidas:** 73 / 73
- **Sem decisão (pendentes):** 0

### Decisões do revisor

| Decisão | Count |
|---|---|
| ✅ `ACCEPT_PDF_ANSWER` | **60** |
| 🔵 `ACCEPT_PACK_ANSWER` | **6** |
| 🔴 `NEEDS_EXPERT` | **7** |
| ⏭️ `SKIP` | **0** |

### Classificação da IA

- **NEEDS_EXPERT (IA):** 17
- **ACCEPT_PDF_ANSWER MEDIUM (IA):** 41
- **P1 — Pergunta idêntica, resposta diferente:** 49
- **P2 — Resposta truncada no pack:** 0
- **P3 — Pergunta quase idêntica, resposta diferente:** 24

## Instruções de decisão

Para cada item, preencher o campo **`Decisão do revisor`** com um dos valores:

| Valor | Quando usar |
|---|---|
| `ACCEPT_PDF_ANSWER` | A resposta do PDF é a correta. Corrigir o pack. |
| `ACCEPT_PACK_ANSWER` | A resposta do pack está correta. PDF pode ser variante. |
| `NEEDS_EXPERT` | Não há certeza. Requer especialista em transporte / CAP. |
| `SKIP` | Deixar sem alterar por ora. |

> **Regra editorial:** quando em dúvida, o PDF tem prioridade como fonte oficial.

---

## Itens para revisão

### 🔴 Grupo: NEEDS_EXPERT (17 itens — revisão obrigatória)

> Estes itens a IA **não consegue decidir** com segurança. São perguntas MCQ onde o pack pode ter tido
> um conjunto de opções diferente do PDF, ou variantes complexas. Requerem julgamento humano.

### Item 1 — P1 | PDF #45 | `q_94f45699` | Seguridad vial

**Pergunta:**  
> Señale la respuesta incorrecta.

**Resposta no PDF (fonte principal):**  
> Utilizando la inercia dinámica del vehículo, el desgaste de frenos aumenta.

**Resposta no Pack:**  
> La declaración amistosa de accidente consigue mayores indemnizaciones.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 2 — P1 | PDF #10 | `q_24c60192` | Geral

**Pergunta:**  
> ¿Cuál de las siguientes afirmaciones es falsa?

**Resposta no PDF (fonte principal):**  
> Reducir el consumo del vehículo es ecológico, pero con ello no se ahorra dinero.

**Resposta no Pack:**  
> Para llegar a reducir el consumo, hemos de tener en cuenta el uso correcto del vehículo.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 3 — P1 | PDF #24 | `q_00a18d48` | Mecánica y mantenimiento

**Pergunta:**  
> Cuando la presión de un neumático es inferior a la normal, ¿cuál de las siguientes respuestas es correcta?

**Resposta no PDF (fonte principal):**  
> Se incrementa el consumo de carburante.

**Resposta no Pack:**  
> El vehículo gana estabilidad.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 4 — P1 | PDF #36 | `q_f9e402a3` | Seguridad vial

**Pergunta:**  
> Señale la respuesta correcta respecto a la conducción con niebla.

**Resposta no PDF (fonte principal):**  
> Conectar las luces de cruce y las de antiniebla.

**Resposta no Pack:**  
> Es necesario disminuir la distancia de seguridad ya que así podemos aprovechar la luz del vehículo que va delante.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 5 — P1 | PDF #21 | `q_2e462af3` | Tacógrafo y tiempos

**Pergunta:**  
> ¿Cuál de las siguientes afirmaciones es correcta respecto a cómo puede tomarse el período de descanso diario normal?

**Resposta no PDF (fonte principal):**  
> Puede ser de 11 horas consecutivas o dividido en dos períodos, el primero de los cuales deberá tener una duración ininterrumpida mínima de 3 horas y el segundo una duración ininterrumpida mínima de 9 horas.

**Resposta no Pack:**  
> Exclusivamente puede ser de 11 horas consecutivas.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 6 — P1 | PDF #546 | `q_c4715a4f` | Geral

**Pergunta:**  
> En 4 horas y media de conducción, el conductor debe efectuar:

**Resposta no PDF (fonte principal):**  
> una pausa de, al menos, 15 minutos seguida de otra de, al menos, 30 minutos, intercaladas en el periodo de conducción.

**Resposta no Pack:**  
> una pausa de al menos 15 minutos intercalada en el periodo de conducción, seguida de otro de al menos 30 minutos al final.

**Sugestão da IA:** 🟡 **NEEDS_EXPERT** (MEDIUM)  
**Motivo:** Answers are similar (overlap 55%) but phrased differently. May be acceptable variant or subtle factual difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 7 — P1 | PDF #141 | `q_4832fca1` | Normativa de transportes

**Pergunta:**  
> ¿Cuál de las siguientes enfermedades no está reconocida como enfermedad profesional en el sector del transporte?

**Resposta no PDF (fonte principal):**  
> Parálisis facial.

**Resposta no Pack:**  
> Tortícolis producida por mirar al retrovisor externo con frecuencia.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 8 — P1 | PDF #49 | `q_592727ad` | Seguridad vial

**Pergunta:**  
> Señale la respuesta correcta respecto a los equipos de protección individual.

**Resposta no PDF (fonte principal):**  
> • Se pueden clasificar en función del riesgo que contrarrestan. • Se aplican para disminuir las lesiones del trabajador. • Se pueden clasificar en función de la parte del cuerpo que protegen. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Se pueden clasificar en función del riesgo que contrarrestan.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 9 — P1 | PDF #70 | `q_11eb01a9` | Seguridad vial

**Pergunta:**  
> Señale la afirmación incorrecta con relación al puesto de conducción.

**Resposta no PDF (fonte principal):**  
> El asiento debe estar lo más separado posible, aunque haya que estirarse.

**Resposta no Pack:**  
> El respaldo debe contar con reposacabezas.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** 🔵 `ACCEPT_PACK_ANSWER`

**Notas:** *(opcional)*

---

### Item 10 — P1 | PDF #79 | `q_f94140c2` | Geral

**Pergunta:**  
> ¿Cuál de las siguientes conductas no es correcta para trabajar de pie?

**Resposta no PDF (fonte principal):**  
> Es conveniente trabajar mejor sobre asfalto que sobre madera pues es más rígido.

**Resposta no Pack:**  
> Si hay que inclinarse, se flexionarán las rodillas.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** 🔵 `ACCEPT_PACK_ANSWER`

**Notas:** *(opcional)*

---

### Item 11 — P1 | PDF #23 | `q_b648f5a1` | Salud y ergonomía

**Pergunta:**  
> Señale la respuesta correcta respecto a la toma de alcohol:

**Resposta no PDF (fonte principal):**  
> Altera y disminuye las aptitudes para la conducción.

**Resposta no Pack:**  
> Sirve para combatir el frío.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 12 — P1 | PDF #24 | `q_94b61504` | Salud y ergonomía

**Pergunta:**  
> Señale la respuesta correcta respecto a los microsueños:

**Resposta no PDF (fonte principal):**  
> • Son una reacción del organismo ante el déficit de sueño. • Hacen que durante un brevísimo espacio de tiempo se pierda la conciencia respecto a la carretera. • Son los causantes de muchos accidentes que se producen en tramos rectos con salida de la vía y no tienen una explicación clara. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Son una defensa del organismo por no dormir.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 13 — P1 | PDF #87 | `q_93502fa3` | Carga y logística

**Pergunta:**  
> Ante una situación como la caída de carga sobre la vía, ¿qué actuaciones deben realizarse?

**Resposta no PDF (fonte principal):**  
> • Se deberá apartar el vehículo para evitar que, junto con la carga caída, acreciente el riego provocado. • Se deberá retirar o apartar el obstáculo. • Se deberá dejar lo más limpia posible la calzada. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Se deberá apartar el vehículo para evitar que, junto con la carga caída, acreciente el riego provocado.

**Sugestão da IA:** 🟡 **NEEDS_EXPERT** (MEDIUM)  
**Motivo:** Answers are similar (overlap 52%) but phrased differently. May be acceptable variant or subtle factual difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 14 — P1 | PDF #4 | `q_70e07174` | Geral

**Pergunta:**  
> En relación con la atención al cliente, ¿cuál de estas afirmaciones es correcta?

**Resposta no PDF (fonte principal):**  
> Se debe evitar interrumpir.

**Resposta no Pack:**  
> Mientras que se atiende al cliente, se puede uno distraer.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 15 — P1 | PDF #5 | `q_3a8649e2` | Geral

**Pergunta:**  
> ¿Cuál de estas afirmaciones es correcta?

**Resposta no PDF (fonte principal):**  
> • Son necesarias hojas de registro en el caso de tacógrafo analógico. • Es necesario papel para impresión en el tacógrafo digital. • Las respuestas A y C son correctas.

**Resposta no Pack:**  
> El accidente "in itinere" es el ocurrido en los desplazamientos de ida y vuelta al domicilio del trabajador.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Question asks to select from a list — pack may have had different option set. Cannot assume PDF answer maps to same option.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 16 — P3 | PDF #527 | `q_3978d89a` | Tacógrafo y tiempos

**Pergunta:**  
> ¿Cuántos modos de funcionamiento tiene un tacógrafo digital?

**Resposta no PDF (fonte principal):**  
> Cuatro.

**Resposta no Pack:**  
> Cuatro: operativo, de control, de calibrado y de empresa.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Near-identical question (sim=0.9655) with different but related answers (overlap 20%). Could be legitimate variant — requires subject-matter expert review.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 17 — P3 | PDF #31 | `q_3c6ce90f` | Geral

**Pergunta:**  
> Cuando los equipos de protección individual superen los controles estipulados, se deberá estampar sobre el producto…

**Resposta no PDF (fonte principal):**  
> el marcado CE que, en el caso de los equipos de categoría III, irá seguido del número de identificación del organismo notificado que haya participado en el procedimiento de evaluación de la conformidad.

**Resposta no Pack:**  
> las siglas "CE", que irán seguidas de un número de cuatro dígitos en el caso de los equipos de categoría III.

**Sugestão da IA:** 🔴 **NEEDS_EXPERT** (LOW)  
**Motivo:** Near-identical question (sim=0.9913) with different but related answers (overlap 21%). Could be legitimate variant — requires subject-matter expert review.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### 🟡 Grupo: P1 — Pergunta idêntica, resposta diferente — Confiança MEDIUM (36 itens)

> A IA sugere **ACCEPT_PDF_ANSWER** mas pede confirmação: respostas têm sobreposição parcial
> ou são frases curtas onde pode haver sinónimos válidos.

### Item 18 — P1 | PDF #159 | `q_45b42ef7` | Mecánica y mantenimiento

**Pergunta:**  
> ¿Dónde se encuentra situado el ralentizador hidrodinámico del tipo "retárder"?

**Resposta no PDF (fonte principal):**  
> A la salida de la caja de velocidades.

**Resposta no Pack:**  
> En el sistema de transmisión.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 19 — P1 | PDF #280 | `q_1da617e9` | Carga y logística

**Pergunta:**  
> Dependiendo de la presión que se ejerza sobre el pedal del acelerador, el conductor de un automóvil puede:

**Resposta no PDF (fonte principal):**  
> reducir el número de revoluciones del motor y, con ello, el consumo de carburante.

**Resposta no Pack:**  
> reducir el consumo de carburante.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 43%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 20 — P1 | PDF #290 | `q_bb80d114` | Mecánica y mantenimiento

**Pergunta:**  
> ¿Cómo se utiliza adecuadamente el sistema de frenado?

**Resposta no PDF (fonte principal):**  
> Pisando el pedal de freno progresivamente.

**Resposta no Pack:**  
> Deteniendo el vehículo lo más rápido posible.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 21 — P1 | PDF #307 | `q_764e46c6` | Mecánica y mantenimiento

**Pergunta:**  
> ¿Qué puede ocurrir si los frenos no son capaces de evacuar todo el calor que producen?

**Resposta no PDF (fonte principal):**  
> Pierde capacidad de frenado.

**Resposta no Pack:**  
> Pierden eficacia.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 22 — P1 | PDF #312 | `q_9d566615` | Mecánica y mantenimiento

**Pergunta:**  
> ¿Dónde se encuentra situado el ralentizador hidrodinámico del tipo "intárder"?

**Resposta no PDF (fonte principal):**  
> En el sistema de transmisión.

**Resposta no Pack:**  
> En la caja de velocidades.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 23 — P1 | PDF #17 | `q_0c4601e6` | Geral

**Pergunta:**  
> ¿Un uso correcto del vehículo puede llegar a reducir el consumo?

**Resposta no PDF (fonte principal):**  
> Sí.

**Resposta no Pack:**  
> Sólo en largos viajes.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 24 — P1 | PDF #241 | `q_bd745390` | Conducción racional

**Pergunta:**  
> Para reducir el consumo de carburante de un vehículo pesado se deben conocer los factores que influyen en él. Entre estos factores se encuentra:

**Resposta no PDF (fonte principal):**  
> el perfil de la carretera, el número de revoluciones del motor y la relación de marchas seleccionada en la caja de velocidades.

**Resposta no Pack:**  
> el perfil de la carretera, el tipo de conducción que realice el conductor y el número de revoluciones del motor.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 36%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 25 — P1 | PDF #243 | `q_2a3ae91f` | Mecánica y mantenimiento

**Pergunta:**  
> Para reducir el número de revoluciones por minuto del motor de combustión de un automóvil y, con ello, reducir el consumo de carburante, el conductor puede:

**Resposta no PDF (fonte principal):**  
> evitar, en lo posible, la utilización de relaciones de marchas cortas.

**Resposta no Pack:**  
> utilizar relaciones de marchas largas.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 25%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 26 — P1 | PDF #61 | `q_e67c951b` | Geral

**Pergunta:**  
> ¿Cómo se puede deshacer la posible escarcha acumulada en los vidrios del vehículo?

**Resposta no PDF (fonte principal):**  
> Con alcohol

**Resposta no Pack:**  
> Con zumos naturales.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 27 — P1 | PDF #67 | `q_dad69252` | Geral

**Pergunta:**  
> ¿Qué debe hacerse en el caso que se aparque el vehículo en una zona con riesgo de nevadas?

**Resposta no PDF (fonte principal):**  
> Levantar los limpiaparabrisas.

**Resposta no Pack:**  
> Utilizarse el freno de mano.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 28 — P1 | PDF #68 | `q_c7f98b18` | Seguridad vial

**Pergunta:**  
> ¿Por qué se tiene que lavar el vehículo cuando se ha circulado mucho sobre nieve?

**Resposta no PDF (fonte principal):**  
> Por el efecto corrosivo de la sal, que se utiliza en las carreteras, en la carrocería.

**Resposta no Pack:**  
> Por el efecto corrosivo de la nieve .

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 33%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 29 — P1 | PDF #100 | `q_6387ae2a` | Seguridad vial

**Pergunta:**  
> ¿En qué nivel de circulación se encuentra una vía en la que debe circularse con cadenas?

**Resposta no PDF (fonte principal):**  
> Rojo.

**Resposta no Pack:**  
> Negro.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** 🔵 `ACCEPT_PACK_ANSWER`

**Notas:** *(opcional)*

---

### Item 30 — P1 | PDF #101 | `q_66770bff` | Seguridad vial

**Pergunta:**  
> ¿En qué nivel de circulación se encuentra una vía que se considera intransitable por las circunstancias meteorológicas?

**Resposta no PDF (fonte principal):**  
> Negro.

**Resposta no Pack:**  
> Amarillo.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** 🔵 `ACCEPT_PACK_ANSWER`

**Notas:** *(opcional)*

---

### Item 31 — P1 | PDF #141 | `q_05c15bcc` | Geral

**Pergunta:**  
> Es una característica de la conducción defensiva:

**Resposta no PDF (fonte principal):**  
> mantener distancia de seguridad y reacción.

**Resposta no Pack:**  
> confiar siempre en la actuación de los demás.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 32 — P1 | PDF #149 | `q_4ffac97c` | Seguridad vial

**Pergunta:**  
> Ante la posible presencia de hielo, ¿qué zonas se deben evitar?

**Resposta no PDF (fonte principal):**  
> Las zonas sombrías.

**Resposta no Pack:**  
> Zonas de gran arboleda.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 25%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 33 — P1 | PDF #107 | `q_9b23cd45` | Documentación

**Pergunta:**  
> En relación con la cualificación inicial y la formación continua de los conductores, ¿en qué registro se anota la expedición del correspondiente certificado de aptitud profesional (CAP)?

**Resposta no PDF (fonte principal):**  
> En el Registro de Empresas y Actividades de Transporte.

**Resposta no Pack:**  
> En el Registro General del CAP.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 20%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** 🔵 `ACCEPT_PACK_ANSWER`

**Notas:** *(opcional)*

---

### Item 34 — P1 | PDF #300 | `q_31706a1f` | Documentación

**Pergunta:**  
> ¿Cuál es la finalidad de la formación continua para la renovación del certificado de aptitud profesional (CAP)?

**Resposta no PDF (fonte principal):**  
> Profundizar y revisar algunas de las materias impartidas en los cursos de formación inicial.

**Resposta no Pack:**  
> Profundizar y revisar los conocimientos adquiridos con la obtención del certificado de aptitud profesional acreditativo de la cualificación inicial.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 19%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 35 — P1 | PDF #333 | `q_78ba0c5b` | Tacógrafo y tiempos

**Pergunta:**  
> ¿Es obligatorio que el tacógrafo analógico registre los cortes de alimentación?

**Resposta no PDF (fonte principal):**  
> Sí, en los tacógrafos analógicos que funcionan mediante señales eléctricas transmitidas eléctricamente desde el sensor de distancia y velocidad.

**Resposta no Pack:**  
> Sí, pero sólo en los tacógrafos analógicos que reciben la información del sensor electrónicamente.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 18%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 36 — P1 | PDF #340 | `q_f18b7d47` | Tacógrafo y tiempos

**Pergunta:**  
> ¿De qué otra forma se llaman los punzones del tacógrafo analógico que registran los datos en los discos-diagrama?

**Resposta no PDF (fonte principal):**  
> Dispositivo marcador.

**Resposta no Pack:**  
> Indicador de registro.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 37 — P1 | PDF #410 | `q_f39d8b3e` | Normativa de transportes

**Pergunta:**  
> Un vehículo que realiza transporte privado complementario y lleva maquinaria que utiliza el conductor en el ejercicio de su profesión está:

**Resposta no PDF (fonte principal):**  
> del uso de tacógrafo siempre que no supere 7.500 kg de masa máxima autorizada, se desarrolle íntegramente en un radio de 100 km alrededor del centro de explotación de la empresa y la conducción del vehículo no sea la actividad principal del conductor.

**Resposta no Pack:**  
> exento del uso de tacógrafo siempre que no supere los 7.500 kg de masa máxima autorizada y no supere los 50 km de radio.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 40%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** 🔵 `ACCEPT_PACK_ANSWER`

**Notas:** *(opcional)*

---

### Item 38 — P1 | PDF #546 | `q_c4715a4f` | Geral

**Pergunta:**  
> En 4 horas y media de conducción, el conductor debe efectuar:

**Resposta no PDF (fonte principal):**  
> una pausa de, al menos, 15 minutos seguida de otra de, al menos, 30 minutos, intercaladas en el periodo de conducción.

**Resposta no Pack:**  
> una pausa de al menos 15 minutos intercalada en el periodo de conducción, seguida de otro de al menos 30 minutos al final.

**Sugestão da IA:** 🟡 **NEEDS_EXPERT** (MEDIUM)  
**Motivo:** Answers are similar (overlap 55%) but phrased differently. May be acceptable variant or subtle factual difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 39 — P1 | PDF #87 | `q_95f93a4f` | Seguridad vial

**Pergunta:**  
> En el sector del transporte, ¿cuál de los siguientes accidentes de trabajo es más frecuente?

**Resposta no PDF (fonte principal):**  
> Golpes con herramientas y otros objetos.

**Resposta no Pack:**  
> Atropellos por vehículos y maquinaria auxiliar.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 40 — P1 | PDF #227 | `q_a57712f8` | Geral

**Pergunta:**  
> ¿Cuál es la finalidad de las actividades de prevención de riesgos laborales?

**Resposta no PDF (fonte principal):**  
> Evitar los riesgos que son evitables y evaluar los que no lo son.

**Resposta no Pack:**  
> Evitar las enfermedades profesionales.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 17%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 41 — P1 | PDF #239 | `q_39f198fc` | Seguridad vial

**Pergunta:**  
> En las estadísticas de accidentes de circulación, el índice de gravedad hace referencia:

**Resposta no PDF (fonte principal):**  
> a indicadores que comparan el número de fallecidos con el número de accidentes.

**Resposta no Pack:**  
> al número de fallecidos por cada 100 millones de km recorridos.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 25%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 42 — P1 | PDF #25 | `q_d0858ea1` | Geral

**Pergunta:**  
> Los equipos de protección individual del trabajador deberán comercializarse siempre marcados y acompañados de:

**Resposta no PDF (fonte principal):**  
> instrucciones de uso.

**Resposta no Pack:**  
> las pilas para su funcionamiento.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 43 — P1 | PDF #28 | `q_e2cfc5ec` | Salud y ergonomía

**Pergunta:**  
> Como medida de prevención de riesgos para el conductor, es importante que el respaldo de su asiento en el vehículo:

**Resposta no PDF (fonte principal):**  
> cubra completamente la espalda.

**Resposta no Pack:**  
> sea muy mullido.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 44 — P1 | PDF #84 | `q_60790e2c` | Carga y logística

**Pergunta:**  
> El tipo de esfuerzo requerido para el manejo de la carga del vehículo influye en el nivel de riesgo. Así, es más segura la manipulación que exija:

**Resposta no PDF (fonte principal):**  
> no realizar esfuerzos.

**Resposta no Pack:**  
> esfuerzos escalonados.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers differ in phrasing (token overlap 33%). PDF answer is more complete/official — review to confirm.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 45 — P1 | PDF #86 | `q_274927e6` | Geral

**Pergunta:**  
> ¿Cómo debe ser el medio en el que se realiza la actividad laboral?

**Resposta no PDF (fonte principal):**  
> Con ausencia de ruidos.

**Resposta no Pack:**  
> Un espacio de trabajo amplio.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** 🔴 `NEEDS_EXPERT`

**Notas:** *(opcional)*

---

### Item 46 — P1 | PDF #132 | `q_63bda9e9` | Mecánica y mantenimiento

**Pergunta:**  
> ¿Qué tipo de suelo es capaz de absorber y amortiguar parte del peso del cuerpo?

**Resposta no PDF (fonte principal):**  
> Moqueta.

**Resposta no Pack:**  
> Cemento.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 47 — P1 | PDF #18 | `q_56f9c61e` | Geral

**Pergunta:**  
> Los mareos y los desvanecimientos pueden provenir de:

**Resposta no PDF (fonte principal):**  
> una mala alimentación.

**Resposta no Pack:**  
> dormir más de ocho horas.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 48 — P1 | PDF #27 | `q_beaefa47` | Salud y ergonomía

**Pergunta:**  
> Tener el vehículo mal ventilado y estar en una postura incomoda al volante, ¿qué puede provocar?

**Resposta no PDF (fonte principal):**  
> Fatiga.

**Resposta no Pack:**  
> Somnolencia.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 49 — P1 | PDF #95 | `q_7a4ba2f9` | Geral

**Pergunta:**  
> ¿Cuáles son los efectos más comunes que produce la cocaína en la conducción?

**Resposta no PDF (fonte principal):**  
> Minusvaloración de los riesgos.

**Resposta no Pack:**  
> Adopción de conductas peligrosas.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 50 — P1 | PDF #87 | `q_93502fa3` | Carga y logística

**Pergunta:**  
> Ante una situación como la caída de carga sobre la vía, ¿qué actuaciones deben realizarse?

**Resposta no PDF (fonte principal):**  
> • Se deberá apartar el vehículo para evitar que, junto con la carga caída, acreciente el riego provocado. • Se deberá retirar o apartar el obstáculo. • Se deberá dejar lo más limpia posible la calzada. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Se deberá apartar el vehículo para evitar que, junto con la carga caída, acreciente el riego provocado.

**Sugestão da IA:** 🟡 **NEEDS_EXPERT** (MEDIUM)  
**Motivo:** Answers are similar (overlap 52%) but phrased differently. May be acceptable variant or subtle factual difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 51 — P1 | PDF #216 | `q_85f7108f` | Primeros auxilios

**Pergunta:**  
> En caso de que haya un motorista accidentado, ¿qué no se debe hacer?

**Resposta no PDF (fonte principal):**  
> Quitarle el casco.

**Resposta no Pack:**  
> Moverlo en caso de peligro de atropello.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 52 — P1 | PDF #140 | `q_b7cd6ae5` | Geral

**Pergunta:**  
> Entre las comprobaciones en el interior del vehículo está:

**Resposta no PDF (fonte principal):**  
> el buen estado de los escalones de entrada.

**Resposta no Pack:**  
> que el compartimento de equipajes está despejado.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 53 — P1 | PDF #157 | `q_20c51f87` | Conducción racional

**Pergunta:**  
> ¿En qué parte del autobús aparecerá la expresión «Operado por:» y la identificación de la empresa que presta el servicio acompañando al distintivo de imagen corporativa de las líneas de titularidad estatal?

**Resposta no PDF (fonte principal):**  
> Bajo la luna trasera.

**Resposta no Pack:**  
> En las puertas delanteras.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Short answers with low token overlap (0%). May be synonymous phrasing — PDF preferred but human confirmation advised.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### 🟡 Grupo: P3 — Pergunta quase idêntica, resposta diferente — Confiança MEDIUM (22 itens)

> Perguntas com redação ligeiramente diferente (sim ≥ 0.95). A IA sugere PDF como referência
> mas o contexto pode variar. Confirmar manualmente.

### Item 54 — P3 | PDF #36 | `q_32a3b65c` | Mecánica y mantenimiento

**Pergunta:**  
> La zona de máxima eficiencia del motor, zona económica…

**Resposta no PDF (fonte principal):**  
> está especificada en el cuentarrevoluciones, generalmente de color verde.

**Resposta no Pack:**  
> consiste en conducir económicamente.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers are unrelated (overlap 0%) despite near-identical questions (sim=0.9815). PDF answer preferred — human review required due to question wording difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 55 — P3 | PDF #65 | `q_7e027283` | Mecánica y mantenimiento

**Pergunta:**  
> ¿Cuál de los siguientes elementos del vehículo forma parte del retardador hidráulico?

**Resposta no PDF (fonte principal):**  
> El estátor fijo.

**Resposta no Pack:**  
> El calderín.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (11 chars vs PDF 15 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 56 — P3 | PDF #295 | `q_347029d1` | Conducción racional

**Pergunta:**  
> ¿Cuál de estos factores afecta más al ahorro de combustible?

**Resposta no PDF (fonte principal):**  
> La elección de la relación de marchas correcta durante la circulación.

**Resposta no Pack:**  
> La marca del fabricante de la carrocería.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers are unrelated (overlap 0%) despite near-identical questions (sim=0.9831). PDF answer preferred — human review required due to question wording difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 57 — P3 | PDF #6 | `q_a54ebeda` | Normativa de transportes

**Pergunta:**  
> ¿Cómo pueden demostrar los conductores profesionales de otros países, que efectúen transportes en España, que cumplen los requisitos de formación y cualificación exigidos por la normativa?

**Resposta no PDF (fonte principal):**  
> • Con el permiso de conducción de modelo comunitario que lleve el código armonizado correspondiente inscrito en él. • Con la tarjeta de cualificación del conductor, en la que constará el código comunitario correspondiente. • Con el certificado de conductor de terceros países previsto en el Reglamento (CE) 1072/2009, si incluye el código correspondiente. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Con el permiso de conducción de modelo comunitario, con el código comunitario inscrito en él.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (91 chars vs PDF 395 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 58 — P3 | PDF #45 | `q_eba7fa9c` | Tacógrafo y tiempos

**Pergunta:**  
> La descarga de datos de las tarjetas de tacógrafo de los conductores deberá hacerse, al menos:

**Resposta no PDF (fonte principal):**  
> cada 28 días con actividad registrada.

**Resposta no Pack:**  
> cada 31 días.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (12 chars vs PDF 37 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 59 — P3 | PDF #163 | `q_2ee8548d` | Tacógrafo y tiempos

**Pergunta:**  
> ¿Cuál de los siguientes vehículos está exento del uso de tacógrafo?

**Resposta no PDF (fonte principal):**  
> Un autocar dedicado exclusivamente a la donación de sangre.

**Resposta no Pack:**  
> Vehículos cuya velocidad máxima no supere los 40 km/h.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers are unrelated (overlap 0%) despite near-identical questions (sim=0.9848). PDF answer preferred — human review required due to question wording difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 60 — P3 | PDF #260 | `q_c1d0f4f6` | Tacógrafo y tiempos

**Pergunta:**  
> Según la reglamentación social europea, ¿puede un conductor iniciar un descanso semanal 5 días después del fin del anterior descanso semanal?

**Resposta no PDF (fonte principal):**  
> Sí.

**Resposta no Pack:**  
> No, puesto que debería iniciarlo antes de concluir el sexto día.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Opposing factual terms detected. Near-identical question but answer polarity inverted — likely pack error, but wording difference warrants review.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 61 — P3 | PDF #510 | `q_b8850097` | Documentación

**Pergunta:**  
> ¿En qué plazo máximo deben superar el examen para la obtención del CAP los conductores que hayan realizado la formación inicial?

**Resposta no PDF (fonte principal):**  
> 1 año.

**Resposta no Pack:**  
> 6 meses.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (7 chars vs PDF 5 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 62 — P3 | PDF #1 | `q_c3025930` | Seguridad vial

**Pergunta:**  
> ¿A quién causan un perjuicio económico los accidentes laborales?

**Resposta no PDF (fonte principal):**  
> • Al trabajador. • A la empresa del trabajador. • Al conjunto de la sociedad. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Al trabajador.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (13 chars vs PDF 122 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 63 — P3 | PDF #16 | `q_9fcb2fee` | Salud y ergonomía

**Pergunta:**  
> La fatiga y el estrés en la actividad de transporte se produce por:

**Resposta no PDF (fonte principal):**  
> • la prolongación de la jornada. • circunstancias del tráfico. • la responsabilidad añadida como consecuencia del objeto transportado. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> la prolongación de la jornada.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (29 chars vs PDF 179 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 64 — P3 | PDF #22 | `q_e036b563` | Geral

**Pergunta:**  
> Las lesiones derivadas de un sobreesfuerzo en el trabajo pueden ser producidas

**Resposta no PDF (fonte principal):**  
> por: • movimientos repetitivos. • posturas de trabajo incorrectas. • manipulación inadecuada de la carga. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> movimientos repetitivos.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (23 chars vs PDF 149 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 65 — P3 | PDF #35 | `q_a68cced2` | Seguridad vial

**Pergunta:**  
> El transporte por carretera es una actividad productiva caracterizada por el

**Resposta no PDF (fonte principal):**  
> trabajo: • a ritmos acelerados. • sometido a excesos de responsabilidad. • Las respuestas A y C son correctas.

**Resposta no Pack:**  
> ser un trabajo a ritmos acelerados.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (34 chars vs PDF 106 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 66 — P3 | PDF #147 | `q_94c7e4a3` | Seguridad vial

**Pergunta:**  
> ¿Cuáles de los siguientes tipos de accidente es frecuente que afecte a los trabajadores de empresas de transporte?

**Resposta no PDF (fonte principal):**  
> • Caída de personas a distinto nivel. • Atropellos por vehículos y maquinaria auxiliar. • Exposición continuada a vibraciones. • Todas las respuestas anteriores son correctas.

**Resposta no Pack:**  
> Caída de personas a distinto nivel.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (34 chars vs PDF 171 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 67 — P3 | PDF #157 | `q_04471f99` | Seguridad vial

**Pergunta:**  
> ¿Cuáles de los siguientes son accidentes con forma no traumática?

**Resposta no PDF (fonte principal):**  
> • Los infartos. • Los derrames cerebrales. • Las respuestas A y B son correctas.

**Resposta no Pack:**  
> Los infartos.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (12 chars vs PDF 77 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 68 — P3 | PDF #282 | `q_4735971c` | Salud y ergonomía

**Pergunta:**  
> ¿Qué son las enfermedades profesionales?

**Resposta no PDF (fonte principal):**  
> Las contraídas a consecuencia de un trabajo ejecutado en las actividades especificadas en el cuadro que, a tal efecto, se apruebe.

**Resposta no Pack:**  
> Las contraídas a consecuencia del trabajo.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (41 chars vs PDF 127 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 69 — P3 | PDF #66 | `q_0c45de73` | Geral

**Pergunta:**  
> ¿Cuál de los siguientes países no pertenece al denominado "Espacio Schengen"?

**Resposta no PDF (fonte principal):**  
> Marruecos.

**Resposta no Pack:**  
> Portugal.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (8 chars vs PDF 9 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 70 — P3 | PDF #64 | `q_76682f29` | Salud y ergonomía

**Pergunta:**  
> Durante viajes largos y sobre todo por la noche, ¿qué bebida no es aconsejable tomar?

**Resposta no PDF (fonte principal):**  
> Leche caliente.

**Resposta no Pack:**  
> Zumos.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (5 chars vs PDF 14 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 71 — P3 | PDF #17 | `q_fa3e9e7a` | Normativa de transportes

**Pergunta:**  
> Según la normativa española, en las inspecciones llevadas a cabo en carretera, ¿quién tendrá la consideración de representante de la empresa en relación con la documentación relativa al transporte que existe obligación de llevar a bordo del vehículo?

**Resposta no PDF (fonte principal):**  
> El conductor.

**Resposta no Pack:**  
> El empresario.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Pack answer appears incomplete (13 chars vs PDF 12 chars). PDF preferred — confirm wording difference is minor.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 72 — P3 | PDF #22 | `q_c491bdcb` | Seguridad vial

**Pergunta:**  
> ¿En qué consiste la conducción preventiva?

**Resposta no PDF (fonte principal):**  
> En ser consciente de los riesgos y anticiparse a posibles situaciones de peligro.

**Resposta no Pack:**  
> El aprendizaje necesario hasta obtener el carné de conducir.

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers are unrelated (overlap 0%) despite near-identical questions (sim=0.9512). PDF answer preferred — human review required due to question wording difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

### Item 73 — P3 | PDF #49 | `q_d9fad63e` | Normativa de transportes

**Pergunta:**  
> ¿Qué se conoce como empatía en un profesional de una empresa de transporte?

**Resposta no PDF (fonte principal):**  
> La voluntad de comprender y satisfacer las necesidades del cliente.

**Resposta no Pack:**  
> La demostración de la volunta

**Sugestão da IA:** 🟡 **ACCEPT_PDF_ANSWER** (MEDIUM)  
**Motivo:** Answers are unrelated (overlap 0%) despite near-identical questions (sim=0.9865). PDF answer preferred — human review required due to question wording difference.

**Decisão do revisor:** ✅ `ACCEPT_PDF_ANSWER`

**Notas:** *(opcional)*

---

## Próximo passo

1. Preencher cada `Decisão do revisor` neste ficheiro ou no `human_review_required.csv`.
2. Itens com `aiConfidence = HIGH` (112 ao total) **não precisam de revisão manual** — podem ser aprovados em lote.
3. Após revisão, executar `scripts/apply_content_corrections.ts` (a criar) para gerar `questions-v2.json`.
4. Nenhuma alteração é aplicada até esse script ser executado manualmente.

*Gerado em: 2026-06-05T14:02:27.137Z — Nenhuma correção foi aplicada.*