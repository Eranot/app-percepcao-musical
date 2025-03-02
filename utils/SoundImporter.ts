// This file helps handle imports for sounds that don't exist yet

import { InstrumentType } from '@/constants/AppContext';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';

// Mapeamento de nomes de notas para nomes de arquivos
// Note que utilizamos o formato onde # é representado por "-"
// Por exemplo: "C#3" é representado como "c-3.mp3"
const getNoteFileName = (noteName: string): string => {
  // Se parece com um nome de arquivo, retorna como está
  if (noteName.endsWith('.mp3')) {
    console.log(`Note name is already a file name: ${noteName}`);
    return noteName;
  }
  
  // Converter nomes como "C#3/Db3" para "c-3.mp3"
  const parts = noteName.split('/')[0]; // Pegar apenas a primeira parte (antes da barra)
  
  // Converter para lowercase e substituir # por - para corresponder ao nome de arquivo
  let cleanName = parts.toLowerCase().replace('#', '-');
  
  // Log para debug
  console.log(`Converting note name: ${noteName} -> file name: ${cleanName}.mp3`);
  
  return `${cleanName}.mp3`;
};

// Cache para os sons já carregados
type SoundCache = {
  [key: string]: {
    sound: Audio.Sound;
    lastUsed: number;
  };
};

class SoundManager {
  private soundCache: SoundCache = {};
  private currentInstrument: InstrumentType = 'synth';
  private cacheLimit = 20; // Limite de sons em cache
  private isAudioEnabled: boolean = false;

  constructor() {
    // Inicializar o Audio quando o SoundManager é criado
    this.initAudio();
  }

  // Inicializar o sistema de áudio
  async initAudio() {
    try {
      console.log("Initializing Expo Audio...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      this.isAudioEnabled = true;
      console.log("✅ Expo Audio initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Expo Audio:", error);
      this.isAudioEnabled = false;
    }
  }

  // Definir o instrumento atual
  setInstrument(instrument: InstrumentType) {
    console.log(`Setting instrument to: ${instrument}`);
    if (this.currentInstrument !== instrument) {
      this.currentInstrument = instrument;
      // Limpar cache ao mudar de instrumento
      this.clearCache();
    }
  }

  // Obter o caminho para o arquivo de som
  getSoundPath(noteName: string): string {
    const fileName = getNoteFileName(noteName);
    const path = `../assets/sounds/${this.currentInstrument}/${fileName}`;
    console.log(`Sound path for ${noteName}: ${path}`);
    return path;
  }

  // Carregar e reproduzir um som
  async playSound(noteName: string): Promise<void> {
    console.log(`⏯️ Attempting to play sound for note: ${noteName} (instrument: ${this.currentInstrument})`);
    
    try {
      // Verificar se o Audio está inicializado
      if (!this.isAudioEnabled) {
        console.log("Audio not initialized, attempting to initialize now...");
        await this.initAudio();
        if (!this.isAudioEnabled) {
          console.error("Failed to initialize audio, cannot play sound");
          return;
        }
      }
      
      const cacheKey = `${this.currentInstrument}_${noteName}`;
      
      // Verificar se o som já está em cache
      if (this.soundCache[cacheKey]) {
        console.log(`Using cached sound for ${noteName}`);
        const { sound } = this.soundCache[cacheKey];
        // Atualizar timestamp de uso
        this.soundCache[cacheKey].lastUsed = Date.now();
        
        // Resetar som para o início antes de reproduzir novamente
        await sound.setPositionAsync(0);
        console.log(`Playing cached sound for ${noteName}...`);
        await sound.playAsync();
        console.log(`✅ Successfully played cached sound for ${noteName}`);
        return;
      }

      // Gerenciar o tamanho do cache
      this.manageCacheSize();

      try {
        // Obter o asset específico para a nota
        console.log(`Getting specific sound asset for ${noteName}`);
        const soundAsset = this.getSpecificSoundAsset(noteName);
        console.log(`Sound asset obtained: `, soundAsset ? "Asset exists" : "No asset found");
        
        // Criar um novo objeto de som
        console.log(`Creating Sound object for ${noteName}...`);
        const soundResult = await Audio.Sound.createAsync(soundAsset, { shouldPlay: false });
        console.log(`Sound object created successfully:`, soundResult ? "Success" : "Failed");
        
        const { sound } = soundResult;

        // Adicionar ao cache
        this.soundCache[cacheKey] = {
          sound,
          lastUsed: Date.now()
        };
        console.log(`Added ${noteName} sound to cache`);

        // Reproduzir o som
        console.log(`Playing sound for ${noteName}...`);
        const playbackStatus = await sound.playAsync();
        console.log(`✅ Playback status:`, playbackStatus);
      } catch (error) {
        console.error(`❌ Error loading or playing sound ${noteName}:`, error);
        // Tentar com o som padrão se o som específico falhar
        try {
          console.log(`Trying fallback sound c4.mp3 for ${noteName}`);
          const fallbackSound = await Audio.Sound.createAsync(
            require('../assets/sounds/synth/c4.mp3')
          );
          await fallbackSound.sound.playAsync();
          console.log(`Played fallback sound for ${noteName}`);
        } catch (fallbackError) {
          console.error('Could not play fallback sound:', fallbackError);
        }
      }
    } catch (error) {
      console.error(`❌ Error in playSound for note ${noteName}:`, error);
    }
  }

  // Helper para obter os assets específicos para cada instrumento
  // Isso é necessário porque o React Native requer que os imports sejam estáticos
  private getSpecificSoundAsset(noteName: string): any {
    const fileName = getNoteFileName(noteName);
    console.log(`Finding asset for: ${noteName} -> ${fileName}`);
    
    // Suporte para o instrumento synth
    if (this.currentInstrument === 'synth') {
      switch (fileName) {
        // Notas do 2º octave
        case 'a2.mp3': 
          console.log('Loading asset: synth a2.mp3');
          return require('../assets/sounds/synth/a2.mp3');
        case 'a-2.mp3': 
          console.log('Loading asset: synth a-2.mp3');
          return require('../assets/sounds/synth/a-2.mp3');
        case 'b2.mp3': 
          console.log('Loading asset: synth b2.mp3');
          return require('../assets/sounds/synth/b2.mp3');
        case 'e2.mp3': 
          console.log('Loading asset: synth e2.mp3');
          return require('../assets/sounds/synth/e2.mp3');
        case 'f2.mp3': 
          console.log('Loading asset: synth f2.mp3');
          return require('../assets/sounds/synth/f2.mp3');
        case 'f-2.mp3': 
          console.log('Loading asset: synth f-2.mp3');
          return require('../assets/sounds/synth/f-2.mp3');
        case 'g2.mp3': 
          console.log('Loading asset: synth g2.mp3');
          return require('../assets/sounds/synth/g2.mp3');
        case 'g-2.mp3': 
          console.log('Loading asset: synth g-2.mp3');
          return require('../assets/sounds/synth/g-2.mp3');
        // Notas do 3º octave
        case 'a3.mp3': 
          console.log('Loading asset: synth a3.mp3');
          return require('../assets/sounds/synth/a3.mp3');
        case 'a-3.mp3': 
          console.log('Loading asset: synth a-3.mp3');
          return require('../assets/sounds/synth/a-3.mp3');
        case 'b3.mp3': 
          console.log('Loading asset: synth b3.mp3');
          return require('../assets/sounds/synth/b3.mp3');
        case 'c3.mp3': 
          console.log('Loading asset: synth c3.mp3');
          return require('../assets/sounds/synth/c3.mp3');
        case 'c-3.mp3': 
          console.log('Loading asset: synth c-3.mp3');
          return require('../assets/sounds/synth/c-3.mp3');
        case 'd3.mp3': 
          console.log('Loading asset: synth d3.mp3');
          return require('../assets/sounds/synth/d3.mp3');
        case 'd-3.mp3': 
          console.log('Loading asset: synth d-3.mp3');
          return require('../assets/sounds/synth/d-3.mp3');
        case 'e3.mp3': 
          console.log('Loading asset: synth e3.mp3');
          return require('../assets/sounds/synth/e3.mp3');
        case 'f3.mp3': 
          console.log('Loading asset: synth f3.mp3');
          return require('../assets/sounds/synth/f3.mp3');
        case 'f-3.mp3': 
          console.log('Loading asset: synth f-3.mp3');
          return require('../assets/sounds/synth/f-3.mp3');
        case 'g3.mp3': 
          console.log('Loading asset: synth g3.mp3');
          return require('../assets/sounds/synth/g3.mp3');
        case 'g-3.mp3': 
          console.log('Loading asset: synth g-3.mp3');
          return require('../assets/sounds/synth/g-3.mp3');
        
        // Notas do 4º octave
        case 'a4.mp3': 
          console.log('Loading asset: synth a4.mp3');
          return require('../assets/sounds/synth/a4.mp3');
        case 'a-4.mp3': 
          console.log('Loading asset: synth a-4.mp3');
          return require('../assets/sounds/synth/a-4.mp3');
        case 'b4.mp3': 
          console.log('Loading asset: synth b4.mp3');
          return require('../assets/sounds/synth/b4.mp3');
        case 'c4.mp3': 
          console.log('Loading asset: synth c4.mp3');
          return require('../assets/sounds/synth/c4.mp3');
        case 'c-4.mp3': 
          console.log('Loading asset: synth c-4.mp3');
          return require('../assets/sounds/synth/c-4.mp3');
        case 'd4.mp3': 
          console.log('Loading asset: synth d4.mp3');
          return require('../assets/sounds/synth/d4.mp3');
        case 'd-4.mp3': 
          console.log('Loading asset: synth d-4.mp3');
          return require('../assets/sounds/synth/d-4.mp3');
        case 'e4.mp3': 
          console.log('Loading asset: synth e4.mp3');
          return require('../assets/sounds/synth/e4.mp3');
        case 'f4.mp3': 
          console.log('Loading asset: synth f4.mp3');
          return require('../assets/sounds/synth/f4.mp3');
        case 'f-4.mp3': 
          console.log('Loading asset: synth f-4.mp3');
          return require('../assets/sounds/synth/f-4.mp3');
        case 'g4.mp3': 
          console.log('Loading asset: synth g4.mp3');
          return require('../assets/sounds/synth/g4.mp3');
        case 'g-4.mp3': 
          console.log('Loading asset: synth g-4.mp3');
          return require('../assets/sounds/synth/g-4.mp3');
        
        // Notas do 5º octave
        case 'a5.mp3': 
          console.log('Loading asset: synth a5.mp3');
          return require('../assets/sounds/synth/a5.mp3');
        case 'a-5.mp3': 
          console.log('Loading asset: synth a-5.mp3');
          return require('../assets/sounds/synth/a-5.mp3');
        case 'b5.mp3': 
          console.log('Loading asset: synth b5.mp3');
          return require('../assets/sounds/synth/b5.mp3');
        case 'c5.mp3': 
          console.log('Loading asset: synth c5.mp3');
          return require('../assets/sounds/synth/c5.mp3');
        case 'c-5.mp3': 
          console.log('Loading asset: synth c-5.mp3');
          return require('../assets/sounds/synth/c-5.mp3');
        case 'd5.mp3': 
          console.log('Loading asset: synth d5.mp3');
          return require('../assets/sounds/synth/d5.mp3');
        case 'd-5.mp3': 
          console.log('Loading asset: synth d-5.mp3');
          return require('../assets/sounds/synth/d-5.mp3');
        case 'e5.mp3': 
          console.log('Loading asset: synth e5.mp3');
          return require('../assets/sounds/synth/e5.mp3');
        case 'f5.mp3': 
          console.log('Loading asset: synth f5.mp3');
          return require('../assets/sounds/synth/f5.mp3');
        case 'f-5.mp3': 
          console.log('Loading asset: synth f-5.mp3');
          return require('../assets/sounds/synth/f-5.mp3');
        case 'g5.mp3': 
          console.log('Loading asset: synth g5.mp3');
          return require('../assets/sounds/synth/g5.mp3');
        case 'g-5.mp3': 
          console.log('Loading asset: synth g-5.mp3');
          return require('../assets/sounds/synth/g-5.mp3');
        
        // Nota extra
        case 'c6.mp3': 
          console.log('Loading asset: synth c6.mp3');
          return require('../assets/sounds/synth/c6.mp3');
          
        // Se não encontrar, tenta usar o fallback do piano
        default:
          return require('../assets/sounds/synth/c4.mp3');
      }
    }
    
    // Fallback
    console.log('⚠️ Using fallback sound: c4.mp3');
    return require('../assets/sounds/synth/c4.mp3');
  }

  // Gerenciar o tamanho do cache
  private manageCacheSize(): void {
    const keys = Object.keys(this.soundCache);
    console.log(`Cache size check: ${keys.length}/${this.cacheLimit}`);
    
    if (keys.length >= this.cacheLimit) {
      console.log('Cache limit reached, cleaning oldest sounds...');
      // Ordenar pelo menos recentemente usado
      keys.sort((a, b) => this.soundCache[a].lastUsed - this.soundCache[b].lastUsed);
      
      // Remover os mais antigos
      for (let i = 0; i < keys.length / 2; i++) {
        const key = keys[i];
        console.log(`Unloading cached sound: ${key}`);
        this.soundCache[key].sound.unloadAsync();
        delete this.soundCache[key];
      }
      console.log(`Cache cleaned, new size: ${Object.keys(this.soundCache).length}`);
    }
  }

  // Limpar o cache
  async clearCache(): Promise<void> {
    try {
      console.log('Clearing sound cache...');
      const keys = Object.keys(this.soundCache);
      for (const key of keys) {
        await this.soundCache[key].sound.unloadAsync();
      }
      this.soundCache = {};
      console.log('Sound cache cleared');
    } catch (error) {
      console.error('Error clearing sound cache:', error);
    }
  }

  // Descarregar todos os sons
  async unloadAll(): Promise<void> {
    console.log('Unloading all sounds...');
    await this.clearCache();
    console.log('All sounds unloaded');
  }
}

export default new SoundManager(); 