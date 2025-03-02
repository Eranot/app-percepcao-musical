import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Animated } from 'react-native';
import { useAppContext } from '@/constants/AppContext';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import AudioUtils from '@/utils/AudioUtils';
import { Note, getRandomNote, getRandomNoteWithinInterval, GUITAR_NOTES } from '@/constants/Notes';

interface TrainingScreenProps {
  onFinish: () => void;
}

export const TrainingScreen: React.FC<TrainingScreenProps> = ({ onFinish }) => {
  const { settings, currentSequence, incrementSequence } = useAppContext();
  const [currentNotes, setCurrentNotes] = useState<Note[]>([]);
  const [detectedNote, setDetectedNote] = useState<Note | null>(null);
  const [notesPlayed, setNotesPlayed] = useState<number[]>([]);
  const [correctSequencesPlayed, setCorrectSequencesPlayed] = useState(0);
  const [isTrainingComplete, setIsTrainingComplete] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sequenceInProgress, setSequenceInProgress] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [temporarilyShowNotes, setTemporarilyShowNotes] = useState(false);
  const successFlashAnim = useRef(new Animated.Value(0)).current;
  const isInitializing = useRef(true);

  // Generate a new sequence of notes
  const generateNewSequence = () => {
    const newNotes: Note[] = [];
    
    // Generate the first note randomly
    const firstNote = getRandomNote();
    newNotes.push(firstNote);
    
    // Generate remaining notes with max interval constraint
    for (let i = 1; i < settings.notesPerTurn; i++) {
      const prevNote = newNotes[i - 1];
      const newNote = getRandomNoteWithinInterval(prevNote, settings.maxInterval);
      newNotes.push(newNote);
    }
    
    return newNotes;
  };

  // Initialize training
  useEffect(() => {
    const init = async () => {
      console.log('Initializing training...');
      
      // Set the instrument based on settings
      AudioUtils.setInstrument(settings.instrument);
      
      // Definir o threshold de volume com base nas configurações
      AudioUtils.setVolumeThreshold(settings.volumeThreshold);
      
      await AudioUtils.init();
      
      // Gerar a sequência de notas
      const newSequence = generateNewSequence();
      console.log('New sequence generated:', newSequence.map(note => note.name).join(', '));
      
      // Atualizar o estado e garantir que ele seja aplicado antes de continuar
      // Usamos Promise.resolve().then para garantir que o estado seja atualizado
      await new Promise<void>((resolve) => {
        setCurrentNotes(newSequence);
        // Aguardar o próximo ciclo de renderização
        setTimeout(resolve, 100);
      });
      
      // Iniciar a detecção automaticamente
      const success = await AudioUtils.startPitchDetection(
        (note: Note | null, volume?: number) => {
          setDetectedNote(note);
          if (volume !== undefined) {
            setCurrentVolume(volume);
          }
        }
      );
      
      if (success) {
        setIsListening(true);
      }
      
      // Garantir que temos notas antes de tocar a sequência
      console.log('Playing initial sequence...');
      await playCurrentSequenceWithNotes(newSequence);
      isInitializing.current = false;
    };
    
    init();
    
    return () => {
      // Clean up audio resources when component unmounts
      AudioUtils.cleanup();
    };
  }, []);

  // Handle note detection
  useEffect(() => {
    if (!detectedNote || isInitializing.current) return;
    
    const expectedNoteIndex = notesPlayed.length;
    
    // Check if the detected note matches the expected note in the sequence
    if (expectedNoteIndex < currentNotes.length && 
        detectedNote.name === currentNotes[expectedNoteIndex].name) {
      
      // Flash success indicator if enabled
      if (settings.showSuccessIndicator) {
        showSuccessFlash();
      }
      
      // Add the note to the played notes
      setNotesPlayed([...notesPlayed, expectedNoteIndex]);
      
      // Check if sequence is complete
      if (expectedNoteIndex === currentNotes.length - 1) {
        handleSequenceCompleted();
      }
    }
  }, [detectedNote]);

  // Handle sequence completion
  const handleSequenceCompleted = () => {
    const newCount = correctSequencesPlayed + 1;
    setCorrectSequencesPlayed(newCount);
    
    // Check if we've reached the required repetitions
    if (newCount >= settings.repetitionsRequired) {
      handleTrainingStepComplete();
    } else {
      // Reset for next repetition of the same sequence
      setNotesPlayed([]);
    }
  };

  // Handle completion of a training step (all repetitions of a sequence)
  const handleTrainingStepComplete = async () => {
    setSequenceInProgress(false);
    
    // Tocar som de sucesso antes de seguir para a próxima sequência
    await playSuccessSound();
    
    // Check if we've reached the total sequences (if not infinite)
    if (settings.totalSequences > 0 && currentSequence >= settings.totalSequences) {
      setIsTrainingComplete(true);
      setTimeout(() => {
        onFinish();
      }, 3000);
    } else {
      // Increment sequence counter and prepare for next sequence
      incrementSequence();
      
      // Wait 2 seconds before starting the next sequence
      // (Reduzimos de 3s para 2s porque o som de sucesso já criou um intervalo)
      setTimeout(() => {
        // Gerar a nova sequência
        const newSequence = generateNewSequence();
        
        // Atualizar estados e depois reproduzir a sequência
        // Usamos uma Promise para garantir que o estado seja atualizado antes da reprodução
        Promise.resolve()
          .then(() => {
            setCurrentNotes(newSequence);
            setNotesPlayed([]);
            setCorrectSequencesPlayed(0);
            return null; // para TypeScript
          })
          .then(() => {
            // Damos um pequeno tempo para garantir que o estado foi atualizado
            setTimeout(() => {
              // Agora reproduzimos a nova sequência definida
              console.log('Reproduzindo nova sequência de notas:', newSequence.map(note => note.name).join(', '));
              playCurrentSequenceWithNotes(newSequence);
            }, 200);
          });
      }, 2000);
    }
  };

  // Play the current sequence
  const playCurrentSequence = async () => {
    // Verificar se temos notas para tocar
    if (currentNotes.length === 0) {
      console.warn('Tentativa de tocar sequência vazia!');
      return;
    }
    
    console.log('Tocando sequência atual:', currentNotes.map(note => note.name).join(', '));
    setSequenceInProgress(true);
    
    // Pausar a detecção para evitar que o app detecte suas próprias notas
    await AudioUtils.pausePitchDetection();
    
    try {
      // Play sequence 3 times
      for (let i = 0; i < 3; i++) {
        await AudioUtils.playSequence(currentNotes, 1000);
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    } finally {
      // Garantir que a detecção seja retomada mesmo se houver erros
      await AudioUtils.resumePitchDetection();
      setSequenceInProgress(false);
    }
  };
  
  // Versão especial que reproduz uma sequência específica passada como parâmetro
  const playCurrentSequenceWithNotes = async (notes: Note[]) => {
    if (notes.length === 0) {
      console.warn('Tentativa de tocar sequência vazia!');
      return;
    }
    
    console.log('Tocando notas específicas:', notes.map(note => note.name).join(', '));
    setSequenceInProgress(true);
    
    // Pausar a detecção para evitar que o app detecte suas próprias notas
    await AudioUtils.pausePitchDetection();
    
    try {
      // Play sequence 3 times
      for (let i = 0; i < 3; i++) {
        await AudioUtils.playSequence(notes, 1000);
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    } finally {
      // Garantir que a detecção seja retomada mesmo se houver erros
      await AudioUtils.resumePitchDetection();
      setSequenceInProgress(false);
    }
  };

  // Tocar uma sequência de notas que indica sucesso (dan dan dáan)
  const playSuccessSound = async () => {
    try {
      console.log('Tocando som de sucesso!');
      
      // Pausar a detecção para evitar que o app detecte suas próprias notas
      await AudioUtils.pausePitchDetection();
      
      // Criar uma melodia de sucesso mais empolgante
      // Usamos notas de um acorde maior com uma progressão ascendente
      const successNotes: Note[] = [
        GUITAR_NOTES.find(note => note.name === 'C4') || GUITAR_NOTES[20], // C4
        GUITAR_NOTES.find(note => note.name === 'E4') || GUITAR_NOTES[24], // E4
        GUITAR_NOTES.find(note => note.name === 'G4') || GUITAR_NOTES[27], // G4
        GUITAR_NOTES.find(note => note.name === 'C5') || GUITAR_NOTES[32], // C5
      ];
      
      try {
        // Tocar uma melodia ascendente: dan-dan-daaaan!
        // Primeira nota
        await AudioUtils.playNote(successNotes[0]);
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Segunda nota (um pouco mais alta)
        await AudioUtils.playNote(successNotes[1]);
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Terceira nota (mais alta)
        await AudioUtils.playNote(successNotes[2]);
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Nota final (a mais alta) com duração maior para enfatizar o sucesso
        await AudioUtils.playNote(successNotes[3]);
        // Esperar para garantir que a nota é ouvida completamente
        await new Promise(resolve => setTimeout(resolve, 600));
      } finally {
        // Garantir que a detecção seja retomada mesmo se houver erros
        await AudioUtils.resumePitchDetection();
      }
      
      return;
    } catch (error) {
      console.error('Erro ao tocar som de sucesso:', error);
      // Garantir que a detecção seja retomada em caso de erro
      await AudioUtils.resumePitchDetection();
    }
  };

  // Animate success flash
  const showSuccessFlash = () => {
    successFlashAnim.setValue(1);
    Animated.timing(successFlashAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Calculate volume meter styles
  const getVolumeBarWidth = () => {
    // Normalize volume to a percentage (convert to number for StyleSheet)
    return Math.min(100, currentVolume * 2000);
  };

  const volumeBarColor = () => {
    if (currentVolume >= settings.volumeThreshold) {
      return '#4CAF50'; // Verde quando está acima do threshold
    }
    return '#cccccc'; // Cinza quando está abaixo do threshold
  };

  // Revelar notas temporariamente
  const handleRevealNotes = () => {
    setTemporarilyShowNotes(true);
    // Esconder as notas após 3 segundos
    setTimeout(() => {
      setTemporarilyShowNotes(false);
    }, 3000);
  };

  // Render completed message
  if (isTrainingComplete) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Treinamento Concluído!</ThemedText>
        <ThemedText>Você completou todas as sequências.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Success flash overlay */}
      <Animated.View 
        style={[
          styles.successOverlay, 
          { opacity: successFlashAnim }
        ]} 
        pointerEvents="none"
      />
      
      <ThemedView style={styles.header}>
        <ThemedText type="title">
          Sequência {currentSequence} - {settings.instrument.charAt(0).toUpperCase() + settings.instrument.slice(1)}
        </ThemedText>
        <ThemedText>
          Toque {settings.repetitionsRequired}x para avançar • {correctSequencesPlayed}/{settings.repetitionsRequired}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.notesContainer}>
        <ThemedText type="subtitle">Notas na sequência:</ThemedText>
        {settings.showNotes || temporarilyShowNotes ? (
          <View style={styles.notesList}>
            {currentNotes.map((note, index) => (
              <ThemedView key={index} style={styles.noteItem}>
                <ThemedText>{note.name}</ThemedText>
                {notesPlayed.includes(index) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </ThemedView>
            ))}
          </View>
        ) : (
          <>
            <ThemedText style={styles.notesHiddenText}>
              As notas estão ocultas. Ouça a sequência e tente reproduzi-la sem ajuda visual.
            </ThemedText>
            <View style={styles.notesList}>
              {currentNotes.map((note, index) => (
                <ThemedView key={index} style={styles.hiddenNoteItem}>
                  {notesPlayed.includes(index) ? (
                    <ThemedText>✓</ThemedText>
                  ) : (
                    <ThemedText>?</ThemedText>
                  )}
                </ThemedView>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, styles.revealButton]}
              onPress={handleRevealNotes}
            >
              <ThemedText style={styles.buttonText}>Revelar Notas (3s)</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>

      <ThemedView style={styles.detectedNoteContainer}>
        <ThemedText type="subtitle">Nota detectada:</ThemedText>
        <ThemedText style={styles.detectedNoteText}>
          {detectedNote ? detectedNote.name : 'Nenhuma'}
        </ThemedText>
        
        {/* Medidor de volume */}
        {isListening && (
          <View style={styles.volumeMeterContainer}>
            <ThemedText style={styles.volumeLabel}>
              Volume: {currentVolume.toFixed(3)}
            </ThemedText>
            <View style={styles.volumeMeterBackground}>
              <View 
                style={[
                  styles.volumeMeterFill, 
                  { 
                    width: `${getVolumeBarWidth()}%`,
                    backgroundColor: volumeBarColor()
                  }
                ]} 
              />
              <View 
                style={[
                  styles.volumeThreshold,
                  { left: `${Math.min(100, settings.volumeThreshold * 2000)}%` }
                ]}
              />
            </View>
          </View>
        )}
      </ThemedView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.listenButton]} 
          onPress={playCurrentSequence}
        >
          <ThemedText style={styles.buttonText}>Ouvir sequência</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.backButton]} 
          onPress={onFinish}
        >
          <ThemedText style={styles.buttonText}>Voltar</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
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
  notesContainer: {
    marginBottom: 24,
    gap: 8,
  },
  notesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  noteItem: {
    minWidth: 60,
    alignItems: 'center',
    gap: 5,
    margin: 0,
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    bottom: -5,
    right: 5,
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detectedNoteContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  detectedNoteText: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  buttonContainer: {
    gap: 16,
    marginTop: 'auto',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    zIndex: 1,
  },
  listenButton: {
    backgroundColor: '#2196F3',
  },
  backButton: {
    backgroundColor: '#757575',
  },
  recordButton: {
    backgroundColor: '#F44336',
  },
  recordingButton: {
    backgroundColor: '#9c27b0',
  },
  volumeMeterContainer: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  volumeLabel: {
    marginBottom: 8,
    fontSize: 14,
  },
  volumeMeterBackground: {
    width: '100%',
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  volumeMeterFill: {
    height: '100%',
    borderRadius: 8,
  },
  volumeThreshold: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: 'red',
  },
  hiddenNoteItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    minWidth: 60,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notesHiddenText: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  revealButton: {
    backgroundColor: '#2196F3',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
}); 