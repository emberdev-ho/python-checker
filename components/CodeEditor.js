'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { Decoration, keymap } from '@codemirror/view';
import { EditorState, Prec, StateEffect, StateField } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';

// Tô nền cả dòng bị lỗi
const setErrorLine = StateEffect.define();
const errorLineField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      deco = e.value == null
        ? Decoration.none
        : Decoration.set([Decoration.line({ class: 'cm-errorLine' }).range(tr.state.doc.line(e.value).from)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Màu cú pháp lấy từ biến CSS để tự đổi theo giao diện sáng/tối
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword, t.moduleKeyword], color: 'var(--syn-keyword)', fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: 'var(--syn-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--syn-number)' },
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: 'var(--syn-func)' },
  { tag: [t.standard(t.variableName), t.className], color: 'var(--syn-builtin)' },
  { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--syn-punct)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-code)', fontSize: '15px', lineHeight: '26px' },
  '.cm-content': { padding: '0 0 120px', caretColor: 'var(--ink)' },
  '.cm-gutters': { backgroundColor: 'var(--paper)', color: 'var(--muted)', border: 'none', borderRight: '2px solid var(--margin)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink)', fontWeight: '600' },
  '.cm-activeLine': { backgroundColor: 'var(--active-line)' },
  '.cm-cursor': { borderLeftColor: 'var(--ink)', borderLeftWidth: '2px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--selection) !important' },
  '.cm-matchingBracket': { backgroundColor: 'var(--match)', outline: 'none' },
  '.cm-tooltip': { fontFamily: 'var(--font-ui)', border: '1px solid var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' },
});

function toPos(doc, line, col) {
  const l = doc.line(Math.max(1, Math.min(line, doc.lines)));
  return Math.min(l.from + Math.max(0, col - 1), l.to);
}

const CodeEditor = forwardRef(function CodeEditor({ initialValue, onChange, onRun, marker }, ref) {
  const host = useRef(null);
  const view = useRef(null);
  const handlers = useRef({ onChange, onRun });
  handlers.current = { onChange, onRun };

  useEffect(() => {
    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        python(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        keymap.of([indentWithTab]),
        Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { handlers.current.onRun?.(); return true; } }])),
        syntaxHighlighting(highlight),
        lintGutter(),
        errorLineField,
        theme,
        EditorView.contentAttributes.of({ 'aria-label': 'Khung dán code Python', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) handlers.current.onChange?.(u.state.doc.toString()); }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => view.current.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật vết bút đỏ mỗi khi kết quả kiểm tra thay đổi
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const doc = v.state.doc;
    if (!marker) {
      v.dispatch(setDiagnostics(v.state, []), { effects: setErrorLine.of(null) });
      return;
    }
    let from = toPos(doc, marker.line, marker.col);
    let to = toPos(doc, marker.endLine, marker.endCol);
    if (to <= from) {
      to = Math.min(from + 1, doc.length);
      if (to === from && from > 0) from -= 1; // lỗi ở cuối dòng: tô ký tự cuối
    }
    const diag = setDiagnostics(v.state, [{ from, to, severity: 'error', message: marker.title.replace(/`/g, '') }]);
    v.dispatch(diag, { effects: setErrorLine.of(Math.min(marker.line, doc.lines)) });
  }, [marker]);

  useImperativeHandle(ref, () => ({
    setValue(text) {
      const v = view.current;
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
      v.focus();
    },
    goTo(line, col = 1) {
      const v = view.current;
      const pos = toPos(v.state.doc, line, col);
      v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
      v.focus();
    },
    focus() { view.current?.focus(); },
  }), []);

  return <div ref={host} className="editor-host" />;
});

export default CodeEditor;
