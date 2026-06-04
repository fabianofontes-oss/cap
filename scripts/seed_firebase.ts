import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase Config
const configPath = resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const realQuestions = [
  {
    id: 'real_q1',
    category: 'Normativa',
    community: 'Nacional',
    question: {
      es: '¿Por qué factor están causados la inmensa mayoría de los accidentes de tráfico?',
      pt: 'Qual fator causa a imensa maioria dos acidentes de trânsito?',
      en: 'What factor causes the vast majority of traffic accidents?'
    },
    options: [
      { id: '1a', text: { es: 'El factor humano.', pt: 'O fator humano.' }, isCorrect: true },
      { id: '1b', text: { es: 'El estado de la vía.', pt: 'O estado da via.' }, isCorrect: false },
      { id: '1c', text: { es: 'Las inclemencias meteorológicas.', pt: 'As condições meteorológicas.' }, isCorrect: false },
      { id: '1d', text: { es: 'El estado del vehículo.', pt: 'O estado do veículo.' }, isCorrect: false }
    ],
    explanation: {
      es: 'Entre un 70% y un 90% de los accidentes de tráfico se deben a errores humanos.',
      pt: 'Entre 70% a 90% dos acidentes de trânsito ocorrem devido a falhas humanas.',
    }
  },
  {
    id: 'real_q2',
    category: 'Tacógrafo',
    community: 'Nacional',
    question: {
      es: 'En el tacógrafo inteligente, ¿cuándo se registra automáticamente la posición del vehículo?',
      pt: 'No tacógrafo inteligente, quando a posição do veículo é registada automaticamente?'
    },
    options: [
      { id: '2a', text: { es: 'Sólo al iniciar y terminar la jornada.', pt: 'Apenas ao iniciar e terminar a jornada.' }, isCorrect: false },
      { id: '2b', text: { es: 'Cada 3 horas de tiempo de conducción acumulado y al inicio/fin.', pt: 'A cada 3 horas de tempo de condução acumulado e no início/fim.' }, isCorrect: true },
      { id: '2c', text: { es: 'Cada vez que el vehículo se detiene.', pt: 'Sempre que o veículo para.' }, isCorrect: false },
      { id: '2d', text: { es: 'Cada hora.', pt: 'A cada hora.' }, isCorrect: false }
    ],
    explanation: {
      es: 'El tacógrafo inteligente registra la posición cada 3 horas de conducción acumulada, además del inicio y final de la jornada laboral.',
      pt: 'O tacógrafo inteligente regista a posição a cada 3 horas de condução acumulada, além do início e fim da jornada de trabalho.'
    }
  },
  {
    id: 'real_q3',
    category: 'Mecánica',
    community: 'Nacional',
    question: {
      es: '¿Qué mide el manómetro en el cuadro de instrumentos de un camión?',
      pt: 'O que mede o manómetro no painel de instrumentos de um camião?'
    },
    options: [
      { id: '3a', text: { es: 'La presión del aceite del motor.', pt: 'A pressão do óleo do motor.' }, isCorrect: true },
      { id: '3b', text: { es: 'La temperatura del líquido refrigerante.', pt: 'A temperatura do líquido de arrefecimento.' }, isCorrect: false },
      { id: '3c', text: { es: 'El nivel de combustible.', pt: 'O nível de combustível.' }, isCorrect: false },
      { id: '3d', text: { es: 'La presión de los neumáticos.', pt: 'A pressão dos pneus.' }, isCorrect: false }
    ],
    explanation: {
      es: 'El manómetro indica la presión a la que circula el aceite por el sistema de lubricación del motor.',
      pt: 'O manómetro indica a pressão à qual o óleo circula pelo sistema de lubrificação do motor.'
    }
  }
];

const realCards = [
  {
    id: 'real_f1',
    category: 'Frenos',
    community: 'Nacional',
    front: { es: '¿Qué es el ralentizador o retardador?', pt: 'O que é o retardardor?' },
    back: { es: 'Un sistema de frenado continuo que permite reducir o mantener la velocidad prolongada sin usar los frenos de servicio.', pt: 'Um sistema de travagem contínua que permite reduzir ou manter a velocidade de forma prolongada sem usar os travões de serviço.' },
    level: 1
  },
  {
    id: 'real_f2',
    category: 'Documentación',
    community: 'Nacional',
    front: { es: '¿Cada cuánto tiempo debe renovarse la tarjeta CAP?', pt: 'Com que frequência o cartão CAP deve ser renovado?' },
    back: { es: 'Cada 5 años, mediante la realización de un curso de formación continua de 35 horas.', pt: 'A cada 5 anos, mediante a realização de um curso de formação contínua de 35 horas.' },
    level: 1
  }
];

async function run() {
  console.log("Injetando questoes oficias no Firestore...");
  for (const q of realQuestions) {
    await setDoc(doc(db, 'quizzes', q.id), q);
    console.log(`- Quiz injetado: ${q.id}`);
  }
  for (const c of realCards) {
    await setDoc(doc(db, 'flashcards', c.id), c);
    console.log(`- Card injetado: ${c.id}`);
  }
  console.log("Concluido! Pressione Ctrl+C se nao encerrar.");
  process.exit(0);
}

run().catch(console.error);
