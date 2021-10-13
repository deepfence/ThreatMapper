/* eslint-disable guard-for-in */
/* eslint-disable no-unused-vars */
import { List as makeList } from 'immutable';
import { ROOT_NODE_ID } from '../../constants/topology-multicloud';

const nest = (items, id = null, link = 'parent_id') => items
  .filter(item => item[link] === id)
  .map(item => ({ ...item, children: nest(items, item.id) }));

const recursiveRemoveChildren = (data, children) => {
  if (children) {
    for (const i in children) {
      const child = children[i];
      if (child.children) {
        data = recursiveRemoveChildren(data, child.children);
      }
      const index = data.findIndex(item => item.id === child.id);
      if (index > -1) {
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

  addData(parentId, children) {
    // add parentId to children
    children.forEach((child) => {
      child.parent_id = parentId;
    });
    this.data = children;
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

  removeData(data, id) {
    this.data = this.data.delete(data);
  }

  removeChildren(children) {
    this.data = recursiveRemoveChildren(this.data, children);
  }

  getTableTreeData() {
    const data = nest(this.data.toJS());
    return data;
  }
}
