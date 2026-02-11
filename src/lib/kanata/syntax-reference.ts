// ============================================================================
// Kanata Syntax Reference for AI Assistant System Prompt
// ============================================================================

/**
 * Condensed kanata configuration syntax reference (~2000 tokens).
 * Used as part of the AI assistant's system prompt so it can generate
 * valid .kbd configurations.
 */
export const KANATA_SYNTAX_REFERENCE = `
# Kanata Configuration Syntax Reference

## Comments
;; line comment
#| block comment |#

## defcfg - Global configuration
(defcfg
  process-unmapped-keys yes  ;; let unmapped keys pass through
  danger-enable-cmd yes      ;; allow cmd action (optional)
)

## defsrc - Physical key source layout
Declares which physical keys are remapped. Keys not listed pass through unchanged.
(defsrc
  grv  1    2    3    4    5    6    7    8    9    0    -    =    bspc
  tab  q    w    e    r    t    y    u    i    o    p    [    ]    \\
  caps a    s    d    f    g    h    j    k    l    ;    '    ret
  lsft z    x    c    v    b    n    m    ,    .    /    rsft
  lctl lmet lalt           spc            ralt rmet rctl
)

## deflayer - Layer definitions
Each deflayer must have the same number of actions as defsrc keys, in matching order.
(deflayer base
  grv  1    2    3    4    5    6    7    8    9    0    -    =    bspc
  tab  q    w    e    r    t    y    u    i    o    p    [    ]    \\
  esc  a    s    d    f    g    h    j    k    l    ;    '    ret
  lsft z    x    c    v    b    n    m    ,    .    /    rsft
  lctl lmet lalt           spc            ralt rmet rctl
)

## Special key actions
- _ : transparent (fall through to lower layer)
- XX : block/disable key
- lrld : live reload kanata config

## defalias - Named action shortcuts
(defalias
  nav (layer-toggle navigation)
  hm  (tap-hold 200 200 a lmet)
)
Use @name in layers to reference aliases: @nav, @hm

## defvar - Variables
(defvar
  tap-time 200
  hold-time 200
)
Reference with $name: $tap-time, $hold-time

## tap-hold variants
All take: (variant tap-timeout hold-timeout tap-action hold-action [extra...])

- tap-hold: basic, decides on key release
- tap-hold-press: decides on next key press
- tap-hold-release: decides on next key release (recommended for typing)
- tap-hold-release-keys: like release but with a list of keys that trigger tap
  (tap-hold-release-keys $tap-time $hold-time tap-action hold-action (keys-list))
- tap-hold-press-timeout: like press with timeout fallback
- tap-hold-release-timeout: like release with timeout fallback

Example home row mods (GACS order):
(defalias
  a_g (tap-hold 200 200 a lmet)    ;; A / GUI
  s_a (tap-hold 200 200 s lalt)    ;; S / Alt
  d_c (tap-hold 200 200 d lctl)    ;; D / Ctrl
  f_s (tap-hold 200 200 f lsft)    ;; F / Shift
  j_s (tap-hold 200 200 j rsft)    ;; J / Shift
  k_c (tap-hold 200 200 k rctl)    ;; K / Ctrl
  l_a (tap-hold 200 200 l ralt)    ;; L / Alt
  ;_g (tap-hold 200 200 ; rmet)    ;; ; / GUI
)

## Layer actions
- (layer-switch name)      : permanently switch to layer
- (layer-toggle name)      : toggle layer on/off
- (layer-while-held name)  : activate layer while key held

## multi - Multiple simultaneous actions
(multi lsft a)  ;; Shift+A
(multi lctl lalt del)  ;; Ctrl+Alt+Del

## macro - Key sequences
(macro h e l l o)        ;; type "hello"
(macro h i 100 w o r l d) ;; "hi", 100ms pause, "world"

## one-shot - Sticky modifier
(one-shot 2000 lsft)  ;; next key will be shifted, 2s timeout
Variants: one-shot, one-shot-press, one-shot-release, one-shot-press-pcancel, one-shot-release-pcancel

## tap-dance - Multiple tap actions
(tap-dance 200 (a b c))  ;; 1 tap=a, 2 taps=b, 3 taps=c

## Common key names
Letters: a-z
Numbers: 0-9
Modifiers: lsft rsft lctl rctl lalt ralt lmet rmet
Navigation: up down left rght home end pgup pgdn
Editing: bspc del ins ret tab esc spc
Punctuation: grv - = [ ] \\ ; ' , . /
Function: f1-f12
`;
