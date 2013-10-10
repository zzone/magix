/*
    author:xinglie.lkf@taobao.com
 */
KISSY.add('exts/mmstatistics', function(S, MM) {
    var OldCreate = MM.create;
    var MS = {

    };
    var OnInit = function(e) {
        MS[this.id][e.meta.name] = new Date();
    };
    var OnDone = function(e) {
        console.log(new Date() - MS[this.id][e.meta.name]);
    };
    MM.create = function() {
        var mm = OldCreate.apply(this, arguments);
        MS[mm.id] = {

        };
        mm.on('init', OnInit);
        mm.on('done', OnDone);
        return mm;
    };
}, {
    requires: ['mxext/mmanager']
});