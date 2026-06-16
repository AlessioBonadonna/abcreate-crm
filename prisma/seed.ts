import { PrismaClient } from '@prisma/client'
import { DEFAULT_SETTINGS } from '../shared/constants'

const prisma = new PrismaClient()

// Starter message templates (editable from the UI). Placeholders:
// {{business}} {{sender}} {{problem}} {{category}} {{portfolio}}
// {{priceLanding}} {{priceVetrina}} {{deliveryWeeks}}
const TEMPLATES = [
  {
    name: 'WhatsApp — Senza sito',
    segment: 'no_website',
    channel: 'WhatsApp',
    subject: null,
    body:
      'Ciao {{business}}, ho notato che non avete ancora un sito web — oggi è la prima cosa che chi vi cerca su Google si aspetta di trovare.\n\nMi occupo di siti per attività come la vostra: una pagina semplice e veloce per farvi trovare e ricevere richieste. Esempi: {{portfolio}}.\n\nUna landing parte da {{priceLanding}}€, consegna in {{deliveryWeeks}} settimane. Se vi va vi mando un\'idea su misura, senza impegno.\n\n— {{sender}}',
  },
  {
    name: 'Email — Senza sito',
    segment: 'no_website',
    channel: 'Email',
    subject: 'Un sito per {{business}} (idea veloce)',
    body:
      'Salve,\n\nho provato a cercare {{business}} online e non ho trovato un sito: significa che chi vi cerca rischia di trovare prima i concorrenti.\n\nRealizzo siti per piccole attività locali — semplici, veloci e curati. Qualche lavoro: {{portfolio}}.\n\nUna landing parte da {{priceLanding}}€ (sito vetrina da {{priceVetrina}}€), con consegna in circa {{deliveryWeeks}} settimane. Se le interessa le preparo una proposta senza impegno.\n\nUn saluto,\n{{sender}}',
  },
  {
    name: 'WhatsApp — Sito da migliorare',
    segment: 'weak_website',
    channel: 'WhatsApp',
    subject: null,
    body:
      'Ciao {{business}}, ho dato un\'occhiata al vostro sito: {{problem}}. Sono dettagli che fanno perdere contatti senza accorgersene.\n\nPosso sistemarlo o rifarlo in modo più moderno e veloce. Esempi: {{portfolio}}.\n\nSe vi va vi mando una proposta su misura.\n\n— {{sender}}',
  },
  {
    name: 'Email — Sito da migliorare',
    segment: 'weak_website',
    channel: 'Email',
    subject: 'Qualche miglioria per il sito di {{business}}',
    body:
      'Salve,\n\nho visto il sito di {{business}}: funziona, ma {{problem}}. Sono cose che incidono su quanti contatti vi arrivano.\n\nMi occupo di siti e mini-gestionali per attività locali. Qualche lavoro: {{portfolio}}.\n\nPosso proporvi un restyling o un sito nuovo (da {{priceVetrina}}€, consegna ~{{deliveryWeeks}} settimane). Le va se preparo un\'idea su misura?\n\nUn saluto,\n{{sender}}',
  },
]

async function main() {
  // Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {}, // don't overwrite user changes on re-seed
      create: { key, value },
    })
  }

  // Templates (only seed if table is empty)
  const count = await prisma.messageTemplate.count()
  if (count === 0) {
    for (const t of TEMPLATES) {
      await prisma.messageTemplate.create({ data: t })
    }
  }

  console.log(
    `Seed done — ${Object.keys(DEFAULT_SETTINGS).length} settings, ${count === 0 ? TEMPLATES.length : 0} templates created.`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
