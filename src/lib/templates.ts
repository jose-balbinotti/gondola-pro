export interface PosterTemplate {
  id: string;
  name: string;
  category: 'promo' | 'gondola' | 'oferta-dia' | 'leve-pague' | 'destaque' | 'faixa' | 'sazonal';
  size: 'A4' | 'A5' | 'gondola';
  bgColor: string;
  accentColor: string;
  textColor: string;
  priceColor: string;
  layout: 'centered' | 'split' | 'banner' | 'diagonal';
  premium: boolean;
  backgroundImage?: string;
  seasonal?: 'pascoa' | 'natal' | 'consumidor' | 'black-friday';
}

export interface PosterData {
  templateId: string;
  productName: string;
  brandName: string;
  gramatura: string;
  oldPrice: string;
  newPrice: string;
  discount: string;
  validity: string;
  description: string;
  quantity: string;
  unit: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  whatsappNumber?: string;
}

export interface CSVProduct {
  produto: string;
  precoAntigo: string;
  precoNovo: string;
  desconto: string;
}

export const TEMPLATES: PosterTemplate[] = [
  { id: 'promo-red-1', name: 'Promoção Imperdível', category: 'promo', size: 'A4', bgColor: '#E31C1C', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: false },
  { id: 'promo-orange-1', name: 'Super Oferta', category: 'promo', size: 'A4', bgColor: '#FF8A00', accentColor: '#FFFFFF', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'centered', premium: false },
  { id: 'oferta-dia-1', name: 'Oferta do Dia', category: 'oferta-dia', size: 'A4', bgColor: '#1A1A1B', accentColor: '#E31C1C', textColor: '#FFFFFF', priceColor: '#E31C1C', layout: 'split', premium: false },
  { id: 'leve-pague-1', name: 'Leve 3 Pague 2', category: 'leve-pague', size: 'A4', bgColor: '#008000', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: false },
  { id: 'gondola-red', name: 'Faixa de Gôndola', category: 'gondola', size: 'gondola', bgColor: '#E31C1C', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'banner', premium: false },
  { id: 'gondola-blue', name: 'Gôndola Azul', category: 'gondola', size: 'gondola', bgColor: '#1E40AF', accentColor: '#FFFFFF', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'banner', premium: false },
  { id: 'destaque-neon', name: 'Destaque Neon', category: 'destaque', size: 'A4', bgColor: '#000000', accentColor: '#39FF14', textColor: '#FFFFFF', priceColor: '#39FF14', layout: 'centered', premium: false },
  { id: 'promo-yellow', name: 'Preço Baixo', category: 'promo', size: 'A4', bgColor: '#FFD700', accentColor: '#E31C1C', textColor: '#1A1A1B', priceColor: '#E31C1C', layout: 'split', premium: false },
  { id: 'faixa-vermelha', name: 'Faixa Vermelha', category: 'faixa', size: 'A5', bgColor: '#E31C1C', accentColor: '#FFFFFF', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'banner', premium: false },
  { id: 'promo-diagonal', name: 'Diagonal Promo', category: 'promo', size: 'A4', bgColor: '#E31C1C', accentColor: '#FF8A00', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'diagonal', premium: false },
  { id: 'oferta-verde', name: 'Oferta Verde', category: 'oferta-dia', size: 'A4', bgColor: '#059669', accentColor: '#FFFFFF', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: false },
  { id: 'black-friday', name: 'Black Friday', category: 'promo', size: 'A4', bgColor: '#000000', accentColor: '#FFD700', textColor: '#FFD700', priceColor: '#E31C1C', layout: 'diagonal', premium: true },
  { id: 'natal-promo', name: 'Natal Promo', category: 'promo', size: 'A4', bgColor: '#165B33', accentColor: '#E31C1C', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: true },
  { id: 'pascoa', name: 'Páscoa', category: 'promo', size: 'A4', bgColor: '#7C3AED', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: true },
  { id: 'gondola-premium', name: 'Gôndola Premium', category: 'gondola', size: 'gondola', bgColor: '#1A1A1B', accentColor: '#E31C1C', textColor: '#FFFFFF', priceColor: '#E31C1C', layout: 'banner', premium: true },
  { id: 'atacado', name: 'Preço Atacado', category: 'promo', size: 'A4', bgColor: '#1E40AF', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'split', premium: false },
  { id: 'combo', name: 'Combo Especial', category: 'leve-pague', size: 'A4', bgColor: '#E31C1C', accentColor: '#FFFFFF', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'split', premium: false },
  { id: 'hortifruti', name: 'Hortifruti', category: 'oferta-dia', size: 'A5', bgColor: '#059669', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'centered', premium: false },
  { id: 'acougue', name: 'Açougue', category: 'oferta-dia', size: 'A4', bgColor: '#991B1B', accentColor: '#FFFFFF', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'split', premium: false },
  { id: 'padaria', name: 'Padaria', category: 'oferta-dia', size: 'A5', bgColor: '#92400E', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'centered', premium: false },
  { id: 'bebidas', name: 'Bebidas', category: 'promo', size: 'A4', bgColor: '#1E40AF', accentColor: '#E31C1C', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'diagonal', premium: false },
  { id: 'faixa-clean', name: 'Faixa Clean', category: 'faixa', size: 'A5', bgColor: '#FFFFFF', accentColor: '#E31C1C', textColor: '#1A1A1B', priceColor: '#E31C1C', layout: 'banner', premium: false },
  // Seasonal Templates
  { id: 'pascoa-tema', name: 'Páscoa Temático', category: 'sazonal', size: 'A4', bgColor: '#E8B4F8', accentColor: '#FFD700', textColor: '#4A1A6B', priceColor: '#E31C1C', layout: 'centered', premium: false, backgroundImage: '/templates/pascoa-bg.jpg', seasonal: 'pascoa' },
  { id: 'natal-tema', name: 'Natal Temático', category: 'sazonal', size: 'A4', bgColor: '#165B33', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: false, backgroundImage: '/templates/natal-bg.jpg', seasonal: 'natal' },
  { id: 'consumidor-tema', name: 'Dia do Consumidor', category: 'sazonal', size: 'A4', bgColor: '#2196F3', accentColor: '#FF8A00', textColor: '#FFFFFF', priceColor: '#FF8A00', layout: 'centered', premium: false, backgroundImage: '/templates/consumidor-bg.jpg', seasonal: 'consumidor' },
  { id: 'pascoa-simples', name: 'Páscoa Simples', category: 'sazonal', size: 'A4', bgColor: '#7C3AED', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'centered', premium: false, seasonal: 'pascoa' },
  { id: 'natal-elegante', name: 'Natal Elegante', category: 'sazonal', size: 'A4', bgColor: '#991B1B', accentColor: '#FFD700', textColor: '#FFFFFF', priceColor: '#FFD700', layout: 'split', premium: false, seasonal: 'natal' },
  { id: 'consumidor-moderno', name: 'Consumidor Moderno', category: 'sazonal', size: 'A4', bgColor: '#1E40AF', accentColor: '#FF8A00', textColor: '#FFFFFF', priceColor: '#FFFFFF', layout: 'diagonal', premium: false, seasonal: 'consumidor' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  'promo': 'Promoções',
  'gondola': 'Gôndola',
  'oferta-dia': 'Oferta do Dia',
  'leve-pague': 'Leve e Pague',
  'destaque': 'Destaque',
  'faixa': 'Faixas',
  'sazonal': 'Sazonais',
};

export const DEFAULT_POSTER_DATA: PosterData = {
  templateId: 'promo-red-1',
  productName: 'Arroz Tipo 1',
  brandName: 'Tio João',
  gramatura: '5kg',
  oldPrice: '24,90',
  newPrice: '19,90',
  discount: '',
  validity: '',
  description: '',
  quantity: '',
  unit: 'un',
  whatsappNumber: '',
};
