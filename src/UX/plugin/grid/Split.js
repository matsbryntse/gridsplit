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
 @class UX.plugin.grid.Split
 @extends Ext.AbstractPlugin
 
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
Ext.define('UX.plugin.grid.Split', {
    extend          : 'Ext.AbstractPlugin',
    alias           : 'plugin.gridsplit',
    menu            : null,
    gridClone       : null,
    splitCls        : 'ux-grid-split',
    resizeHandleCls : 'ux-grid-split-resize-handle',
    triggerEvent    : 'itemcontextmenu',
    splitText       : 'Split',
    mergeText       : 'Hide split section',

    enableScrollSync : true,

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

        grid.on('afterlayout', function () {
            this.setGrid(grid);
        }, this, { single : true });
    },

    setGrid : function (grid) {
        this.grid = grid;

        grid.on(this.triggerEvent, function (grid, item, node, index, e) {
            this.onMenuTriggerEvent(e);
        }, this);

        grid.getEl().on('contextmenu', this.onMenuTriggerEvent, this, { delegate : '.' + this.resizeHandleCls });

        if (grid.gridSplit) {
            this.split();
        }

        grid.split = Ext.Function.bind(this.split, this);
        grid.merge = Ext.Function.bind(this.merge, this);
    },

    onMenuTriggerEvent : function (e) {
        this.menu.showAt(e.getXY());
        this.menu.items.first().setText(this.isSplit() ? this.mergeText : this.splitText);
        this.splitPos = e.getY() - this.grid.getView().getEl().getY();

        e.stopEvent();
    },

    createMenu : function () {
        this.menu = new Ext.menu.Menu(Ext.apply({ defaults : { scope : this } }, this.menuConfig));
    },

    onMenuItemClick : function (menu, e) {
        if (this.isSplit()) {
            this.merge();
        } else {
            this.split(this.splitPos);
        }
    },

    cloneGrid : function (pos) {
        var config = {};
        Ext.apply(config, this.getCloneConfig(this.grid));

        Ext.apply(config, {
            __cloned  : true,
            dock      : 'bottom',
            height    : pos ? (this.getGridViewHeight() - pos) : this.getGridViewHeight() / 2,
            resizable : {
                pinned  : true,
                handles : 'n',
                dynamic : true
            },

            id          : null,
            xtype       : this.grid.xtype,
            dock        : 'bottom',
            hideHeaders : true,
            header      : false,
            bbar        : null,
            buttons     : null,
            tbar        : null,
            tools       : null,
            margin      : 0,
            padding     : 0,
            gridSplit   : false,
            columns     : this.grid.columns.map(this.cloneColumn, this)
        }, this.grid.initialConfig);

        return config;
    },

    getCloneConfig : function(grid) {},

    cloneColumn : function (col) {
        return col.cloneConfig({
            width : col.getWidth(),
            flex  : col.flex
        });
    },

    split : function (pos) {
        if (this.isSplit()) return;

        this.gridClone = this.grid.addDocked(this.cloneGrid(pos))[ 0 ];

        this.grid.addCls(this.splitCls);
        this.gridClone.addCls('ux-grid-clone');

        var resizeHandle = this.grid.getEl().down('.x-docked .x-resizable-handle-north');
        resizeHandle.addCls(this.resizeHandleCls);

        this.gridClone.mon(resizeHandle, 'dblclick', this.merge, this);

        this.setupSynchronization();

        this.grid.fireEvent('split', this);
    },

    merge : function () {
        if (this.isSplit()) {
            this.grid.removeCls(this.splitCls);
            this.gridClone.destroy();
            this.gridClone = null;

            this.grid.fireEvent('merge', this);
        }
    },

    isSplit : function () {
        return Boolean(this.gridClone);
    },

    getGridViewHeight : function () {
        var view = this.grid.lockedGrid ? this.grid.lockedGrid.getView() : this.grid.getView();

        return view.getHeight();
    },

    setupSynchronization : function () {
        if (this.enableScrollSync) {
            this.setupScrollSynchronization();
        }

        var grid  = this.grid.normalGrid || this.grid;
        var clone = this.gridClone.normalGrid || this.gridClone;

        this.setupColumnSync(grid.getHeaderContainer(), clone.getHeaderContainer());

        if (this.grid.normalGrid) {
            this.setupColumnSync(this.grid.lockedGrid.getHeaderContainer(), this.gridClone.lockedGrid.getHeaderContainer());
        }
    },

    setupScrollSynchronization : function () {
        var mainGrid    = this.grid.normalGrid || this.grid;
        var gridClone   = this.gridClone.normalGrid || this.gridClone;
        var mainScroll  = mainGrid.getView().getScrollable();
        var cloneScroll = gridClone.getView().getScrollable();

        mainScroll.addPartner(cloneScroll, 'x');
        mainGrid.getHeaderContainer().getScrollable().addPartner(cloneScroll, 'x');
    },

    setupColumnSync : function (mainHeaderCt, cloneHeaderCt) {
        cloneHeaderCt.mon(mainHeaderCt, {
            columnshow     : this.onColumnShow,
            columnhide     : this.onColumnHide,
            columnresize   : this.onColumnResize,

            scope : cloneHeaderCt
        });

        // Column lock/unlock etc, too big change to sync, simply trigger a new split
        cloneHeaderCt.mon(mainHeaderCt, {
            columnschanged : this.onColumnsChanged,
            scope          : this
        });
    },

    onColumnShow : function (mainHeaderCt, col) {
        var cloneHeaderCt = this;
        var cloneColumns  = cloneHeaderCt.getGridColumns();

        cloneColumns[ mainHeaderCt.items.indexOf(col) ].show();
    },

    onColumnHide : function (mainHeaderCt, col) {
        var cloneHeaderCt = this;
        var cloneColumns  = cloneHeaderCt.getGridColumns();

        cloneColumns[ mainHeaderCt.items.indexOf(col) ].hide();
    },

    onColumnResize : function (mainHeaderCt, col, width) {
        var cloneHeaderCt = this;
        var cloneColumns  = cloneHeaderCt.getGridColumns();

        cloneColumns[ mainHeaderCt.items.indexOf(col) ].setWidth(width);
    },

    onColumnsChanged : function (mainHeaderCt, col, fromIdx, toIdx) {
        var grid  = this.grid.normalGrid || this.grid;
        var clone = this.gridClone.normalGrid || this.gridClone;

        clone.getHeaderContainer().removeAll();
        clone.getHeaderContainer().add(grid.getHeaderContainer().getGridColumns().map(this.cloneColumn, this));

        if (this.grid.normalGrid) {
            grid  = this.grid.lockedGrid;
            clone = this.gridClone.lockedGrid;

            clone.getHeaderContainer().removeAll();
            clone.getHeaderContainer().add(grid.getHeaderContainer().getGridColumns().map(this.cloneColumn, this));

        }
    },

    destroy : function () {
        this.menu.destroy();
    }
})