/*
 The MIT License (MIT)

 Copyright (c) 2016 Mats Bryntse

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
/**
 @class UX.grid.Split

 A grid plugin adding the Excel 'split' feature. Sample usage:

    new Ext.grid.Panel({
        store       : store,
        columns     : [ {
            text      : 'Company<br>Name', // Two line header! Test header height synchronization!
            width     : 200,
            dataIndex : 'company'
        }, {
            text      : 'Price',
            width     : 97,
            dataIndex : 'price'
        } ],
        height      : 650,
        width       : 800,
        renderTo    : document.body,
        plugins     : [
            'gridsplit'
        ]
    });

 */
Ext.define('UX.grid.Split', {

    alias           : 'plugin.gridsplit',
    menu            : null,
    gridClone       : null,
    splitCls        : 'ux-grid-split',
    resizeHandleCls : 'ux-grid-split-resize-handle',
    triggerEvent    : 'itemcontextmenu',
    splitText       : 'Split',
    mergeText       : 'Hide split section',

    menuConfig : {
        plain : true,
        items : [
            {
                handler : 'onMenuItemClick'
            }
        ]
    },

    init : function (grid) {

        this.createMenu();

        grid.on('afterrender', function() {
            this.setGrid(grid);
        }, this);
    },

    setGrid : function (grid) {
        this.grid = grid;

        grid.on(this.triggerEvent, function (grid, item, node, index, e) {
            this.onMenuTriggerEvent(e);
        }, this);

        grid.getEl().on('contextmenu', this.onMenuTriggerEvent, this, { delegate : '.' + this.resizeHandleCls });
    },

    onMenuTriggerEvent : function (e) {
        this.menu.showAt(e.getXY());
        this.menu.items.first().setText(this.isSplit() ? this.mergeText : this.splitText);
        this.splitPos = e.getY() - this.grid.getView().getEl().getY();

        e.stopEvent();
    },

    createMenu : function () {
        this.menu = new Ext.menu.Menu(Ext.apply({ defaults : { scope : this }}, this.menuConfig));
    },

    onMenuItemClick : function (menu, e) {
        if (this.isSplit()) {
            this.merge();
        } else {
            this.split(this.splitPos);
        }
    },

    cloneGrid : function (pos) {
        return {
            dock      : 'bottom',
            height    : this.getGridViewHeight() - pos,
            resizable : {
                pinned  : true,
                handles : 'n',
                dynamic : true
            },

            xtype       : this.grid.xtype,
            dock        : 'bottom',
            hideHeaders : true,
            header      : false,
            bbar        : null,
            buttons     : null,
            tbar        : null,
            margin      : 0,
            padding     : 0,
            store       : this.grid.store,
            columns     : this.grid.columns.map(function (col) {
                return col.cloneConfig({
                    width : col.getWidth(),
                    flex  : col.flex
                });
            })
        }
    },

    split : function (pos) {
        this.gridClone = this.grid.addDocked(this.cloneGrid(pos))[ 0 ];

        this.grid.addCls(this.splitCls);

        var resizeHandle = this.grid.getEl().down('.x-docked .x-resizable-handle-north');
        resizeHandle.addCls(this.resizeHandleCls);
        
        this.gridClone.mon(resizeHandle, 'dblclick', this.merge, this);

        this.setupSynchronization();
    },

    merge : function () {
        this.grid.removeCls(this.splitCls);
        this.gridClone.destroy();
        this.gridClone = null;
    },

    isSplit : function () {
        return Boolean(this.gridClone);
    },

    getGridViewHeight : function () {
        var view = this.grid.lockedGrid ? this.grid.lockedGrid.getView() : this.grid.getView();

        return view.getHeight();
    },

    setupSynchronization : function () {
        this.setupScrollSynchronization();
        this.setupColumnSync();
    },

    setupScrollSynchronization : function () {
        var mainGrid    = this.grid.normalGrid || this.grid;
        var gridClone   = this.gridClone.normalGrid || this.gridClone;
        var mainScroll  = mainGrid.getView().getScrollable();
        var cloneScroll = gridClone.getView().getScrollable();

        mainScroll.addPartner(cloneScroll, 'x');
        mainGrid.getHeaderContainer().getScrollable().addPartner(cloneScroll, 'x');
    },

    setupColumnSync : function () {
        // TODO sync on col add, remove, resize, reorder etc
    },

    destroy : function () {
        this.menu.destroy();
    }
})