export const SUGGESTIONS = [
  { icon: 'bar', text: 'Top 5 product categories by revenue' },
  { icon: 'line', text: 'Monthly revenue trend in 2018' },
  { icon: 'truck', text: 'What is the on-time delivery rate by state?' },
  { icon: 'star', text: 'Average review score by payment type' },
]

export const RAIL_SUGGESTIONS = [
  'Top 5 product categories by revenue',
  'Monthly revenue trend in 2018',
  'What is the on-time delivery rate by state?',
  'Average review score by payment type',
  'Total revenue across all delivered orders'
]

export const RECENT_CHATS = [
  { id: 1, title: 'Top categories by revenue', time: 'Recently' },
  { id: 2, title: 'Monthly revenue trend', time: 'Recently' },
  { id: 3, title: 'Delivery performance by state', time: 'Recently' },
]

export const FILTER_OPTIONS = {
  periods: [
    'All time',
    'Year 2018',
    'Year 2017',
    'Year 2016',
    'Q4 2017',
    'Q3 2017',
    'Q2 2017',
    'Q1 2017'
  ],
  categories: [
    'All categories',
    'Health & Beauty',
    'Watches & Gifts',
    'Bed Bath Table',
    'Sports Leisure',
    'Computers & Accessories',
    'Furniture & Decor',
    'Housewares',
    'Cool Stuff',
    'Auto',
    'Toys',
    'Garden Tools'
  ],
  states: ['All states', 'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'DF'],
}

export const DEFAULT_FILTERS = {
  period: 'All time',
  category: 'All categories',
  state: 'All states',
}

export const PERIOD_LABELS = {
  'All time': '2016 – 2018 Full Period',
  'Year 2018': 'Jan 1 – Dec 31, 2018',
  'Year 2017': 'Jan 1 – Dec 31, 2017',
  'Year 2016': 'Sep 1 – Dec 31, 2016',
  'Q4 2017': 'Oct 1 – Dec 31, 2017',
  'Q3 2017': 'Jul 1 – Sep 30, 2017',
  'Q2 2017': 'Apr 1 – Jun 30, 2017',
  'Q1 2017': 'Jan 1 – Mar 31, 2017'
}

export const REPORT_META = {
  dataset: 'Olist Brazilian E-Commerce DW',
  lastUpdated: 'Live sync'
}
