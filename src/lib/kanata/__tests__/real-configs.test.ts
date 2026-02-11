import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseKanataConfig } from '../parser';
import { generateConfig } from '../generator';

const SAMPLES_DIR = join(__dirname, '..', '..', '..', '..', 'kanata', 'cfg_samples');

function readSample(name: string): string {
  return readFileSync(join(SAMPLES_DIR, name), 'utf-8');
}

describe('real config file parsing', () => {
  it('parses home-row-mod-basic.kbd', () => {
    const input = readSample('home-row-mod-basic.kbd');
    const config = parseKanataConfig(input);

    expect(config.defcfg['process-unmapped-keys']).toBe('yes');
    expect(config.defsrc).toEqual(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);
    expect(config.variables.length).toBe(2);
    expect(config.aliases.length).toBe(8);
    expect(config.layers.length).toBe(1);
    expect(config.layers[0].name).toBe('base');
  });

  it('parses home-row-mod-advanced.kbd', () => {
    const input = readSample('home-row-mod-advanced.kbd');
    const config = parseKanataConfig(input);

    expect(config.defcfg['process-unmapped-keys']).toBe('yes');
    expect(config.defsrc).toEqual(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);
    expect(config.variables.length).toBe(4);
    expect(config.aliases.length).toBe(9); // tap + 8 key aliases
    expect(config.layers.length).toBe(2);
    expect(config.layers[0].name).toBe('base');
    expect(config.layers[1].name).toBe('nomods');
    expect(config.fakekeys.length).toBe(1);
  });

  it('parses simple.kbd with full keyboard', () => {
    const input = readSample('simple.kbd');
    const config = parseKanataConfig(input);

    expect(config.defsrc.length).toBeGreaterThan(40);
    expect(config.layers.length).toBeGreaterThanOrEqual(2);
  });

  it('round-trips home-row-mod-basic.kbd through generate and reparse', () => {
    const input = readSample('home-row-mod-basic.kbd');
    const original = parseKanataConfig(input);
    const generated = generateConfig(original);
    const reparsed = parseKanataConfig(generated);

    expect(reparsed.defcfg).toEqual(original.defcfg);
    expect(reparsed.defsrc).toEqual(original.defsrc);
    expect(reparsed.variables.length).toBe(original.variables.length);
    expect(reparsed.aliases.length).toBe(original.aliases.length);
    expect(reparsed.layers.length).toBe(original.layers.length);
    expect(reparsed.layers[0].name).toBe(original.layers[0].name);
  });

  it('round-trips home-row-mod-advanced.kbd through generate and reparse', () => {
    const input = readSample('home-row-mod-advanced.kbd');
    const original = parseKanataConfig(input);
    const generated = generateConfig(original);
    const reparsed = parseKanataConfig(generated);

    expect(reparsed.defcfg).toEqual(original.defcfg);
    expect(reparsed.defsrc).toEqual(original.defsrc);
    expect(reparsed.variables.length).toBe(original.variables.length);
    expect(reparsed.aliases.length).toBe(original.aliases.length);
    expect(reparsed.layers.length).toBe(original.layers.length);
    expect(reparsed.fakekeys.length).toBe(original.fakekeys.length);
  });
});
