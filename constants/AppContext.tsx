import React, { createContext, useContext, useState, ReactNode } from 'react';

export type InstrumentType = 'synth' | 'guitar';

export interface AppSettings {
  notesPerTurn: number;
  maxInterval: number;
  repetitionsRequired: number;
  showSuccessIndicator: boolean;
  showNotes: boolean;
  totalSequences: number;
  instrument: InstrumentType;
  volumeThreshold: number;
}

export interface AppContextProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  currentSequence: number;
  incrementSequence: () => void;
  resetSequence: () => void;
}

const defaultSettings: AppSettings = {
  notesPerTurn: 1,
  maxInterval: 5,
  repetitionsRequired: 3,
  showSuccessIndicator: true,
  showNotes: true,
  totalSequences: 10,
  instrument: 'guitar',
  volumeThreshold: 0.01,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [currentSequence, setCurrentSequence] = useState<number>(1);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const incrementSequence = () => {
    setCurrentSequence((prev) => prev + 1);
  };

  const resetSequence = () => {
    setCurrentSequence(1);
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        currentSequence,
        incrementSequence,
        resetSequence
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 