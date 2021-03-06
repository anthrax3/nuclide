/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {OutlineTree} from 'atom-ide-ui';
import type {
  SymbolInformation,
  Range,
} from '../../../../nuclide-vscode-language-service-rpc/lib/protocol';

import {SymbolKind} from '../../../../nuclide-vscode-language-service-rpc/lib/protocol';
import {isFunction} from '../symbols';

/**
 * Class that handles the symbol ranges that have already been processed. It's
 * useful for determining the parents of certain symbols by looking at the
 * ranges.
 */
export class SymbolRanges {
  _functions: Array<[Range, OutlineTree]> = [];
  _structuredObjects: Array<[Range, OutlineTree]> = []; // namespaces, classes, structs, etc.
  _variables: Array<[Range, OutlineTree]> = [];

  addSymbol(symbol: SymbolInformation, node: OutlineTree): void {
    if (isFunction(symbol)) {
      this._functions.push([symbol.location.range, node]);
    } else if (symbol.kind === SymbolKind.Variable) {
      this._variables.push([symbol.location.range, node]);
    } else {
      this._structuredObjects.push([symbol.location.range, node]);
    }
  }

  /**
   * 0: the ranges intersect
   * 1: range1 is strictly before range2
   * 2: range2 is strictly after range1
   */
  _compareRanges(range1: Range, range2: Range): number {
    const isLess = (a, b) =>
      a.end.line < b.start.line ||
      (a.end.line === b.start.line && a.end.character < b.start.character);
    return isLess(range1, range2) ? -1 : isLess(range2, range1) ? 1 : 0;
  }

  findParentFunction(range: Range): ?OutlineTree {
    for (let i = this._functions.length - 1; i >= 0; i--) {
      const [containerRange, node] = this._functions[i];
      const cmp = this._compareRanges(containerRange, range);
      if (cmp === 0) {
        return node;
      }
      if (cmp < 0) {
        // from this point on, all the functions are above the current symbol
        break;
      }
    }
    return null;
  }

  /**
   * This happens for cases in obj-c like this one
   *   @property (atomic, copy) NSString* threadKey;
   * where the property defines several symbols, e.g. _threadKey, threadKey,
   * setThreadKey, etc. in an overlapping range with the initial symbol
   */
  findOverlappingVariable(range: Range): ?OutlineTree {
    for (let i = this._variables.length - 1; i >= 0; i--) {
      const [containerRange, node] = this._variables[i];
      const cmp = this._compareRanges(containerRange, range);
      if (cmp === 0) {
        return node;
      }
      if (cmp < 0) {
        // from this point on, all the variables are above the current symbol
        break;
      }
    }
    return null;
  }

  findStructuredObjectParent(range: Range): ?OutlineTree {
    for (let i = this._structuredObjects.length - 1; i >= 0; i--) {
      const [containerRange, parent] = this._structuredObjects[i];
      if (this._compareRanges(containerRange, range) === 0) {
        return parent;
      }
    }
    return null;
  }
}
