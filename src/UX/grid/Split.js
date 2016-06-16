Ext.define('UX.grid.Split', {

    alias           : 'plugin.gridsplit',
    menu            : null,
    gridClone       : null,
    splitCls        : 'ux-grid-split',
    resizeHandleCls : 'ux-grid-split-resize-handle',
    triggerEvent    : 'itemcontextmenu',

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
        this.menu.items.first().setText(this.isSplit() ? 'Hide split section' : 'Split');
        this.splitPos = e.getY() - this.grid.getView().getEl().getY();

        e.stopEvent();
    },

    createMenu : function () {
        this.menu = new Ext.menu.Menu({
            items : [
                {
                    text    : 'Split',
                    handler : function (menu, e) {
                        if (this.isSplit()) {
                            this.merge();
                        } else {
                            this.split(this.splitPos);
                        }
                    },
                    scope   : this
                }
            ]
        })
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
            layout      : 'border',
            columns     : this.grid.columns.map(function (col) {
                return col.cloneConfig();
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
        var mainGrid    = this.grid.normalGrid || this.grid;
        var gridClone   = this.gridClone.normalGrid || this.gridClone;
        var mainScroll  = mainGrid.getView().getScrollable();
        var cloneScroll = gridClone.getView().getScrollable();

        mainScroll.addPartner(cloneScroll, 'x');
        mainGrid.getHeaderContainer().getScrollable().addPartner(cloneScroll, 'x');
    },

    destroy : function () {
        this.menu.destroy();
    }
})