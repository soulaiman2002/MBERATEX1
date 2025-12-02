export interface Material {
  id: number;
  name: string;
  unitPrice: number;
  qty: number;
  unit: string;
  threadMeters: number;
  threadCapacity: number;
}

export interface PurchasingData extends Material {
  totalRaw: number;
  totalWithWaste: number;
  qtyToBuy: number;
  lineCost: number;
}

export interface AppSettings {
  costMinute: number;
  cutRate: number;
  packRate: number;
  marginAtelier: number;
  tva: number;
  marginBoutique: number;
}

export interface PdfSettings {
  orientation: 'portrait' | 'landscape';
  colorMode: 'color' | 'grayscale';
  scale: number;
}

export interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

declare global {
  interface Window {
    html2pdf: any;
  }
}