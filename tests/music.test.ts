import { describe, expect, it } from 'vitest';
import { SONGS, arpLine, bassLine, drumLine, noteToMidi, parseChords, parseLead } from '../src/audio/songs';

describe('música', () => {
  it('notas y acordes', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('F#5')).toBe(78);
    expect(noteToMidi('Bb4')).toBe(70);
    expect(parseChords('Am F#m G7 Fmaj7')[1]).toEqual({ root: 6, tones: [0, 3, 7] });
  });

  for (const [id, song] of Object.entries(SONGS)) {
    it(`${id}: cada compás de la melodía cierra justo`, () => {
      const chords = parseChords(song.chords);
      const { notes, steps } = parseLead(song.lead);
      expect(steps).toBe(chords.length * 16);
      // Cada compás (separado por |) dura exactamente 16 semicorcheas.
      for (const bar of song.lead.split('|')) expect(parseLead(bar).steps).toBe(16);
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.midi).toBeGreaterThanOrEqual(55);
        expect(n.midi).toBeLessThanOrEqual(92);
      }
      expect(bassLine(chords, song.bass).every((n) => n.step < chords.length * 16)).toBe(true);
      expect(arpLine(chords)).toHaveLength(chords.length * 16);
      expect(drumLine(song.drums, chords.length).every((d) => d.step < chords.length * 16)).toBe(true);
    });
  }
});
