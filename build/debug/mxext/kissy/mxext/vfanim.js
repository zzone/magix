/**
 * @fileOverview view转场动画
 * @author 行列
 * @version 1.0
 */
KISSY.add('mxext/vfanim',function(S,Vf,Magix){
	/**
	 * view转场动画实现
	 * @name VfAnim
	 * @namespace
	 * @example
	 * //当使用此插件时，您应该在Magix.start中增加一项viewChange的配置项来定制动画效果
	 * //如：
	 * 
	 * Magix.start({
	 * 	//...其它配置项
	 * 	viewChangeAnim:true,//是否使用动画
	 * 	viewChange:function(e){
	 *  		var S=KISSY;
	 * 		var offset=S.one(e.oldViewNode).offset();
	 * 		S.one(e.oldViewNode).css({backgroundColor:'#fff'});
	 * 		var distance=offset.top+S.one(e.oldViewNode).height();
	 * 		new S.Anim(e.oldViewNode,{top:-distance,opacity:0.2},1.2,'backIn',e.collectGarbage).run();
	 * 		S.one(e.newViewNode).css({opacity:0});
	 * 		new S.Anim(e.newViewNode,{opacity:1},2).run();
	 * 	}
	 * });
	 * 
	 * //参数说明：
	 * //e.vframeId {Strig} 在哪个vframe内发生的转场动画
	 * //e.oldViewNode {HTMLElement} 原来的view DOM节点
	 * //e.newViewNode {HTMLElement} 新创建的view DOM节点
	 * //e.action {String} 指示是哪种场景改变：viewChange view发生改变 viewRefresh view刷新
	 * //e.collectGarbage {Function} 当您在外部结束动画时，调用该方法清理不需要的垃圾DOM节点，请优先考虑该方法进行垃圾收集
	 *
	 *
	 * //关于转场动画说明：
	 * //转场动画仅适用对于同一个vframe渲染不同view时较安全，因为转场时页面上会同时存在
	 * //这2个view的html内容，而在view内部DOM操作时选择器通常不会意外的选择到其它节点上
	 * //
	 * //对于view的刷新不建议使用动画，因为2个view的html内容一样，DOM选择很容易发生失误
	 * //如果您需要view在刷新时使用动画，最好在代码中DOM选择器都加上id
	 * //类似：
	 *
	 * render:function(){
	 * 		var inputs=S.all('#'+this.id+' input');//加上id限定
	 * }
	 *
	 * 
	 */

	var EMPTY='';
	var mxConfig=Magix.config();
	var D=document;

	var cfgSceneChange=mxConfig.viewChange;
	var cfgSceneChangeIsFn=Magix.isFunction(cfgSceneChange);

	var $=function(id){
		return typeof id=='object'?id:D.getElementById(id);
	};
	return Magix.mix(Vf.prototype,{
		viewChangeUseAnim:function(){
			var me=this;
			
			return mxConfig.viewChangeAnim;
			/*var anim=me.$currentSupportAmin=(Math.random()<0.5)
			return anim;*/
		},
		oldViewDestroy:function(){
			var me=this;
			var ownerNode=$(me.id);
			var oldViewNode=$(me.viewId);
			var view=me.view;
			if(!oldViewNode){
				oldViewNode=D.createElement('div');
				while(ownerNode.firstChild){
					oldViewNode.appendChild(ownerNode.firstChild);
				}
				ownerNode.appendChild(oldViewNode);
			}
			oldViewNode.id=EMPTY;
			var events=view.events;
			if(events){
				for(var p in events){
					if(Magix.hasProp(events,p)){
						S.all('*[mx'+p+']').removeAttr('mx'+p);
					}
				}
			}
			if(!Magix.hasProp(me,'$animCounter')){
				me.$animCounter=0;
			}
			me.$animCounter++;
			me.$oldViewNode=oldViewNode;
		},
		prepareNextView:function(){
			var me=this;
			var ownerNode=$(me.id);
			var div=D.createElement('div');
			div.id=me.viewId;
			ownerNode.insertBefore(div,ownerNode.firstChild);
		},
		newViewCreated:function(isViewChange){
			var me=this;
			var oldViewNode=me.$oldViewNode;
			var newViewNode=$(me.viewId);
			if(cfgSceneChangeIsFn){
				Magix.safeExec(cfgSceneChange,{
					vframeId:me.id,
					action:isViewChange?'viewChange':'viewRefresh',
					oldViewNode:oldViewNode,
					newViewNode:newViewNode,
					collectGarbage:function(){
						me.$animCounter--;
						if(!me.$animCounter){
							delete me.$oldViewNode;
						}
						try{
							oldViewNode.parentNode.removeChild(oldViewNode);
						}catch(e){

						}
					}
				},me);
			}
		}
	});
},{
	requires:["magix/vframe","magix/magix","sizzle"]
});