import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Switch, TextInput, Text, TouchableOpacity, Platform } from 'react-native';
import { useAppContext, InstrumentType } from '@/constants/AppContext';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import AudioUtils from '@/utils/AudioUtils';
import Slider from '@react-native-community/slider';

interface SettingsScreenProps {
  onStartTraining: () => void;
}

// Opções de instrumentos disponíveis
const instrumentOptions: {label: string; value: InstrumentType; disabled?: boolean}[] = [
  { label: "Sintetizador", value: "synth" },
  { label: "Violão", value: "guitar" },
  // { label: "Baixo (em breve)", value: "bass", disabled: true },
  // { label: "Ukulele (em breve)", value: "ukulele", disabled: true }
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onStartTraining }) => {
  const { settings, updateSettings } = useAppContext();
  
  // Local state for form inputs
  const [notesPerTurn, setNotesPerTurn] = useState(settings.notesPerTurn.toString());
  const [maxInterval, setMaxInterval] = useState(settings.maxInterval.toString());
  const [repetitionsRequired, setRepetitionsRequired] = useState(settings.repetitionsRequired.toString());
  const [totalSequences, setTotalSequences] = useState(settings.totalSequences.toString());
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>(settings.instrument);
  const [showSuccessIndicator, setShowSuccessIndicator] = useState(settings.showSuccessIndicator);
  const [volumeThreshold, setVolumeThreshold] = useState(settings.volumeThreshold);

  // Handle number input changes with validation
  const handleNumberChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, min: number, max: number | null) => {
    if (value === '') {
      setter(value);
      return;
    }
    
    const numValue = parseInt(value);
    
    if (!isNaN(numValue)) {
      if (numValue >= min && (max === null || numValue <= max)) {
        setter(value);
      }
    }
  };

  // Handle instrument selection
  const handleInstrumentChange = (value: InstrumentType) => {
    setSelectedInstrument(value);
    AudioUtils.setInstrument(value);
  };

  // Handle volume threshold change
  const handleVolumeThresholdChange = (value: number) => {
    setVolumeThreshold(value);
    AudioUtils.setVolumeThreshold(value);
  };

  // Handle start button press
  const handleStart = () => {
    // Save all settings
    updateSettings({
      notesPerTurn: parseInt(notesPerTurn) || 1,
      maxInterval: parseInt(maxInterval) || 3,
      repetitionsRequired: parseInt(repetitionsRequired) || 3,
      showSuccessIndicator,
      totalSequences: parseInt(totalSequences) || 0,
      instrument: selectedInstrument,
      volumeThreshold,
    });

    // Ensure AudioUtils is using the correct instrument
    AudioUtils.setInstrument(selectedInstrument);

    // Navigate to training screen
    onStartTraining();
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Treino de percepção musical</ThemedText>
        <ThemedText>Configure seu treinamento</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Instrumento</ThemedText>
        <View style={styles.instrumentSelector}>
          {instrumentOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.instrumentOption,
                selectedInstrument === option.value && styles.instrumentOptionSelected,
                option.disabled && styles.instrumentOptionDisabled
              ]}
              onPress={() => !option.disabled && handleInstrumentChange(option.value)}
              disabled={option.disabled}
            >
              <Text 
                style={[
                  styles.instrumentOptionText,
                  selectedInstrument === option.value && styles.instrumentOptionTextSelected,
                  option.disabled && styles.instrumentOptionTextDisabled
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <ThemedText>Escolha o instrumento que quer ouvir. Você pode utilizar qualquer instrumento para reproduzir o som das notas.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Notas por turno</ThemedText>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={notesPerTurn}
          onChangeText={(value) => handleNumberChange(value, setNotesPerTurn, 1, 5)}
          placeholder="1"
        />
        <ThemedText>Número de notas tocadas em sequência (1-5)</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Intervalo máximo (semitons)</ThemedText>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={maxInterval}
          onChangeText={(value) => handleNumberChange(value, setMaxInterval, 1, 12)}
          placeholder="3"
        />
        <ThemedText>Distância máxima entre notas consecutivas (1-12)</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Repetições necessárias</ThemedText>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={repetitionsRequired}
          onChangeText={(value) => handleNumberChange(value, setRepetitionsRequired, 1, 10)}
          placeholder="3"
        />
        <ThemedText>Quantas vezes repetir corretamente a sequência</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Indicador de acerto</ThemedText>
        <Switch
          value={showSuccessIndicator}
          onValueChange={(value) => setShowSuccessIndicator(value)}
        />
        <ThemedText>Mostrar feedback visual quando acertar uma nota</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Total de sequências</ThemedText>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={totalSequences}
          onChangeText={(value) => handleNumberChange(value, setTotalSequences, 0, 100)}
          placeholder="0"
        />
        <ThemedText>Quantidade de sequências (0 = infinito)</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <ThemedText type="subtitle">Sensibilidade do microfone</ThemedText>
        <Text style={styles.thresholdValue}>
          {volumeThreshold.toFixed(3)}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0.001}
          maximumValue={0.05}
          step={0.001}
          value={volumeThreshold}
          onValueChange={handleVolumeThresholdChange}
          minimumTrackTintColor="#4CAF50"
          maximumTrackTintColor="#000000"
          thumbTintColor="#4CAF50"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>Alta</Text>
          <Text style={styles.sliderLabel}>Baixa</Text>
        </View>
      </ThemedView>

      <ThemedView style={styles.settingItem}>
        <ThemedText>Mostrar notas da sequência</ThemedText>
        <Switch
          value={settings.showNotes}
          onValueChange={(value) => updateSettings({ showNotes: value })}
        />
      </ThemedView>

      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>COMEÇAR</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  header: {
    marginBottom: 24,
    gap: 8,
  },
  inputGroup: {
    marginBottom: 20,
    gap: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  instrumentSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 5,
  },
  instrumentOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  instrumentOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  instrumentOptionDisabled: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  instrumentOptionText: {
    fontSize: 14,
    color: '#333',
  },
  instrumentOptionTextSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  instrumentOptionTextDisabled: {
    color: '#9e9e9e',
  },
  startButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  thresholdValue: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
}); 