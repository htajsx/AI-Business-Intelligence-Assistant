const ACRONYMS = new Set([
  'ID', 'SKU', 'AOV', 'SLA', 'BRL', 'KPI', 'UF', 'GMV', 'CAC', 'LTV',
  'ROI', 'NPS', 'CSAT', 'MOM', 'YOY', 'QOQ', 'CEO', 'CFO', 'COO',
  'API', 'SQL', 'USD', 'EUR', 'B2B', 'B2C'
])

const STATE_NAMES = {
  SP: 'São Paulo',
  RJ: 'Rio de Janeiro',
  MG: 'Minas Gerais',
  RS: 'Rio Grande do Sul',
  PR: 'Paraná',
  SC: 'Santa Catarina',
  BA: 'Bahia',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  PE: 'Pernambuco',
  CE: 'Ceará',
  PA: 'Pará',
  MT: 'Mato Grosso',
  MA: 'Maranhão',
  MS: 'Mato Grosso do Sul',
  PB: 'Paraíba',
  PI: 'Piauí',
  RN: 'Rio Grande do Norte',
  AL: 'Alagoas',
  SE: 'Sergipe',
  TO: 'Tocantins',
  RO: 'Rondônia',
  AM: 'Amazonas',
  AC: 'Acre',
  AP: 'Amapá',
  RR: 'Roraima'
}

const BRAZIL_STATES = new Set(Object.keys(STATE_NAMES))

const OVERRIDES = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  boleto: 'Boleto',
  voucher: 'Voucher',
  not_defined: 'Not Defined',
  delivered: 'Delivered',
  shipped: 'Shipped',
  canceled: 'Canceled',
  cancelled: 'Canceled',
  invoiced: 'Invoiced',
  processing: 'Processing',
  unavailable: 'Unavailable',
  approved: 'Approved',
  created: 'Created',
  sao_paulo: 'São Paulo',
  rio_de_janeiro: 'Rio de Janeiro',
  belo_horizonte: 'Belo Horizonte',
  porto_alegre: 'Porto Alegre',
  curitiba: 'Curitiba',
  salvador: 'Salvador',
  brasilia: 'Brasília',
  campinas: 'Campinas',
  guarulhos: 'Guarulhos',
  fortaleza: 'Fortaleza',
  recife: 'Recife',
  manaus: 'Manaus',
  belem: 'Belém',
  goiania: 'Goiânia',
  cama_mesa_banho: 'Bed, Bath & Table',
  beleza_saude: 'Health & Beauty',
  esporte_lazer: 'Sports & Leisure',
  moveis_decoracao: 'Furniture & Decor',
  informatica_acessorios: 'Computers & Accessories',
  utilidades_domesticas: 'Housewares',
  relogios_presentes: 'Watches & Gifts',
  telefonia: 'Telephony',
  ferramentas_jardim: 'Garden Tools',
  automotivo: 'Automotive',
  brinquedos: 'Toys',
  cool_stuff: 'Cool Stuff',
  perfumaria: 'Perfumery',
  bebes: 'Baby',
  eletronicos: 'Electronics',
  papelaria: 'Stationery',
  pet_shop: 'Pet Shop',
  fashion_bolsas_e_acessorios: 'Fashion Bags & Accessories',
  construcao_ferramentas_construcao: 'Construction Tools',
  consoles_games: 'Consoles & Games',
  malas_acessorios: 'Luggage & Accessories',
  eletrodomesticos: 'Home Appliances',
  eletrodomesticos_2: 'Small Appliances',
  eletroportateis: 'Portable Appliances',
  livros_interesse_geral: 'General Interest Books',
  livros_tecnicos: 'Technical Books',
  instrumentos_musicais: 'Musical Instruments',
  alimentos_bebidas: 'Food & Drinks',
  bebidas: 'Drinks',
  alimentos: 'Food',
  audio: 'Audio',
  climatizacao: 'Air Conditioning',
  market_place: 'Marketplace',
  order_status: 'Order Status',
  payment_type: 'Payment Type',
  customer_state: 'State',
  seller_state: 'Seller State',
  customer_city: 'City',
  seller_city: 'Seller City',
  product_category_name: 'Category',
  price: 'Price',
  freight_value: 'Freight Value',
  review_score: 'Review Score',
  order_id: 'Order ID',
  customer_id: 'Customer ID',
  product_id: 'Product ID',
  seller_id: 'Seller ID',
  order_purchase_timestamp: 'Purchase Date',
  order_delivered_customer_date: 'Delivered Date',
  order_estimated_delivery_date: 'Estimated Delivery'
}

export function humanizeLabel(value, context) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value

  const normalized = trimmed.toLowerCase()
  if (OVERRIDES[normalized]) {
    return OVERRIDES[normalized]
  }

  const upper = trimmed.toUpperCase()
  if (BRAZIL_STATES.has(upper)) {
    if (context === 'state_full' && STATE_NAMES[upper]) {
      return `${STATE_NAMES[upper]} (${upper})`
    }
    return upper
  }
  if (ACRONYMS.has(upper)) {
    return upper
  }

  const words = trimmed
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return value

  return words
    .map((word) => {
      const wUpper = word.toUpperCase()
      if (ACRONYMS.has(wUpper)) return wUpper
      if (BRAZIL_STATES.has(wUpper)) return wUpper
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function humanizeSnakeText(text) {
  if (typeof text !== 'string') return text
  return text.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (match) => {
    return humanizeLabel(match)
  })
}

export function formatCategoryName(cat) {
  if (!cat) return 'Unknown'
  return humanizeLabel(String(cat))
}

export function formatStateName(st) {
  if (!st) return 'Unknown'
  const code = String(st).trim().toUpperCase()
  return STATE_NAMES[code] ? `${STATE_NAMES[code]} (${code})` : humanizeLabel(code)
}

export { STATE_NAMES, BRAZIL_STATES, OVERRIDES }
