/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 */

/* eslint-env browser */

import * as React from 'react';
import classnames from 'classnames';
import invariant from 'assert';
import {scrollIntoView} from './scrollIntoView';

export function Tree({className, style, ...props}: Object) {
  return (
    <ol
      className={classnames('list-tree', className)}
      style={{position: 'relative', ...style}}
      {...props}
    />
  );
}

type TreeItemProps = {
  children?: mixed,
  className?: string,
  onSelect?: (e: SyntheticMouseEvent<>) => mixed,
  onConfirm?: (e: SyntheticMouseEvent<>) => mixed,
  onTripleClick?: (e: SyntheticMouseEvent<>) => mixed,
  selected?: boolean,
};

export class TreeItem extends React.Component<TreeItemProps> {
  _liNode: ?HTMLLIElement;
  _handleClick = handleClick.bind(this);

  scrollIntoView() {
    if (this._liNode != null) {
      scrollIntoView(this._liNode);
    }
  }

  render() {
    const {className, selected, children, ...remainingProps} = this.props;

    // don't forward these on to the <li>
    delete remainingProps.onConfirm;
    delete remainingProps.onSelect;
    delete remainingProps.onTripleClick;

    return (
      // $FlowFixMe(>=0.53.0) Flow suppress
      <li
        aria-selected={selected}
        className={classnames(
          className,
          {
            selected,
          },
          'list-item',
        )}
        {...remainingProps}
        onClick={this._handleClick}
        ref={liNode => (this._liNode = liNode)}
        role="treeitem"
        tabIndex={selected ? '0' : '-1'}>
        {selected && typeof children === 'string' ? (
          // String children must be wrapped to receive correct styles when selected.
          <span>{children}</span>
        ) : (
          children
        )}
      </li>
    );
  }
}

type NestedTreeItemProps = {
  title?: React.Node,
  children?: mixed,
  className?: string,
  hasFlatChildren?: boolean, // passthrough to inner TreeList
  selected?: boolean,
  collapsed?: boolean,
  onSelect?: (e: SyntheticMouseEvent<>) => mixed,
  onConfirm?: (e: SyntheticMouseEvent<>) => mixed,
  onTripleClick?: (e: SyntheticMouseEvent<>) => mixed,
};

export class NestedTreeItem extends React.Component<NestedTreeItemProps> {
  _itemNode: ?HTMLDivElement;
  _handleClick = (e: SyntheticMouseEvent<>) => {
    const itemNode = this._itemNode;
    if (itemNode == null) {
      return;
    }

    invariant(e.target instanceof Element);
    if (e.target.closest('.list-item') === itemNode) {
      handleClick.call(this, e);
    }
  };

  render() {
    const {
      className,
      hasFlatChildren,
      selected,
      collapsed,
      title,
      children,
      ...remainingProps
    } = this.props;

    // don't forward these on to the <li>
    delete remainingProps.onConfirm;
    delete remainingProps.onSelect;
    delete remainingProps.onTripleClick;

    return (
      <li
        aria-selected={selected}
        aria-expanded={!collapsed}
        className={classnames(
          className,
          {
            selected,
            collapsed,
          },
          'list-nested-item',
        )}
        {...remainingProps}
        onClick={this._handleClick}
        role="treeitem"
        tabIndex={selected ? '0' : '-1'}>
        {title == null ? null : (
          <div className="list-item" ref={node => (this._itemNode = node)}>
            {title}
          </div>
        )}
        <TreeList hasFlatChildren={hasFlatChildren}>{children}</TreeList>
      </li>
    );
  }
}

type TreeListProps = {
  className?: string,
  /* typically, instances of TreeItem or NestedTreeItem. */
  children?: mixed,
  showArrows?: boolean,
  hasFlatChildren?: boolean,
};
export const TreeList = (props: TreeListProps) => (
  // $FlowFixMe(>=0.53.0) Flow suppress
  <ul
    className={classnames(
      props.className,
      {
        'has-collapsable-children': props.showArrows,
        'has-flat-children': props.hasFlatChildren,
      },
      'list-tree',
    )}
    role="group">
    {props.children}
  </ul>
);

function handleClick(e: SyntheticMouseEvent<>): void {
  const {onSelect, onConfirm, onTripleClick} = this.props;

  const numberOfClicks = e.detail;
  switch (numberOfClicks) {
    case 1:
      onSelect && onSelect(e);
      break;
    case 2:
      onConfirm && onConfirm(e);
      break;
    case 3:
      onTripleClick && onTripleClick(e);
      break;
    default:
      break;
  }
}
