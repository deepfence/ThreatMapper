/* eslint-disable guard-for-in */
/* eslint-disable no-unused-vars */
import { List as makeList } from 'immutable';
import { ROOT_NODE_ID } from '../../constants/topology-multicloud';

const nest = (items, id = null, link = 'parent_id') => items
  .filter(item => item[link] === id)
  .map(item => ({ ...item, children: nest(items, item.id) }));

const recursiveRemoveChildren = (data, children, removedExpandedChildren) => {
  if (children) {
    for (const i in children) {
      const child = children[i];
      const childHasChildren = !!child?.children?.length;
      if (childHasChildren) {
        data = recursiveRemoveChildren(data, child.children, removedExpandedChildren);
      }
      const index = data.findIndex(item => item.id === child.id);
      if (index > -1) {
        if (childHasChildren) removedExpandedChildren.push(data.get(index))
        data = data.delete(index);
      }
    }
    return data;
  }
  return data;
};

export class MultiCloudTable {
  constructor(data, reRenderCb, tableOptions) {
    this.data = makeList(data);
    this.tableOptions = tableOptions;
    this.reRenderCb = reRenderCb;
  }

  updateData(parentId, delta) {
    if (parentId === ROOT_NODE_ID) {
      /* keeping parentId null for root
         to avoid self nesting */
      parentId = null;
    }

    if (!delta) {
      return this.data;
    }
    if (delta.remove) {
      delta.remove.forEach((child) => {
        const index = this.data.findIndex(item => item.id === child);
        // index will be -1 if not found
        if (index > -1) {
          this.data = this.data.delete(index);
        }
      });
    }

    if (delta.add) {
      delta.add.forEach((child) => {
        if (!child.pseudo) {
          const index = this.data.findIndex(item => item.id === child.id);
          child.parent_id = parentId;
          if (index === -1) this.data = this.data.push(child);
        }
      });
    }

    if (delta.update) {
      delta.update.forEach((child) => {
        if (!child.pseudo) {
          const index = this.data.findIndex(item => item.id === child.id);
          child.parent_id = parentId;
          if (index > -1) {
            this.data = this.data.set(index, child);
          }
        }
      });
    }
    this.reRenderCb();
    return this.data;
  }

  // returns removed children that were expanded
  removeChildren(children) {
    const removedExpandedChildren = [];
    this.data = recursiveRemoveChildren(this.data, children, removedExpandedChildren);
    return removedExpandedChildren;
  }

  getTableTreeData() {
    const data = nest(this.data.toJS());
    return data;
  }
}
