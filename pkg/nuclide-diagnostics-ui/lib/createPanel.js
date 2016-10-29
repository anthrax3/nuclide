'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {DiagnosticMessage} from '../../nuclide-diagnostics-common';

import {compareMessagesByFile} from './paneUtils';
import {React} from 'react-for-atom';
import DiagnosticsPanel from './DiagnosticsPanel';
import {renderReactRoot} from '../../commons-atom/renderReactRoot';
import {observableFromSubscribeFunction} from '../../commons-node/event';
import {toggle} from '../../commons-node/observable';
import {bindObservableAsProps} from '../../nuclide-ui/bindObservableAsProps';
import {BehaviorSubject, Observable} from 'rxjs';

type PanelProps = {
  diagnostics: Array<DiagnosticMessage>,
  onDismiss: () => void,
  pathToActiveTextEditor: ?string,
  filterByActiveTextEditor: boolean,
  onFilterByActiveTextEditorChange: (isChecked: boolean) => void,
  warnAboutLinter: boolean,
  showTraces: boolean,
  disableLinter: () => void,
};

export default function createDiagnosticsPanel(
  diagnostics: Observable<Array<DiagnosticMessage>>,
  initialHeight: number,
  initialfilterByActiveTextEditor: boolean,
  showTraces: Observable<boolean>,
  disableLinter: () => void,
  onFilterByActiveTextEditorChange: (filterByActiveTextEditor: boolean) => void,
  warnAboutLinterStream: Observable<boolean>,
): atom$Panel {
  const panelVisibility = new BehaviorSubject(true);
  const item = new DiagnosticsPanelModel(
    diagnostics,
    initialHeight,
    initialfilterByActiveTextEditor,
    showTraces,
    disableLinter,
    onFilterByActiveTextEditorChange,
    warnAboutLinterStream,
    () => { panel.hide(); },
    panelVisibility,
  );
  const panel = atom.workspace.addBottomPanel({item});
  const visibilityDisposable = panel.onDidChangeVisible(visible => {
    panelVisibility.next(visible);
  });
  panel.onDidDestroy(() => { visibilityDisposable.dispose(); });
  return panel;
}

class DiagnosticsPanelModel {
  _element: ?HTMLElement;
  _props: Observable<PanelProps>;

  constructor(
    diagnostics: Observable<Array<DiagnosticMessage>>,
    initialHeight: number,
    initialfilterByActiveTextEditor: boolean,
    showTraces: Observable<boolean>,
    disableLinter: () => void,
    onFilterByActiveTextEditorChange: (filterByActiveTextEditor: boolean) => void,
    warnAboutLinterStream: Observable<boolean>,
    onHide: () => void,
    panelVisibility: Observable<boolean>,
  ) {
    // A stream that contains the props, but is "muted" when the panel's not visible.
    this._props = toggle(
      getPropsStream(
        diagnostics,
        warnAboutLinterStream,
        showTraces,
        initialHeight,
        initialfilterByActiveTextEditor,
        disableLinter,
        onFilterByActiveTextEditorChange,
        onHide,
      )
        .publishReplay(1)
        .refCount(),
      panelVisibility.distinctUntilChanged(),
    );
  }

  getElement(): HTMLElement {
    if (this._element == null) {
      const Component = bindObservableAsProps(this._props, DiagnosticsPanel);
      const element = renderReactRoot(<Component />);
      element.classList.add('nuclide-diagnostics-ui');
      this._element = element;
    }
    return this._element;
  }
}

function getPropsStream(
  diagnosticsStream: Observable<Array<DiagnosticMessage>>,
  warnAboutLinterStream: Observable<boolean>,
  showTraces: Observable<boolean>,
  initialHeight: number,
  initialfilterByActiveTextEditor: boolean,
  disableLinter: () => void,
  onFilterByActiveTextEditorChange: (filterByActiveTextEditor: boolean) => void,
  onDismiss: () => void,
): Observable<PanelProps> {
  const activeTextEditorPaths = observableFromSubscribeFunction(
    atom.workspace.observeActivePaneItem.bind(atom.workspace),
  )
    .map(paneItem => {
      if (atom.workspace.isTextEditor(paneItem)) {
        const textEditor: atom$TextEditor = (paneItem: any);
        return textEditor ? textEditor.getPath() : null;
      }
    })
    .distinctUntilChanged();

  const sortedDiagnostics = Observable.concat(
    Observable.of([]),
    diagnosticsStream.map(diagnostics => diagnostics.slice().sort(compareMessagesByFile)),
  );

  const filterByActiveTextEditorStream = new BehaviorSubject(initialfilterByActiveTextEditor);
  const handleFilterByActiveTextEditorChange = (filterByActiveTextEditor: boolean) => {
    filterByActiveTextEditorStream.next(filterByActiveTextEditor);
    onFilterByActiveTextEditorChange(filterByActiveTextEditor);
  };

  // $FlowFixMe: We haven't typed this function with this many args.
  return Observable.combineLatest(
    activeTextEditorPaths,
    sortedDiagnostics,
    warnAboutLinterStream,
    filterByActiveTextEditorStream,
    showTraces,
  )
    .map(([pathToActiveTextEditor, diagnostics, warnAboutLinter, filter, traces]) => ({
      pathToActiveTextEditor,
      diagnostics,
      warnAboutLinter,
      showTraces: traces,
      disableLinter,
      filterByActiveTextEditor: filter,
      onFilterByActiveTextEditorChange: handleFilterByActiveTextEditorChange,
      initialHeight,
      onDismiss,
    }));
}
