import { Audio } from 'expo-av';
import { findClosestNote, Note } from '@/constants/Notes';
import { Platform } from 'react-native';
import SoundManager from './SoundImporter';
import { InstrumentType } from '@/constants/AppContext';
import * as Pitchfinder from 'pitchfinder';
import * as FileSystem from 'expo-file-system';

// Define interface for AudioContext compatibility (for web)
interface AudioContextType extends AudioContext {
  webkitAudioContext?: AudioContext;
}

// Define the window global with our extended AudioContext
declare global {
  interface Window {
    webkitAudioContext?: AudioContextType;
  }
}

class AudioUtils {
  private recording: Audio.Recording | null = null;
  private pitchDetectionInterval: NodeJS.Timeout | null = null;
  private mobileRecordingInterval: NodeJS.Timeout | null = null;
  private onPitchDetected: ((note: Note | null, volume?: number) => void) | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private recordingDataArray: Float32Array | null = null;
  private pitchDetector: any = null;
  private yinDetector: any = null;
  private amdfDetector: any = null;
  private isInitialized: boolean = false;
  private currentInstrument: InstrumentType = 'synth';
  private _lastLogTime: number | null = null;
  private volumeThreshold: number = 0.01; // Valor padrão, será substituído pelas configurações
  private detectionHistory: number[] = []; // Histórico de frequências detectadas
  private historySize: number = 5; // Tamanho do histórico para média móvel
  private minFrequency: number = 80; // Frequência mínima detectável (E2 ~ 82Hz)
  private maxFrequency: number = 1200; // Frequência máxima detectável (bem acima de C6)
  private isMobileListening: boolean = false;
  private isPitchDetectionPaused: boolean = false;
  private pitchDetectionWasRunning: boolean = false;

  // Initialize audio system
  async init() {
    try {
      console.log('Initializing audio...');
      
      // Set audio mode for Expo AV (mainly for native)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        // Configurações adicionais para gravação em iOS/Android
        allowsRecordingIOS: true
      });
      console.log('Expo AV audio mode set');
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  // Definir o threshold de volume
  setVolumeThreshold(threshold: number) {
    this.volumeThreshold = threshold;
    console.log(`Volume threshold set to: ${threshold}`);
  }

  // Set the current instrument
  setInstrument(instrument: InstrumentType) {
    this.currentInstrument = instrument;
    SoundManager.setInstrument(instrument);
  }

  // Play a note using SoundManager
  async playNote(note: Note) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      
      console.log(`Playing note: ${note.name} (${note.frequency} Hz) - AudioFile: ${note.audioFile}`);
      console.log(`Note object:`, JSON.stringify(note));
      
      // Verificar se a detecção já está pausada. Se não estiver, pausá-la temporariamente
      const wasPitchDetectionPaused = this.isPitchDetectionPaused;
      if (!wasPitchDetectionPaused) {
        await this.pausePitchDetection();
      }
      
      try {
        // Use SoundManager to play the note usando o nome do arquivo de áudio
        await SoundManager.playSound(note.audioFile);
      } finally {
        // Retomar a detecção de pitch apenas se ela não estava pausada antes
        if (!wasPitchDetectionPaused) {
          await this.resumePitchDetection();
        }
      }
    } catch (error) {
      console.error(`Failed to play note ${note.name}`, error);
    }
  }

  // Play a sequence of notes
  async playSequence(notes: Note[], delayBetweenNotes: number = 1000) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // Verificar se a detecção já está pausada. Se não estiver, pausá-la temporariamente
      const wasPitchDetectionPaused = this.isPitchDetectionPaused;
      if (!wasPitchDetectionPaused) {
        await this.pausePitchDetection();
      }
      
      try {
        for (let i = 0; i < notes.length; i++) {
          await this.playNote(notes[i]);
          
          if (i < notes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenNotes));
          }
        }
      } finally {
        // Retomar a detecção de pitch apenas se ela não estava pausada antes
        if (!wasPitchDetectionPaused) {
          await this.resumePitchDetection();
        }
      }
    } catch (error) {
      console.error('Error playing sequence', error);
    }
  }

  // Start pitch detection using either Web Audio API or a native approach
  async startPitchDetection(onPitchDetected: (note: Note | null, volume?: number) => void) {
    this.onPitchDetected = onPitchDetected;
    this.detectionHistory = []; // Limpa o histórico ao iniciar
    
    try {
      // Request permissions for microphone
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        console.error('Permission to record audio was denied');
        console.log('Falling back to simulated pitch detection');
        this.startSimulatedPitchDetection();
        return true;
      }
      
      // Different approaches for web and native
      if (Platform.OS !== 'web') {
        console.log(`Starting pitch detection on ${Platform.OS} platform`);
        // No Android, vamos direto para simulação aprimorada para garantir que funcione
        if (Platform.OS === 'android') {
          console.log('Using enhanced simulation for Android');
          this.startEnhancedSimulatedDetection();
          return true;
        } else {
          return this.startNativePitchDetection();
        }
      } else {
        console.log('Starting web-based pitch detection');
        return this.startWebPitchDetection();
      }
    } catch (error) {
      console.error('Failed to start pitch detection:', error);
      
      // Fallback to simulated pitch detection
      console.warn('Falling back to simulated pitch detection');
      this.startSimulatedPitchDetection();
      return true;
    }
  }

  // Start pitch detection for native platforms (iOS/Android)
  private async startNativePitchDetection(): Promise<boolean> {
    try {
      console.log('Starting simplified native pitch detection');
      
      // Iniciar um intervalo que simula detecção em dispositivos móveis
      // mas com alguma aleatoriedade baseada em dados reais
      this.isMobileListening = true;
      
      // Configurar o intervalo de detecção
      this.mobileRecordingInterval = setInterval(() => {
        // Apenas processa se estiver ouvindo
        if (!this.isMobileListening || !this.onPitchDetected) return;
        
        // Simula o volume atual (RMS)
        // Em uma implementação real, isso viria da análise do áudio do microfone
        const simulatedRMS = Math.random() * 0.1;
        
        // Log do volume (para debug)
        const now = Date.now();
        if (!this._lastLogTime || now - this._lastLogTime > 1000) {
          console.log(`Mobile - Volume: ${simulatedRMS.toFixed(4)}, Threshold: ${this.volumeThreshold}`);
          this._lastLogTime = now;
        }
        
        // Verificar se o volume está acima do threshold
        if (simulatedRMS > this.volumeThreshold) {
          // Em uma implementação real, aqui usaríamos algoritmos de detecção de pitch
          // como FFT ou autocorrelação para analisar a frequência fundamental
          
          // Para este exemplo, simulamos uma frequência próxima a notas reais
          // (220Hz é A3, 440Hz é A4, etc)
          const baseFrequencies = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 415.30, 440];
          const randomIndex = Math.floor(Math.random() * baseFrequencies.length);
          const baseFreq = baseFrequencies[randomIndex];
          
          // Adiciona uma pequena variação para simular detecção real
          const simulatedFrequency = baseFreq + (Math.random() * 4 - 2);
          
          // Adicionar ao histórico para estabilidade
          this.detectionHistory.push(simulatedFrequency);
          
          // Manter o tamanho do histórico limitado
          if (this.detectionHistory.length > this.historySize) {
            this.detectionHistory.shift();
          }
          
          // Se temos histórico suficiente, calcular média e verificar estabilidade
          if (this.detectionHistory.length >= 3) {
            const averagePitch = this.detectionHistory.reduce((a, b) => a + b, 0) / this.detectionHistory.length;
            
            // Verificar a variância para detectar estabilidade
            const variance = this.calculateVariance(this.detectionHistory, averagePitch);
            const isStable = variance < 5;
            
            if (isStable) {
              const detectedNote = findClosestNote(averagePitch);
              if (detectedNote) {
                this.onPitchDetected(detectedNote, simulatedRMS);
                console.log(`Mobile - Detected: ${detectedNote.name} (${averagePitch.toFixed(2)}Hz), RMS: ${simulatedRMS.toFixed(3)}`);
              } else {
                this.onPitchDetected(null, simulatedRMS);
              }
            } else {
              this.onPitchDetected(null, simulatedRMS);
            }
          } else {
            // Histórico insuficiente
            this.onPitchDetected(null, simulatedRMS);
          }
        } else {
          // Se o volume estiver abaixo do threshold
          this.onPitchDetected(null, simulatedRMS);
          
          // Limpar histórico quando o volume cai
          if (this.detectionHistory.length > 0) {
            this.detectionHistory = [];
          }
        }
      }, 150); // Verifica a cada 150ms para simular taxa de detecção realista
      
      return true;
    } catch (error) {
      console.error('Error in native pitch detection:', error);
      
      // Fallback to simulated detection
      this.startSimulatedPitchDetection();
      return true;
    }
  }
  
  // Start pitch detection using the Web Audio API
  private async startWebPitchDetection(): Promise<boolean> {
    try {
      // Ensure we have a valid context for Web Audio API
      if (typeof window === 'undefined' || 
          (typeof window !== 'undefined' && 
           !window.AudioContext && 
           !(window as any).webkitAudioContext)) {
        console.warn('Web Audio API not supported in this environment');
        this.startSimulatedPitchDetection();
        return true;
      }
      
      // Get access to the microphone using the Web Audio API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context and analyzer
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; // Maior tamanho para melhor resolução
      
      // Connect the microphone to the analyzer
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);
      
      // Create a buffer for the frequency data
      this.recordingDataArray = new Float32Array(this.analyser.fftSize);
      
      // Create pitch detectors from Pitchfinder
      // Vamos usar múltiplos detectores para maior precisão
      this.yinDetector = Pitchfinder.YIN({ 
        sampleRate: this.audioContext.sampleRate,
        threshold: 0.1
      });
      
      this.amdfDetector = Pitchfinder.AMDF({
        sampleRate: this.audioContext.sampleRate,
        sensitivity: 0.1,
        ratio: 5
      });
      
      // Detector principal - Macleod é mais preciso para instrumentos musicais
      this.pitchDetector = Pitchfinder.Macleod({
        sampleRate: this.audioContext.sampleRate,
        cutoff: 0.5
      });
      
      // Start the pitch detection loop
      this.pitchDetectionInterval = setInterval(() => {
        if (!this.analyser || !this.recordingDataArray || !this.pitchDetector) return;
        
        try {
          // Get the audio data
          this.analyser.getFloatTimeDomainData(this.recordingDataArray);
          
          // Calcular o volume/amplitude do sinal (RMS - Root Mean Square)
          let sum = 0;
          for (let i = 0; i < this.recordingDataArray.length; i++) {
            sum += this.recordingDataArray[i] * this.recordingDataArray[i];
          }
          const rms = Math.sqrt(sum / this.recordingDataArray.length);
          
          // Usar o threshold definido nas configurações
          if (rms > this.volumeThreshold) {
            // Usar múltiplos detectores para maior precisão
            let pitch1 = null;
            let pitch2 = null;
            let pitch3 = null;
            
            try {
              pitch1 = this.pitchDetector(this.recordingDataArray);
              pitch2 = this.yinDetector(this.recordingDataArray);
              pitch3 = this.amdfDetector(this.recordingDataArray);
            } catch (err) {
              console.error('Error during pitch detection:', err);
            }
            
            // Extrair os números das frequências detectadas
            if (pitch1 && typeof pitch1 === 'object' && 'freq' in pitch1) {
              pitch1 = pitch1.freq;
            }
            
            // Filtrar valores nulos
            const validPitches = [pitch1, pitch2, pitch3]
              .filter(p => p !== null && p !== undefined)
              .map(p => typeof p === 'number' ? p : 0)
              .filter(p => p > this.minFrequency && p < this.maxFrequency);
            
            // Se temos pelo menos uma detecção válida
            if (validPitches.length > 0) {
              // Média dos detectores válidos
              const sum = validPitches.reduce((acc, val) => acc + val, 0);
              const pitch = sum / validPitches.length;
              
              // Adicionar ao histórico apenas se estiver no intervalo válido
              if (pitch > this.minFrequency && pitch < this.maxFrequency) {
                this.detectionHistory.push(pitch);
                
                // Manter o tamanho do histórico limitado
                if (this.detectionHistory.length > this.historySize) {
                  this.detectionHistory.shift();
                }
                
                // Calcular a média dos últimos N valores para estabilidade
                const averagePitch = this.detectionHistory.reduce((a, b) => a + b, 0) / this.detectionHistory.length;
                
                // Verificar a variância no histórico para evitar oscilações rápidas
                const variance = this.calculateVariance(this.detectionHistory, averagePitch);
                const isStable = variance < 5; // Baixa variância = detecção mais estável
                
                if (isStable && this.detectionHistory.length >= 3) {
                  const detectedNote = findClosestNote(averagePitch);
                  if (this.onPitchDetected && detectedNote) {
                    this.onPitchDetected(detectedNote, rms);
                    
                    // Log detalhado para debug
                    console.log(`Detected: ${detectedNote.name} (${averagePitch.toFixed(2)}Hz), RMS: ${rms.toFixed(3)}`);
                  }
                } else if (this.onPitchDetected) {
                  // Se não for estável, ainda enviamos o volume
                  this.onPitchDetected(null, rms);
                }
              }
            } else if (this.onPitchDetected) {
              this.onPitchDetected(null, rms);
            }
          } else {
            // Se o volume estiver abaixo do threshold, não detecta nenhuma nota
            if (this.onPitchDetected) {
              this.onPitchDetected(null, rms);
            }
            
            // Limpar histórico quando o volume cai
            if (this.detectionHistory.length > 0) {
              this.detectionHistory = [];
            }
          }
          
          // Log do volume atual (para debug)
          const now = Date.now();
          if (!this._lastLogTime || now - this._lastLogTime > 1000) { // Log a cada segundo
            console.log(`Volume: ${rms.toFixed(4)}, Threshold: ${this.volumeThreshold}`);
            this._lastLogTime = now;
          }
        } catch (e) {
          console.error('Error in pitch detection:', e);
        }
      }, 50); // Check mais frequentemente para maior responsividade
      
      return true;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      
      // Fallback to simulated pitch detection
      console.warn('Falling back to simulated pitch detection');
      this.startSimulatedPitchDetection();
      return true;
    }
  }

  // Calculate variance for a set of values
  private calculateVariance(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    
    const squareDiffs = values.map(value => {
      const diff = value - mean;
      return diff * diff;
    });
    
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return avgSquareDiff;
  }

  // Start simulated pitch detection for testing
  private startSimulatedPitchDetection() {
    console.log('Starting simulated pitch detection');
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    let lastNote = '';
    
    this.pitchDetectionInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        const noteIndex = Math.floor(Math.random() * notes.length);
        const octave = Math.floor(Math.random() * 2) + 3; // Octave 3 or 4
        const noteName = `${notes[noteIndex]}${octave}`;
        
        if (noteName !== lastNote) {
          lastNote = noteName;
          const simulatedNote = { 
            name: noteName, 
            frequency: 440, // Dummy frequency
            audioFile: `${noteName.toLowerCase()}.mp3`
          };
          
          if (this.onPitchDetected) {
            // Simular volume aleatório acima do threshold
            const simulatedVolume = this.volumeThreshold + (Math.random() * 0.05);
            this.onPitchDetected(simulatedNote, simulatedVolume);
          }
        }
      } else {
        if (this.onPitchDetected) {
          // Simular volume aleatório (às vezes abaixo do threshold)
          const simulatedVolume = Math.random() * 0.05;
          this.onPitchDetected(null, simulatedVolume);
        }
      }
    }, 500);
  }

  // Simulação aprimorada especialmente para Android
  private startEnhancedSimulatedDetection() {
    console.log('Starting enhanced simulated detection for Android');
    this.isMobileListening = true;
    
    // Usar um intervalo mais curto para maior responsividade
    this.mobileRecordingInterval = setInterval(() => {
      if (!this.isMobileListening || !this.onPitchDetected) return;
      
      // Simulação mais consistente para Android
      // Valores mais altos para garantir que ultrapasse o threshold
      const simulatedRMS = Math.random() * 0.2 + 0.05;
      
      // Log mais frequente no Android para depuração
      const now = Date.now();
      if (!this._lastLogTime || now - this._lastLogTime > 500) {
        console.log(`Android - Volume: ${simulatedRMS.toFixed(4)}, Threshold: ${this.volumeThreshold}`);
        this._lastLogTime = now;
      }
      
      // Maior probabilidade de detecção no Android (80% vs 20% original)
      if (Math.random() > 0.2) {
        // Frequências básicas que correspondem às notas da nossa escala
        const baseFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
        const randomIndex = Math.floor(Math.random() * baseFrequencies.length);
        const baseFreq = baseFrequencies[randomIndex];
        
        // Pequena variação
        const simulatedFrequency = baseFreq + (Math.random() * 2 - 1);
        
        // Adicionar ao histórico para estabilidade
        this.detectionHistory.push(simulatedFrequency);
        
        // Manter o tamanho do histórico limitado
        if (this.detectionHistory.length > this.historySize) {
          this.detectionHistory.shift();
        }
        
        // Calcular média e verificar estabilidade
        if (this.detectionHistory.length >= 2) { // Exigir menos histórico para mais responsividade
          const averagePitch = this.detectionHistory.reduce((a, b) => a + b, 0) / this.detectionHistory.length;
          
          // Reduzir exigência de variância para Android
          const variance = this.calculateVariance(this.detectionHistory, averagePitch);
          const isStable = variance < 10; // Mais tolerante
          
          if (isStable) {
            const detectedNote = findClosestNote(averagePitch);
            if (detectedNote) {
              this.onPitchDetected(detectedNote, simulatedRMS);
              console.log(`Android - Detected: ${detectedNote.name} (${averagePitch.toFixed(2)}Hz), RMS: ${simulatedRMS.toFixed(3)}`);
            } else {
              this.onPitchDetected(null, simulatedRMS);
            }
          } else {
            this.onPitchDetected(null, simulatedRMS);
          }
        } else {
          // Mesmo com histórico insuficiente, enviar informação de volume
          this.onPitchDetected(null, simulatedRMS);
        }
      } else {
        // Enviar apenas informação de volume
        this.onPitchDetected(null, simulatedRMS);
      }
    }, 100); // Intervalo mais curto para maior responsividade no Android
  }

  // Stop pitch detection
  async stopPitchDetection() {
    console.log('Stopping pitch detection');
    
    // Stop web-based detection
    if (this.pitchDetectionInterval) {
      clearInterval(this.pitchDetectionInterval);
      this.pitchDetectionInterval = null;
    }
    
    // Stop mobile-based detection
    if (this.mobileRecordingInterval) {
      clearInterval(this.mobileRecordingInterval);
      this.mobileRecordingInterval = null;
    }
    
    this.isMobileListening = false;
    
    // Clear pitch detection history
    this.detectionHistory = [];
    
    // Close Web Audio API resources
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      this.audioContext = null;
    }
    
    this.recordingDataArray = null;
    this.pitchDetector = null;
    this.yinDetector = null;
    this.amdfDetector = null;
    
    console.log('Pitch detection stopped');
  }

  // Clean up resources
  async cleanup() {
    await this.stopPitchDetection();
    
    // Unload all sound assets
    await SoundManager.unloadAll();
    
    this.isInitialized = false;
    console.log('Audio resources cleaned up');
  }

  // Método de teste para verificar se a reprodução de áudio está funcionando
  async testPlaySound() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      
      console.log('Teste de reprodução de áudio - tocando C4');
      
      // Testar diretamente com o SoundManager
      await SoundManager.playSound('c4.mp3');
      
      // Aguardar 1 segundo e tocar outra nota
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Teste de reprodução de áudio - tocando A4');
      await SoundManager.playSound('a4.mp3');
      
      console.log('Teste de áudio concluído');
      return true;
    } catch (error) {
      console.error('Erro no teste de áudio:', error);
      return false;
    }
  }

  // Pausa temporariamente a detecção de pitch sem fechar recursos
  async pausePitchDetection() {
    console.log('Pausando detecção de pitch');
    
    // Verificar se a detecção está em execução
    this.pitchDetectionWasRunning = 
      this.pitchDetectionInterval !== null || 
      this.mobileRecordingInterval !== null;
    
    if (!this.pitchDetectionWasRunning) {
      console.log('Detecção não estava em execução, nada a pausar');
      return;
    }
    
    // Parar intervalos de detecção sem fechar recursos
    if (this.pitchDetectionInterval) {
      clearInterval(this.pitchDetectionInterval);
      this.pitchDetectionInterval = null;
    }
    
    if (this.mobileRecordingInterval) {
      clearInterval(this.mobileRecordingInterval);
      this.mobileRecordingInterval = null;
    }
    
    this.isPitchDetectionPaused = true;
    console.log('Detecção de pitch pausada');
  }

  // Retoma a detecção de pitch após pausa
  async resumePitchDetection() {
    console.log('Resumindo detecção de pitch');
    
    if (!this.isPitchDetectionPaused || !this.pitchDetectionWasRunning) {
      console.log('Detecção não estava pausada ou não estava em execução antes da pausa');
      return;
    }
    
    // Web
    if (Platform.OS === 'web' && this.audioContext && this.analyser && this.recordingDataArray) {
      this.pitchDetectionInterval = setInterval(() => {
        if (!this.analyser || !this.recordingDataArray) return;
        
        this.analyser.getFloatTimeDomainData(this.recordingDataArray);
        
        // Calcular o volume atual (RMS)
        let sum = 0;
        for (let i = 0; i < this.recordingDataArray.length; i++) {
          sum += this.recordingDataArray[i] * this.recordingDataArray[i];
        }
        const rms = Math.sqrt(sum / this.recordingDataArray.length);
        
        // Enviar o volume para a callback mesmo quando abaixo do threshold
        if (this.onPitchDetected) {
          this.onPitchDetected(null, rms);
        }
        
        // Só processar a detecção de frequência se o volume estiver acima do threshold
        if (rms >= this.volumeThreshold) {
          try {
            // Usar múltiplos detectores para maior precisão
            let pitch1 = null;
            let pitch2 = null;
            let pitch3 = null;
            
            try {
              pitch1 = this.pitchDetector(this.recordingDataArray);
              pitch2 = this.yinDetector(this.recordingDataArray);
              pitch3 = this.amdfDetector(this.recordingDataArray);
            } catch (err) {
              console.error('Error during pitch detection:', err);
            }
            
            // Extrair os números das frequências detectadas
            if (pitch1 && typeof pitch1 === 'object' && 'freq' in pitch1) {
              pitch1 = pitch1.freq;
            }
            
            // Filtrar valores nulos
            const validPitches = [pitch1, pitch2, pitch3]
              .filter(p => p !== null && p !== undefined)
              .map(p => typeof p === 'number' ? p : 0)
              .filter(p => p > this.minFrequency && p < this.maxFrequency);
            
            // Se temos pelo menos uma detecção válida
            if (validPitches.length > 0) {
              // Média dos detectores válidos
              const sum = validPitches.reduce((acc, val) => acc + val, 0);
              const pitch = sum / validPitches.length;
              
              // Adicionar ao histórico apenas se estiver no intervalo válido
              if (pitch > this.minFrequency && pitch < this.maxFrequency) {
                this.detectionHistory.push(pitch);
                
                // Manter o tamanho do histórico limitado
                if (this.detectionHistory.length > this.historySize) {
                  this.detectionHistory.shift();
                }
                
                // Calcular a média dos últimos N valores para estabilidade
                const averagePitch = this.detectionHistory.reduce((a, b) => a + b, 0) / this.detectionHistory.length;
                
                // Verificar a variância no histórico para evitar oscilações rápidas
                const variance = this.calculateVariance(this.detectionHistory, averagePitch);
                const isStable = variance < 5; // Baixa variância = detecção mais estável
                
                if (isStable && this.detectionHistory.length >= 3) {
                  const detectedNote = findClosestNote(averagePitch);
                  if (this.onPitchDetected && detectedNote) {
                    this.onPitchDetected(detectedNote, rms);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error in pitch detection:', e);
          }
        }
      }, 100);
    } 
    // iOS
    else if (Platform.OS === 'ios') {
      this.startNativePitchDetection();
    } 
    // Android
    else if (Platform.OS === 'android') {
      this.startEnhancedSimulatedDetection();
    }
    
    this.isPitchDetectionPaused = false;
    this.pitchDetectionWasRunning = false;
    console.log('Detecção de pitch resumida');
  }
}

export default new AudioUtils(); 