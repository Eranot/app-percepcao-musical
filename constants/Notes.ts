export interface Note {
  name: string;
  frequency: number;
  audioFile: string;
}

// Guitar standard tuning notes (E2, A2, D3, G3, B3, E4)
export const GUITAR_NOTES: Note[] = [
  // E string (low E - 6th string)
  { name: 'E2', frequency: 82.41, audioFile: 'e2.mp3' },
  { name: 'F2', frequency: 87.31, audioFile: 'f2.mp3' },
  { name: 'F#2/Gb2', frequency: 92.50, audioFile: 'f-2.mp3' },
  { name: 'G2', frequency: 98.00, audioFile: 'g2.mp3' },
  { name: 'G#2/Ab2', frequency: 103.83, audioFile: 'g-2.mp3' },
  { name: 'A2', frequency: 110.00, audioFile: 'a2.mp3' },
  { name: 'A#2/Bb2', frequency: 116.54, audioFile: 'a-2.mp3' },
  { name: 'B2', frequency: 123.47, audioFile: 'b2.mp3' },
  { name: 'C3', frequency: 130.81, audioFile: 'c3.mp3' },
  { name: 'C#3/Db3', frequency: 138.59, audioFile: 'c-3.mp3' },
  { name: 'D3', frequency: 146.83, audioFile: 'd3.mp3' },
  { name: 'D#3/Eb3', frequency: 155.56, audioFile: 'd-3.mp3' },
  { name: 'E3', frequency: 164.81, audioFile: 'e3.mp3' },
  { name: 'F3', frequency: 174.61, audioFile: 'f3.mp3' },
  { name: 'F#3/Gb3', frequency: 185.00, audioFile: 'f-3.mp3' },
  { name: 'G3', frequency: 196.00, audioFile: 'g3.mp3' },
  { name: 'G#3/Ab3', frequency: 207.65, audioFile: 'g-3.mp3' },
  { name: 'A3', frequency: 220.00, audioFile: 'a3.mp3' },
  { name: 'A#3/Bb3', frequency: 233.08, audioFile: 'a-3.mp3' },
  { name: 'B3', frequency: 246.94, audioFile: 'b3.mp3' },
  { name: 'C4', frequency: 261.63, audioFile: 'c4.mp3' },
  { name: 'C#4/Db4', frequency: 277.18, audioFile: 'c-4.mp3' },
  { name: 'D4', frequency: 293.66, audioFile: 'd4.mp3' },
  { name: 'D#4/Eb4', frequency: 311.13, audioFile: 'd-4.mp3' },
  { name: 'E4', frequency: 329.63, audioFile: 'e4.mp3' },
  { name: 'F4', frequency: 349.23, audioFile: 'f4.mp3' },
  { name: 'F#4/Gb4', frequency: 369.99, audioFile: 'f-4.mp3' },
  { name: 'G4', frequency: 392.00, audioFile: 'g4.mp3' },
  { name: 'G#4/Ab4', frequency: 415.30, audioFile: 'g-4.mp3' },
  { name: 'A4', frequency: 440.00, audioFile: 'a4.mp3' },
  { name: 'A#4/Bb4', frequency: 466.16, audioFile: 'a-4.mp3' },
  { name: 'B4', frequency: 493.88, audioFile: 'b4.mp3' },
  { name: 'C5', frequency: 523.25, audioFile: 'c5.mp3' },
  { name: 'C#5/Db5', frequency: 554.37, audioFile: 'c-5.mp3' },
  { name: 'D5', frequency: 587.33, audioFile: 'd5.mp3' },
  { name: 'D#5/Eb5', frequency: 622.25, audioFile: 'd-5.mp3' },
  { name: 'E5', frequency: 659.26, audioFile: 'e5.mp3' },
  { name: 'F5', frequency: 698.46, audioFile: 'f5.mp3' },
  { name: 'F#5/Gb5', frequency: 739.99, audioFile: 'f-5.mp3' },
  { name: 'G5', frequency: 783.99, audioFile: 'g5.mp3' },
  { name: 'G#5/Ab5', frequency: 830.61, audioFile: 'g-5.mp3' },
  { name: 'A5', frequency: 880.00, audioFile: 'a5.mp3' },
  { name: 'A#5/Bb5', frequency: 932.33, audioFile: 'a-5.mp3' },
  { name: 'B5', frequency: 987.77, audioFile: 'b5.mp3' },
];

// Function to find the closest note to a given frequency
export function findClosestNote(frequency: number): Note | null {
  if (frequency <= 0) return null;
  
  let closestNote = GUITAR_NOTES[0];
  let minDifference = Math.abs(frequency - closestNote.frequency);
  
  for (let i = 1; i < GUITAR_NOTES.length; i++) {
    const difference = Math.abs(frequency - GUITAR_NOTES[i].frequency);
    if (difference < minDifference) {
      closestNote = GUITAR_NOTES[i];
      minDifference = difference;
    }
  }
  
  // If the difference is too large, it might not be a valid note
  if (minDifference > closestNote.frequency * 0.05) {
    return null;
  }
  
  return closestNote;
}

// Function to calculate the number of semitones between two notes
export function calculateSemitones(note1: Note, note2: Note): number {
  const index1 = GUITAR_NOTES.findIndex(note => note.name === note1.name);
  const index2 = GUITAR_NOTES.findIndex(note => note.name === note2.name);
  
  if (index1 === -1 || index2 === -1) return 0;
  
  return Math.abs(index2 - index1);
}

// Function to get a random note from the GUITAR_NOTES array
export function getRandomNote(): Note {
  const randomIndex = Math.floor(Math.random() * GUITAR_NOTES.length);
  return GUITAR_NOTES[randomIndex];
}

// Function to get a random note with maximum interval in semitones from reference note
export function getRandomNoteWithinInterval(referenceNote: Note, maxInterval: number): Note {
  const referenceIndex = GUITAR_NOTES.findIndex(note => note.name === referenceNote.name);
  if (referenceIndex === -1) return getRandomNote();
  
  const minIndex = Math.max(0, referenceIndex - maxInterval);
  const maxIndex = Math.min(GUITAR_NOTES.length - 1, referenceIndex + maxInterval);
  
  const randomIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex + 1));
  return GUITAR_NOTES[randomIndex];
} 