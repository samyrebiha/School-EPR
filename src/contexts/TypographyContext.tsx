import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontId = 'cairo' | 'almarai' | 'tajawal' | 'ibm-plex';
export type FontSizeId = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface FontOption {
  id: FontId;
  name: string;
  fontFamily: string;
  sampleText: string;
}

export interface FontSizeOption {
  id: FontSizeId;
  label: string;
  sizePx: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: 'cairo',
    name: 'خط كايرو (Cairo)',
    fontFamily: "'Cairo', sans-serif",
    sampleText: 'بسم الله الرحمن الرحيم • أ ب ت ث ج ح خ د ذ ر ز س ش ص ض',
  },
  {
    id: 'almarai',
    name: 'خط المراعي (Almarai)',
    fontFamily: "'Almarai', sans-serif",
    sampleText: 'بسم الله الرحمن الرحيم • أ ب ت ث ج ح خ د ذ ر ز س ش ص ض',
  },
  {
    id: 'tajawal',
    name: 'خط تجوال (Tajawal)',
    fontFamily: "'Tajawal', sans-serif",
    sampleText: 'بسم الله الرحمن الرحيم • أ ب ت ث ج ح خ د ذ ر ز س ش ص ض',
  },
  {
    id: 'ibm-plex',
    name: 'خط بليكس (IBM Plex)',
    fontFamily: "'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sampleText: 'بسم الله الرحمن الرحيم • أ ب ت ث ج ح خ د ذ ر ز س ش ص ض',
  },
];

export const AVAILABLE_FONT_SIZES: FontSizeOption[] = [
  { id: 'sm', label: 'صغير', sizePx: '14.5px' },
  { id: 'md', label: 'عادي (افتراضي)', sizePx: '16px' },
  { id: 'lg', label: 'متوسط', sizePx: '17px' },
  { id: 'xl', label: 'كبير', sizePx: '18px' },
  { id: '2xl', label: 'كبير جداً', sizePx: '19.5px' },
];

interface TypographyContextType {
  currentFontId: FontId;
  currentFontSizeId: FontSizeId;
  currentFont: FontOption;
  currentFontSize: FontSizeOption;
  changeFont: (fontId: FontId) => void;
  changeFontSize: (sizeId: FontSizeId) => void;
  availableFonts: FontOption[];
  availableFontSizes: FontSizeOption[];
}

const STORAGE_KEY_FONT = 'school_app_font_id';
const STORAGE_KEY_SIZE = 'school_app_font_size_id';

const TypographyContext = createContext<TypographyContextType | undefined>(undefined);

export const TypographyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentFontId, setCurrentFontId] = useState<FontId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FONT) as FontId;
    if (saved && AVAILABLE_FONTS.some((f) => f.id === saved)) {
      return saved;
    }
    return 'ibm-plex';
  });

  const [currentFontSizeId, setCurrentFontSizeId] = useState<FontSizeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIZE) as FontSizeId;
    if (saved && AVAILABLE_FONT_SIZES.some((s) => s.id === saved)) {
      return saved;
    }
    return 'md';
  });

  const currentFont = AVAILABLE_FONTS.find((f) => f.id === currentFontId) || AVAILABLE_FONTS[0];
  const currentFontSize = AVAILABLE_FONT_SIZES.find((s) => s.id === currentFontSizeId) || AVAILABLE_FONT_SIZES[1];

  // Apply font family and size changes to document root
  useEffect(() => {
    if (currentFont) {
      document.documentElement.style.setProperty('--font-family', currentFont.fontFamily);
      localStorage.setItem(STORAGE_KEY_FONT, currentFont.id);
    }
  }, [currentFont]);

  useEffect(() => {
    if (currentFontSize) {
      document.documentElement.style.fontSize = currentFontSize.sizePx;
      localStorage.setItem(STORAGE_KEY_SIZE, currentFontSize.id);
    }
  }, [currentFontSize]);

  const changeFont = (fontId: FontId) => {
    setCurrentFontId(fontId);
  };

  const changeFontSize = (sizeId: FontSizeId) => {
    setCurrentFontSizeId(sizeId);
  };

  return (
    <TypographyContext.Provider
      value={{
        currentFontId,
        currentFontSizeId,
        currentFont,
        currentFontSize,
        changeFont,
        changeFontSize,
        availableFonts: AVAILABLE_FONTS,
        availableFontSizes: AVAILABLE_FONT_SIZES,
      }}
    >
      {children}
    </TypographyContext.Provider>
  );
};

export const useTypography = () => {
  const context = useContext(TypographyContext);
  if (!context) {
    throw new Error('useTypography must be used within a TypographyProvider');
  }
  return context;
};
