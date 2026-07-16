export type Person = {
  name: string
  relation: string
  photo: string
  description: string
  contribution: number
  photos: string[]
}

export type Condolence = {
  name: string
  relation: string
  photo: string
  message: string
  created_at?: string
  person_id?: number
}

export type SocialLink = {
  platform: string
  label: string
  url: string
}

export type Me = {
  user: { id: string; name: string; email: string; image: string | null } | null
  isAdmin: boolean
  permissions: string[]
  personId: number | null
  mode: 'selfhost' | 'managed'
  features: Record<string, boolean>
  access: { people: boolean; contributions: boolean; relationTree: boolean; program: boolean }
  gates: {
    condolencesRequireAuth: boolean
    approvalMode: boolean
    tabs: { contributions: boolean; memories: boolean; tribute: boolean }
    memoriesScope: string
    tributeAccess: string
    tributeMaxLength: number
  }
  socialLinks: SocialLink[]
  providers: string[]
}

export type Memory = {
  src: string
  caption: string
  addedBy: string
}

export type Contribution = {
  name: string
  relation: string
  amount: number
  note: string
}

export type PaymentConfig = {
  mpesa_number: string
  mpesa_name: string
  paybill_number: string
  paybill_account: string
  paybill_bank: string
}

export type FamilyMember = {
  name: string
  relation: string
  photo: string
  self?: boolean
}

export type ProgramEvent = {
  title: string
  date: string
  time: string
  venue: string
  address: string
  mapUrl: string
  note: string
}

// Subdomain of the primary memorial this deployment is built around.
// Its card on the landing grid is hydrated live from the settings table.
// Set NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG in the environment (inlined client-side).
export const PRIMARY_MEMORIAL_SLUG = process.env.NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG ?? ''

export const CONFIG = {
  siteName: "Pamoja",
  name: "Full Name",
  kicker: "In loving memory of",
  born: "1 January 1950",
  passed: "1 June 2026",
  portrait: "",
  epitaph: "Those we love don't go away, they walk beside us every day.",
  cta: "Write your condolence message",
  currency: "KES",
  whatsapp: "https://chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXXX",

  payment: {
    mpesa_number: '',
    mpesa_name: '',
    paybill_number: '',
    paybill_account: '',
    paybill_bank: '',
  } as PaymentConfig,

  relations: [
    "Brother","Sister",
    "Uncle","Aunt","Nephew","Niece","Cousin",
    "Brother-in-law","Sister-in-law",
    "Friend","Neighbour and friend",
    "Other",
  ] as string[],

  people:       [] as Person[],
  condolences:  [] as Condolence[],
  memories:     [] as Memory[],
  contributions: [] as Contribution[],

  familyTree: {
    generations: [] as FamilyMember[][],
  },

  program:     [] as ProgramEvent[],
  programNote: "",
}
