export const MENU_CATEGORY_GROUPS = [
  {
    group: 'Main Course & Meals',
    categories: [
      'Biryani, Rice & Pulao',
      'North Indian Curries',
      'South Indian & Dosa',
      'Thali & Combos',
      'Dal & Indian Breads',
      'Paneer & Veg Specials',
      'Chicken & Meat Curries',
    ],
  },
  {
    group: 'Starters & Street Food',
    categories: [
      'Starters & Appetizers',
      'Kebabs & Tandoor',
      'Chaat & Street Food',
      'Rolls & Wraps',
      'Momos & Dimsums',
      'Soups & Salads',
    ],
  },
  {
    group: 'Fast Food & Continental',
    categories: ['Burgers & Sandwiches', 'Pizzas & Pasta', 'Bowls', 'Snacks & Finger Food'],
  },
  {
    group: 'Desserts & Bakes',
    categories: [
      'Desserts & Sweets',
      'Cakes & Pastries',
      'Ice Creams & Waffles',
      'Bakery & Cookies',
    ],
  },
  {
    group: 'Beverages & Drinks',
    categories: [
      'Beverages',
      'Cold Drinks & Sodas',
      'Fresh Juices & Smoothies',
      'Milkshakes',
      'Chai, Coffee & Hot Drinks',
    ],
  },
  {
    group: 'Dark Store & Groceries',
    categories: [
      'Dairy & Eggs',
      'Instant Food & Noodles',
      'Packaged Snacks & Munchies',
      'Cooking Essentials & Spices',
    ],
  },
]

export const ALL_PRESET_CATEGORIES = MENU_CATEGORY_GROUPS.flatMap((g) => g.categories)

export const PORTION_PRESETS = [
  'Serves 1',
  'Serves 1-2',
  'Serves 2-3',
  '1 Plate',
  'Half',
  'Full',
  '500 ml',
  '250 g',
  '1 Piece',
  'Combo Box',
]

export const QUICK_IMAGE_PRESETS = [
  {
    name: 'Biryani',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Bowl / Salad',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Roll / Wrap',
    url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Curry / Gravy',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Beverage',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dessert',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  },
]
