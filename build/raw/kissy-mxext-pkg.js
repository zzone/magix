/**
 * @fileOverview Model
 * @version 1.0
 * @author 行列
 */
KISSY.add("mxext/model",function(S,Magix){
    /**
     * Model类
     * @name Model
     * @namespace
     * @class
     * @constructor
     * @param {Object} ops 初始化Model时传递的其它参数对象
     * @property {String} uri 与后台接口对应的前端url key
     * @property {String} id model的唯一标识
     * @example
     * 项目中对Model的引用及配置：
     * KISSY.add("app/base/model",function(S,Model,io){
            return Model.extend(
                urlMap:{
                    'modules':{
                        'get':'/modules.jsp?action=get',
                        'set':'/modules.jsp?action=set'
                    }
                },
                parse:function(resp){
                    return resp;//可对返回的结果在这地方进行简单的处理
                },
                sync:function(model,ops){
                    var url=model.url();
                    var isJSONP=model.get('isJSONP');
                    return io({
                        url:url,
                        success:function(resp){
                            ops.success(resp);
                        }
                    });
                }
            });
        },{
            requires:["mxext/model","ajax"]
        });

        在view中的具体使用：

        render:function(){
            var m=new Model({
                uri:'modules:get'
            });
            m.load({
                success:function(data){
                    //TODO
                },
                error:function(msg){
                    //TODO
                }
            })
        }
     */
	var Model=function(ops){
        if(ops){
            this.set(ops);
        }
        this.id=S.guid('m');
        this.locker=false;
        this.hasLocker=false;
	};
    var ex=function(props,ctor){
        var fn=function(){
            fn.superclass.constructor.apply(this,arguments);
            if(ctor){
                Magix.safeExec(ctor,[],this);
            }
        }
        Magix.mix(fn,this,{prototype:true});
        return S.extend(fn,this,props);
    };
    Magix.mix(Model,{
        /**
         * @lends Model
         */
        /**
         * GET枚举
         * @type {String}
         */
        GET:'GET',
        /**
         * POST枚举
         * @type {String}
         */
        POST:'POST',
        /**
         * 继承
         * @function
         * @param {Object} props 方法对象
         * @param {Function} ctor 继承类的构造方法
         */
        extend:ex
    });


	Magix.mix(Model.prototype,{
        /**
         * @lends Model#
         */
        /**
         * url映射对象
         * @type {Object}
         */
        urlMap:{

        },
        /**
         * Model调用save或load方法后，与服务器同步的方法，供应用开发人员覆盖
         * @function
         * @param {Model} model model对象
         * @param {Object} ops 包含success error的参数信息对象
         * @return {XHR} 最好返回异步请求的对象
         */
        sync:Magix.noop,
        /**
         * 处理Model.sync成功后返回的数据
         * @function
         * @param {Object|String} resp 返回的数据
         * @return {Object}
         */
        parse:Magix.noop,
        /**
         * 获取通过setPostParams放入的参数
         * @return {String}
         */
        getPostParams:function () {
            return this.getParams("POST");
        },
        /**
         * 获取参数
         * @param {String} [key] 参数分组的key[Model.GET,Model.POST]，默认为Model.GET
         * @return {String}
         */
        getParams:function (key) {
            var me=this;
            if(!key){
                key=Model.GET;
            }else{
                key=key.toUpperCase();
            }
            var k='$'+key;
            var params=me[k];
            var arr=[];
            var v;
            if (params) {
                for (var p in params) {
                    v = params[p];
                    if (S.isArray(v)) {
                        for (var i = 0; i < v.length; i++) {
                            arr.push(p + '=' + encodeURIComponent(v[i]));
                        }
                    } else {
                        arr.push(p + '=' + encodeURIComponent(v));
                    }
                }
            }
            return arr.join('&');
        },
        /**
         * 设置get参数，只有未设置过的参数才进行设置
         * @param {Object|String} obj1 参数对象或者参数key
         * @param {String} [obj2] 参数内容
         */
        setParamsIf:function (obj1, obj2) {
            this.setParams(obj1, obj2, Model.GET,true);
        },
        /**
         * 设置参数
         * @param {String}   key      参数分组的key
         * @param {Object|String} obj1 参数对象或者参数key
         * @param {String} [obj2] 参数内容
         * @param {Boolean}   ignoreIfExist   如果存在同名的参数则不覆盖，忽略掉这次传递的参数
         * @param {Function} callback 对每一项参数设置时的回调
         */
        setParams:function (obj1,obj2,key,ignoreIfExist) {
            if(!key){
                key=Model.GET;
            }else{
                key=key.toUpperCase();
            }
            var me=this;
            if(!me.$keysCache)me.$keysCache={};
            me.$keysCache[key]=true;

            var k = '$' + key;
            if (!me[k])me[k] = {};
            if (S.isObject(obj1)) {
                for (var p in obj1) {
                    if (!ignoreIfExist || !me[k][p]) {
                        me[k][p] = obj1[p];
                    }
                }
            } else if(obj1&&obj2){
                if (!ignoreIfExist || !me[k][obj1]) {
                    me[k][obj1] = obj2;
                }
            }
        },
        /**
         * 设置post参数
         * @param {Object|String} obj1 参数对象或者参数key
         * @param {String} [obj2] 参数内容
         */
        setPostParams:function (obj1, obj2) {
            var me = this;
            me.setParams(obj1, obj2,Model.POST);
        },
        /**
         * 设置post参数，只有未设置过的参数才进行设置
         * @param {Object|String} obj1 参数对象或者参数key
         * @param {String} [obj2] 参数内容
         */
        setPostParamsIf:function(obj1,obj2){
        	var me=this;
        	me.setParams(obj1,obj2,Model.POST,true);
        },
        /**
         * 重置缓存的参数对象，对于同一个model反复使用前，最好能reset一下，防止把上次请求的参数也带上
         */
        reset:function () {
            var me=this;
            var keysCache=me.$keysCache;
            if(keysCache){
                for(var p in keysCache){
                    if(Magix.hasProp(keysCache,p)){
                        delete me['$'+p];
                    }
                }
                delete me.$keysCache;
            }
            var keys=me.$keys;
            var attrs=me.$attrs;
            if(keys){
                for(var i=0;i<keys.length;i++){
                    delete attrs[keys[i]];
                }
                delete me.$keys;
            }
        },
        /**
         * 获取model对象请求时的后台地址
         * @return {String}
         */
        url:function () {
            var self = this,
                uri = self.get('uri'),
                uris;
            if (uri) {
                uris = uri.split(':');
                var maps=self.urlMap;
                if(maps){
                    for (var i = 0, parent = maps; i < uris.length; i++) {
                        parent = parent[uris[i]];
                        if (parent === undefined) {
                            break;
                        } else if (i == uris.length - 1) {
                            uri=parent;
                        }
                    }
                }
            }else{
                
                throw new Error('model not set uri');
            }
            return uri;
        },
        /**
         * 获取属性
         * @param {String} key key
         * @return {Object}
         */
        get:function(key){
            var me=this;
            var attrs=me.$attrs;
            if(attrs){
                return attrs[key];
            }
            return null;
        },
        /**
         * 设置属性
         * @param {String|Object} key 属性对象或属性key
         * @param {Object} [val] 属性值
         */
        set:function(key,val,saveKeyList){
            var me=this;
            if(!me.$attrs)me.$attrs={};
            if(saveKeyList&&!me.$keys){
                me.$keys=[];
            }
            if(S.isObject(key)){
                for(var p in key){
                    if(saveKeyList){
                        me.$keys.push(p);
                    }
                    me.$attrs[p]=key[p];
                }
            }else if(key){
                if(saveKeyList){
                    me.$keys.push(key);
                }
                me.$attrs[key]=val;
            }
        },
        /**
         * 加载model数据
         * @param {Object} ops 请求选项
         */
        load:function(ops){
            this.request(ops);
        },
        /**
         * 保存model数据
         * @param {Object} ops 请求选项
         */
        save:function(ops){
            this.request(ops);
        },
        /**
         * 向服务器请求，加载或保存数据
         * @param {Object} ops 请求选项
         */
        request:function(ops){
            if(!ops)ops={};
            var success=ops.success;
            var error=ops.error;
            var me=this;
            if(!me.hasLocker||!me.locker){
                me.$abort=false;
                me.locker=me.hasLocker;
                ops.success=function(resp){
                    me.locker=false;
                    if(!me.$abort){
                        if(resp){
                            var val=me.parse(resp);
                            if(val){
                                if(S.isArray(val)){
                                    val={
                                        list:val
                                    };
                                }
                                me.set(val,null,true);
                            }
                        }
                        if(success){
                            success.apply(this,arguments);
                        }
                    }
                };
                ops.error=function(){
                    me.locker=false;
                    if(!me.$abort){
                        if(error)error.apply(this,arguments);
                    }
                };
                me.$trans=me.sync(me,ops);
            }
        },
        /**
         * 中止请求
         */
        abort:function(){
            var me=this;
            if(me.$trans&&me.$trans.abort){
                me.$trans.abort();
            }
            delete me.$trans;
            me.$abort=true;
        },
        /**
         * 开始事务
         * @example
         * //...
         * var userList=m.get('userList');//从model中取出userList数据
         * m.beginTransaction();//开始更改的事务
         * userList.push({userId:'123',userName:'xinglie'});//添加一个新用户
         * m.save({
         *     //...
         *     success:function(){
         *           m.endTransaction();//成功后通知model结束事务  
         *     },
         *     error:function(){
         *         m.rollbackTransaction();//出错，回滚到原始数据状态
         *     }
         * });
         * //应用场景：
         * //前端获取用户列表，添加，删除或修改用户后
         * //把新的数据提交到数据库，因model是数据的载体
         * //可能会直接在model原有的数据上修改，提交修改后的数据
         * //如果前端提交到服务器，发生失败时，需要把
         * //model中的数据还原到修改前的状态(当然也可以再次提交)
         * //
         * //注意：
         * //可能添加，删除不太容易应用这个方法，修改没问题
         * //
         */
        beginTransaction:function(){
            var me=this;
            me.$bakAttrs=S.clone(me.$attrs);
        },
        /**
         * 回滚对model数据做的更改
         */
        rollbackTransaction:function(){
            var me=this;
            var bakAttrs=me.$bakAttrs;
            if(bakAttrs){
                me.$attrs=bakAttrs;
                delete me.$bakAttrs;
            }
        },
        /**
         * 结束事务
         */
        endTransaction:function(){
            delete this.$bakAttrs;
        },
        /**
         * 给请求加锁，上个请求未完成时，不发起新的请求
         * @param {Boolean} locker 是否加锁
         */
        lock:function(locker){
            this.hasLocker=!!locker;
        }
	});
	return Model;
},{
    requires:["magix/magix"]
});/**
 * @fileOverview model管理工厂，可方便的对Model进行缓存和更新
 * @author 行列
 * @version 1.0
 **/
KISSY.add("mxext/modelfactory",function(S,Magix){
	/**
	 * 工厂类，可方便的对Model进行缓存和更新
	 * @name ModelFactory
	 * @class
	 * @namespace
	 * @param {Model} modelClass Model类
	 */
	var Factory=function(modelClass){
		var me=this;
		me.$modelClass=modelClass;
	};
	var WrapRequest=function(request){
		if(request._wraped_)return request;
		var req=function(ops){
			var bakSucc=ops.success;
			var model=this;
			var updateIdent=model.get('updateIdent');
			if(updateIdent){//有更新
				ops.success=function(){
					
					model.set('updateIdent',false);
					if(model._after){
						Magix.safeExec(model._after,model);
					}
					if(bakSucc){
						bakSucc.apply(ops);
					}
				}
				request.call(model,ops);
			}else{
				if(bakSucc){
					bakSucc.apply(ops);
				}
			}
		}
		req._wraped_=true;
		return req;
	};
	Magix.mix(Factory,{
		/**
		 * @lends ModelFactory
		 */
		/**
		 * Model类缓存对象
		 * @type {Object}
		 */
		mClsCache:{},
		/**
		 * 创建Model类工厂对象
		 * @param {String} key        标识key
		 * @param {Model} modelClass Model类
		 */
		create:function(key,modelClass){
			var me=this;
			if(!modelClass){
				throw new Error('Factory.create modelClass ungiven');
			}
			var cache=me.mClsCache;
			if(!key)key=S.guid();
			if(!cache[key]){
				cache[key]=new Factory(modelClass);
			}
			return cache[key];
		}
	});
	var FetchFlags={
		ALL:1,
		ANY:2,
		ONE:4
	};
	Magix.mix(Factory.prototype,{
		/**
		 * @lends ModelFactory#
		 */
		/**
		 * 注册APP中用到的model
		 * @param {Object|Array} models 模块描述信息
		 * @param {String} models.type app中model的唯一标识
		 * @param {Object} models.ops 传递的参数信息，如{uri:'test',isJSONP:true,updateIdent:true}
		 * @param {Object} models.gets 发起请求时，默认的get参数对象
		 * @param {Object} models.posts 发起请求时，默认的post参数对象
		 * @param {Function} models.before model在发起请求前的回调
		 * @param {Function} models.after model在发起请求，并且通过Model.sync调用success后的回调
		 * @example
		 * KISSY.add("app/base/mfactory",function(S,MFctory,Model){
				var MF=MFctory.create('test/mf',Model);
				MF.registerModels([
					{
						type:'Home_List',
						ops:{
							uri:'test'
						},
						gets:{
							a:'12'
						},
						before:function(m){
							
						},
						after:function(m){
							
						}
					},
					{
						type:'Home_List1',
						ops:{
							uri:'test'
						},
						before:function(m){
							
						},
						after:function(m){
							
						}
					}
				]);
				return MF;
			},{
				requires:["mxext/modelfactory","app/base/model"]
			});

			//使用

			KISSY.use('app/base/mfactory',function(S,MF){
				MF.fetchAll([{
					type:MF.Home_List,cacheKey:'aaa',gets:{e:'f'},
					type:MF.Home_List1,gets:{a:'b'}
				}],function(m1,m2){
	
				},function(msg){
	
				});
			});
		 */
		registerModels:function(models){
			/*
				type:'',
				ops:{
					uri:'',
					isJSONP:'',
					updateIdent:false
				},
				gets:'',
				posts:'',
				before:function(m){
	
				},
				after:function(m){
					
				}
			 */
			var me=this;
			if(!Magix.isArray(models)){
				models=[models];
			}
			for(var i=0,model;i<models.length;i++){
				model=models[i];
				if(!model.type){
					throw new Error('model must own a type attribute');
				}
				me[model.type]=model;
			}
		},
		/**
		 * 获取models，该用缓存的用缓存，该发起请求的请求
		 * @see ModelFactory#registerModels
		 * @param {Object|Array} models 获取models时的描述信息，如:{type:F.Home,cacheKey:'key',gets:{a:'12'},posts:{b:2}}
		 * @param {Function} succ   成功时的回调
		 * @param {Function} fail   失败时的回调
		 * @param {Integer} flag   获取哪种类型的models
		 * @return {Object} 返回一个带abort方法的对象，用于取消所有请求的model
		 */
		fetchModels:function(models,succ,fail,flag){
			var me=this;
			if(!me.$modelsCache)me.$modelsCache={};
			if(!me.$modelsCacheKeys)me.$modelsCacheKeys={};
			var modelsCache=me.$modelsCache;
			var modelsCacheKeys=me.$modelsCacheKeys;

			if(!Magix.isArray(models)){
				models=[models];
			}
			var total=models.length;
			var current=0;
			var failMsg;

			var doneArr=[];
			var abortArr=[];
			var hasOneSuccess;

			var doneFn=function(idx,isFail,model,args){
				current++;
				if(isFail){
					failMsg=args||'fetch data error';
				}else{
					hasOneSuccess=true;
					model.set('updateIdent',false);//成功后标识model不需要更新，防止需要缓存的model下次使用时发起请求
					doneArr[idx]=model;
					var cacheKey=model._cacheKey;
					if(cacheKey&&!Magix.hasProp(modelsCache,cacheKey)){//需要缓存
						modelsCache[model._cacheKey]=model;
						if(model._after){//有after
							Magix.safeExec(model._after,model);
						}
					}
					if(flag==FetchFlags.ONE){//如果是其中一个成功，则每次成功回调一次
						succ(model);
					}
				}
				var cacheKey=model._cacheKey;
				if(cacheKey&&Magix.hasProp(modelsCacheKeys,cacheKey)){
					var fns=modelsCacheKeys[cacheKey];
					delete modelsCacheKeys[cacheKey];
					//
					Magix.safeExec(fns,[isFail,model,args],model);
					//
				}
				if(flag!=FetchFlags.ONE){
					//
					if(current>=total){
						if(flag==FetchFlags.ANY){//任意一个成功
							if(hasOneSuccess){
								if(succ)succ.apply(me,doneArr);
							}else{
								if(fail)fail(failMsg);
							}
						}else{//所有的都要成功
							if(!failMsg){
								if(succ)succ.apply(me,doneArr);
							}else{
								if(fail)fail(failMsg);
							}
						}
					}
				}
			};
			//
			var Slice=Array.prototype.slice;
			var wrapDone=function(fn,context){
				var a = Slice.call(arguments, 2);
				return function(){
					return fn.apply(context,a.concat(Slice.call(arguments)));
				}
			};
			for(var i=0,model;i<models.length;i++){
				model=models[i];

				var cacheKey=model.cacheKey;
				var modelEntity;

				if(cacheKey&&Magix.hasProp(modelsCacheKeys,cacheKey)){
					modelsCacheKeys[cacheKey].push(wrapDone(doneFn,me,i));
				}else{
					modelEntity=me.create(model,true);
					var updateIdent=modelEntity.get('updateIdent');//是否需要更新
					if(updateIdent){
						abortArr.push(modelEntity);
						if(cacheKey){
							modelsCacheKeys[cacheKey]=[];
						}
						modelEntity.request({
							success:wrapDone(doneFn,modelEntity,i,false,modelEntity),
							error:wrapDone(doneFn,modelEntity,i,true,modelEntity)
						});
					}else{
						doneFn(i,false,modelEntity);
					}
				}
			}
			return {
				abort:function(){
					for(var i=0,m;i<abortArr.length;i++){
						m=abortArr[i];
						var cacheKey=m._cacheKey;
						if(cacheKey&&Magix.hasProp(modelsCacheKeys,cacheKey)){
							var fns=modelsCacheKeys[cacheKey];
							delete modelsCacheKeys[cacheKey];
							Magix.safeExec(fns,[true,m,'abort'],m);
						}
						m.abort();
					}
				}
			}
		},
		/**
		 * 获取models，所有成功才回调succ，任意一个失败最终会回调fail
		 * @param {Object|Array} models 获取models时的描述信息，如:{type:F.Home,cacheKey:'key',gets:{a:'12'},posts:{b:2}}
		 * @param {Function} succ   成功时的回调
		 * @param {Function} fail   失败时的回调
		 * @return {Array} 返回一个带abort方法的对象，用于取消所有请求的model
		 */
		fetchAll:function(models,succ,fail){
			/*
				[{type:F.ASide,cacheKey:'',gets:{},posts:{}}]
			 */
			return this.fetchModels(models,succ,fail,FetchFlags.ALL);
		},
		/**
		 * 获取models，其中任意一个成功最终回调succ，全部失败才回调fail
		 * @param {Object|Array} models 获取models时的描述信息，如:{type:F.Home,cacheKey:'key',gets:{a:'12'},posts:{b:2}}
		 * @param {Function} succ   成功时的回调
		 * @param {Function} fail   失败时的回调
		 * @return {Array} 返回一个带abort方法的对象，用于取消所有请求的model
		 */
		fetchAny:function(models,succ,fail){
			return this.fetchModels(models,succ,fail,FetchFlags.ANY);
		},
		/**
		 * 获取models，其中任意一个成功均立即回调，回调会被调用多次
		 * @param {Object|Array} models 获取models时的描述信息，如:{type:F.Home,cacheKey:'key',gets:{a:'12'},posts:{b:2}}
		 * @param {Function} callback   成功时的回调
		 * @return {Array} 返回一个带abort方法的对象，用于取消所有请求的model
		 */
		fetchOne:function(models,callback){
			return this.fetchModels(models,callback,Magix.noop,FetchFlags.ONE);
		},
		/**
		 * 尝试获取缓存的model
		 * @param {String} cacheKey 缓存时的key
		 * @return {Object} null或缓存的model
		 */
		getIf:function(cacheKey){
			var me=this;
			var modelsCache=me.$modelsCache;
			if(modelsCache&&Magix.hasProp(modelsCache,cacheKey)){
				return modelsCache[cacheKey];
			}
			return null;
		},
		/**
		 * 设置缓存的model需要更新
		 * @param {String} cacheKey 缓存时的key
		 */
		setUpdateIdent:function(cacheKey){
			var me=this;
			var model=me.getIf(cacheKey);
			if(model){
				model.set('updateIdent',true);
			}
		},
		/**
		 * 创建model对象
		 * @param {Object} model            model描述信息
		 * @param {Boolean} doNotWrapRequest 是否不对request进行包装，默认会对model的request进行一次包装，以完成后续的状态更新
		 * @return {Model} model对象
		 */
		create:function(model,doNotWrapRequest){
			if(!model.type){
				throw new Error('model must own a "type" attribute');
			}
			var me=this;
			var metas=model.type;
			var cacheKey=model.cacheKey||metas.cacheKey;
			var modelEntity;
			
			if(!me.$modelsCache)me.$modelsCache={};
			var modelsCache=me.$modelsCache;

			if(cacheKey&&Magix.hasProp(modelsCache,cacheKey)){//缓存
				
				modelEntity=modelsCache[cacheKey];

				var updateIdent=modelEntity.get('updateIdent');
				if(updateIdent){//当有更新时，从缓存中删除，防止多次获取该缓存对象导致数据错误
					delete modelsCache[cacheKey];
				}
			}else{
				
				modelEntity=new me.$modelClass(metas.ops);
				modelEntity._after=metas.after;
				modelEntity._cacheKey=cacheKey;
				modelEntity.set('updateIdent',true);
			}
			var updateIdent=modelEntity.get('updateIdent');//是否需要更新
			if(updateIdent){
				modelEntity.reset();
				
				modelEntity.set(model.ops);
				//默认设置的
				modelEntity.setParams(metas.gets);
				modelEntity.setPostParams(metas.posts);

				//临时传递的
				modelEntity.setParams(model.gets);
				modelEntity.setPostParams(model.posts);
				
				if(Magix.isFunction(metas.before)){
					Magix.safeExec(metas.before,modelEntity,metas);
				}
			}
			if(!doNotWrapRequest){
				modelEntity.request=WrapRequest(modelEntity.request);
			}
			return modelEntity;
		}
	});
	return Factory;
},{
	requires:["magix/magix"]
}); /**
  * Magix扩展的Mustache
  * @name Mu
  * @namespace
  * @requires Mustache
  * @author 李牧
  * @example
  * 支持简单的条件判断 如:
  * <pre>
    {{#list}}
    &nbsp;&nbsp;&nbsp;&nbsp;{{#if(status==P)}}ID:{{id}},status:&lt;b style='color:green'>通过&lt;/b>{{/if(status==P)}}
    &nbsp;&nbsp;&nbsp;&nbsp;{{#if(status==W)}}ID:{{id}},status:等待{{/if(status==W)}}
    &nbsp;&nbsp;&nbsp;&nbsp;{{#if(status==R)}}ID:{{id}},status&lt;b style='color:red'>拒绝&lt;/b>{{/if(status==R)}}
    {{/list}}
    </pre>
    对于数组对象可以通过{{__index__}}访问数组下标
  */
KISSY.add("mxext/mu",function(S,Mustache){
    var notRender=/\s*<script[^>]+type\s*=\s*(['"])\s*text\/tmpl\1[^>]*>([\s\S]*?)<\/script>\s*/gi;
    function addFns(template, data){
        var ifs = getConditions(template);
        var key = "";
        for (var i = 0; i < ifs.length; i++) {
            key = "if(" + ifs[i] + ")";
            if (data[key]) {
                continue;
            }
            else {
                data[key] = buildFn(ifs[i]);
            }
        }
    }
    function getConditions(template){
        var ifregexp_ig = /\{{2,3}[\^#]?if\((.*?)\)\}{2,3}?/ig;
        var ifregexp_i = /\{{2,3}[\^#]?if\((.*?)\)\}{2,3}?/i;
        var gx = template.match(ifregexp_ig);
        var ret = [];
        if (gx) {
            for (var i = 0; i < gx.length; i++) {
                ret.push(gx[i].match(ifregexp_i)[1]);
            }
        }
        return ret;
    }
    function buildFn(key){
        key = key.split("==");
        var res = function(){
            var ns = key[0].split("."), value = key[1];
            var curData = this;
            for (var i = ns.length - 1; i > -1; i--) {
                var cns = ns.slice(i);
                var d = curData;
                try {
                    for (var j = 0; j < cns.length - 1; j++) {
                        d = d[cns[j]];
                    }
                    if (cns[cns.length - 1] in d) {
                        if (d[cns[cns.length - 1]].toString() === value) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }
                } 
                catch (err) {
                }
            }
            return false;
        };
        return res;
    }
    function findArray(o, depth){
        var k, v;
        for (k in o) {
            v = o[k];
            if (v instanceof Array) {
                addArrayIndex(v);
            }
            else 
                if (typeof(v) == "object" && depth < 5) {
                    findArray(v, depth + 1);
                }
        }
    }
    function addArrayIndex(v){
        for (var i = 0; i < v.length; i++) {
            var o = v[i];
            if (typeof(o) == "object") {
                if (i === 0) {
                    o.__first__ = true;
                }
                else 
                    if (i == (v.length - 1)) {
                        o.__last__ = true;
                    }
                    else {
                        o.__mid__ = true;
                    }
                o.__index__ = i;
            }
        }
    }
    return {
        /**
         * @lends Mu
         */
        /**
         * 输出模板和数据,返回渲染后结果字符串,接口与Mustache完全一致
         * @method to_html
         * @param {String} template 模板字符串
         * @param {Object} data 数据Object
         * @return {String}
         */
        to_html: function(template, data){
            if (typeof(data) == "object") {
                findArray(data, 0);
            }
            var notRenders=template.match(notRender);
            if(notRenders){
                template=template.replace(notRender,function(){//防止不必要的解析
                    return '<script type="text/tmpl"></script>';
                });
                addFns(template, data);
                template=Mustache.to_html.apply(this, arguments);
                var idx=0;
                template=template.replace(notRender,function(){
                    return notRenders[idx++];
                });
            }else{
                addFns(template, data);
                template=Mustache.to_html.apply(this, arguments);
            }
            return template;
        }
    };
},{
	requires:["mxext/mustache"]
});


KISSY.add("mxext/mustache", function(S) {

	/*
	 mustache.js — Logic-less templates in JavaScript

	 See http://mustache.github.com/ for more info.
	 */
	 /**
	  * Mustache模板
	  * @name Mustache
	  * @namespace
	  */
	var Mustache = function() {
		/**
		 * @name Renderer
		 * @inner
		 */
		var Renderer = function() {
		};

		Renderer.prototype = {
			otag : "{{",
			ctag : "}}",
			pragmas : {},
			buffer : [],
			pragmas_implemented : {
				"IMPLICIT-ITERATOR" : true
			},
			context : {},

			render : function(template, context, partials, in_recursion) {
				// reset buffer & set context
				if(!in_recursion) {
					this.context = context;
					this.buffer = [];
					// TODO: make this non-lazy
				}

				// fail fast
				if(!this.includes("", template)) {
					if(in_recursion) {
						return template;
					} else {
						this.send(template);
						return;
					}
				}
				template = this.render_pragmas(template);
				var html = this.render_section(template, context, partials);
				if(in_recursion) {
					return this.render_tags(html, context, partials, in_recursion);
				}

				this.render_tags(html, context, partials, in_recursion);
			},
			/*
			 Sends parsed lines
			 */
			send : function(line) {
				if(line != "") {
					this.buffer.push(line);
				}
			},
			/*
			 Looks for %PRAGMAS
			 */
			render_pragmas : function(template) {
				// no pragmas
				if(!this.includes("%", template)) {
					return template;
				}

				var that = this;
				var regex = new RegExp(this.otag + "%([\\w-]+) ?([\\w]+=[\\w]+)?" + this.ctag);
				return template.replace(regex, function(match, pragma, options) {
					if(!that.pragmas_implemented[pragma]) {
						throw ( {
							message : "This implementation of mustache doesn't understand the '" + pragma + "' pragma"
						});
					}
					that.pragmas[pragma] = {};
					if(options) {
						var opts = options.split("=");
						that.pragmas[pragma][opts[0]] = opts[1];
					}
					return "";
					// ignore unknown pragmas silently
				});
			},
			/*
			 Tries to find a partial in the curent scope and render it
			 */
			render_partial : function(name, context, partials) {
				name = this.trim(name);
				if(!partials || partials[name] === undefined) {
					throw ( {
						message : "unknown_partial '" + name + "'"
					});
				}
				if( typeof (context[name]) != "object") {
					return this.render(partials[name], context, partials, true);
				}
				return this.render(partials[name], context[name], partials, true);
			},
			/*
			 Renders inverted (^) and normal (#) sections
			 */
			render_section : function(template, context, partials) {
				if(!this.includes("#", template) && !this.includes("^", template)) {
					return template;
				}

				var that = this;
				// CSW - Added "+?" so it finds the tighest bound, not the widest
				var regex = new RegExp(this.otag + "(\\^|\\#)\\s*(.+)\\s*" + this.ctag + "\n*([\\s\\S]+?)" + this.otag + "\\/\\s*\\2\\s*" + this.ctag + "\\s*", "mg");

				// for each {{#foo}}{{/foo}} section do...
				return template.replace(regex, function(match, type, name, content) {
					var value = that.find(name, context);
					if(type == "^") {// inverted section
						if(!value || that.is_array(value) && value.length === 0) {
							// false or empty list, render it
							return that.render(content, context, partials, true);
						} else {
							return "";
						}
					} else if(type == "#") {// normal section
						if(that.is_array(value)) {// Enumerable, Let's loop!
							return that.map(value, function(row) {
								return that.render(content, that.create_context(row), partials, true);
							}).join("");
						} else if(that.is_object(value)) {// Object, Use it as subcontext!
							return that.render(content, that.create_context(value), partials, true);
						} else if( typeof value === "function") {
							// higher order section
							return value.call(context, content, function(text) {
								return that.render(text, context, partials, true);
							});
						} else if(value) {// boolean section
							return that.render(content, context, partials, true);
						} else {
							return "";
						}
					}
				});
			},
			/*
			 Replace {{foo}} and friends with values from our view
			 */
			render_tags : function(template, context, partials, in_recursion) {
				// tit for tat
				var that = this;

				var new_regex = function() {
					return new RegExp(that.otag + "(=|!|>|\\{|%)?([^\\/#\\^]+?)\\1?" + that.ctag + "+", "g");
				};
				var regex = new_regex();
				var tag_replace_callback = function(match, operator, name) {
					switch(operator) {
						case "!":
							// ignore comments
							return "";
						case "=":
							// set new delimiters, rebuild the replace regexp
							that.set_delimiters(name);
							regex = new_regex();
							return "";
						case ">":
							// render partial
							return that.render_partial(name, context, partials);
						case "{":
							// the triple mustache is unescaped
							return that.find(name, context);
						default:
							// escape the value
							return that.escape(that.find(name, context));
					}
				};
				var lines = template.split("\n");
				for(var i = 0; i < lines.length; i++) {
					lines[i] = lines[i].replace(regex, tag_replace_callback, this);
					if(!in_recursion) {
						this.send(lines[i]);
					}
				}

				if(in_recursion) {
					return lines.join("\n");
				}
			},
			set_delimiters : function(delimiters) {
				var dels = delimiters.split(" ");
				this.otag = this.escape_regex(dels[0]);
				this.ctag = this.escape_regex(dels[1]);
			},
			escape_regex : function(text) {
				// thank you Simon Willison
				if(!arguments.callee.sRE) {
					var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
					arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
				}
				return text.replace(arguments.callee.sRE, '\\$1');
			},
			/*
			 find `name` in current `context`. That is find me a value
			 from the view object
			 */
			find : function(name, context) {
				name = this.trim(name);

				// Checks whether a value is thruthy or false or 0
				function is_kinda_truthy(bool) {
					return bool === false || bool === 0 || bool;
				}

				var value;
				if(is_kinda_truthy(context[name])) {
					value = context[name];
				} else if(is_kinda_truthy(this.context[name])) {
					value = this.context[name];
				}

				if( typeof value === "function") {
					return value.apply(context);
				}
				if(value !== undefined) {
					return value;
				}
				// silently ignore unkown variables
				return "";
			},
			// Utility methods

			/* includes tag */
			includes : function(needle, haystack) {
				return haystack.indexOf(this.otag + needle) != -1;
			},
			/*
			 Does away with nasty characters
			 */
			escape : function(s) {
				s = String(s === null ? "" : s);
				return s.replace(/&(?!\w+;)|["'<>\\]/g, function(s) {
					switch(s) {
						case "&":
							return "&amp;";
						case "\\":
							return "\\\\";
						case '"':
							return '&quot;';
						case "'":
							return '&#39;';
						case "<":
							return "&lt;";
						case ">":
							return "&gt;";
						default:
							return s;
					}
				});
			},
			// by @langalex, support for arrays of strings
			create_context : function(_context) {
				if(this.is_object(_context)) {
					return _context;
				} else {
					var iterator = ".";
					if(this.pragmas["IMPLICIT-ITERATOR"]) {
						iterator = this.pragmas["IMPLICIT-ITERATOR"].iterator;
					}
					var ctx = {};
					ctx[iterator] = _context;
					return ctx;
				}
			},
			is_object : function(a) {
				return a && typeof a == "object";
			},
			is_array : function(a) {
				return Object.prototype.toString.call(a) === '[object Array]';
			},
			/*
			 Gets rid of leading and trailing whitespace
			 */
			trim : function(s) {
				return s.replace(/^\s*|\s*$/g, "");
			},
			/*
			 Why, why, why? Because IE. Cry, cry cry.
			 */
			map : function(array, fn) {
				if( typeof array.map == "function") {
					return array.map(fn);
				} else {
					var r = [];
					var l = array.length;
					for(var i = 0; i < l; i++) {
						r.push(fn(array[i]));
					}
					return r;
				}
			}
		};

		return ( {
			/**
			 * @lends Mustache
			 */
			/**
			 * 名称
			 */
			name : "mustache.js",
			/**
			 * 版本
			 */
			version : "0.3.1-dev",

			/**
			 * 把模板根据数据翻译成最终字符串
			 * @param {String} template 模板
			 * @param {Object} view     数据
			 * @return {String}
			 */
			to_html : function(template, view, partials, send_fun) {
				var renderer = new Renderer();
				if(send_fun) {
					renderer.send = send_fun;
				}
				
				renderer.render(template, view, partials);
				if(!send_fun) {
					return renderer.buffer.join("\n");
				}
			}
		});
	}();
	return Mustache;
});
/**
 * @fileOverview 模板
 * @version 1.0
 * @author 行列
 */
KISSY.add("mxext/tmpl",function(S){
	var fnCaches={},
		tmplCaches={},
		stack='_'+new Date().getTime(),
		notRender=/\s*<script[^>]+type\s*=\s*(['"])\s*text\/tmpl\1[^>]*>([\s\S]*?)<\/script>\s*/gi;
	var tmpl=function(template,data){
		if(template){
			var resultTemplate;
			resultTemplate=tmplCaches[template];
			if(!resultTemplate){
				resultTemplate=stack + ".push('" + template
				.replace(/\s+/g," ")
				.replace(/<#/g,"\r")
				.replace(/;*#>/g,"\n")
				.replace(/\\(?=[^\r\n]*\n)/g,"\t")
				.replace(/\\/g,"\\\\")
				.replace(/\t/g,"\\")
				.replace(/'(?=[^\r\n]*\n)/g,"\t")
				.replace(/'/g,"\\'")
				.replace(/\t/g,"'")
				.replace(/\r=([^\n]+)\n/g,"',$1,'")
				.replace(/\r/g,"');")
				.replace(/\n/g,";"+stack+".push('")+ "');return "+stack+".join('')";
				 tmplCaches[template]=resultTemplate;
			}
			var vars=[stack],values=[[]],fnKey;
			if(data){
				for(var p in data){
					vars.push(p.replace(/[:+\-*\/&^%#@!~]/g,'$'));
					values.push(data[p]);
				}
			}
			fnKey=vars.join('_')+'_'+resultTemplate;
			if(!fnCaches[fnKey]){
				try{
					fnCaches[fnKey]=new Function(vars,resultTemplate);
				}catch(e){
					
					return resultTemplate=e.message;
				}
			}
			try{
				resultTemplate=fnCaches[fnKey].apply(data,values);
			}catch(e){
				
				resultTemplate=e.message;
			}
			return resultTemplate;
		}
		return template;
	};
	/**
	 * 语法为<# #>的模板，<# #>语句 <#= #>输出
	 * @name Tmpl
	 * @namespace
	 * @example
	 * &lt;#for(var i=0;i&lt;10;i++){#&gt;
	 *    &lt;#=i#&gt; &lt;br /&gt;
	 * &lt;#}#&gt;
	 */
	var Tmpl={
		/**
		 * @lends Tmpl
		 */
		/**
		 * 把模板与数据翻译成最终的字符串
		 * @param {String} template 模板字符串
		 * @param {Object} data     数据对象
		 * @return {String}
		 */
		toHTML:function(template,data){
			var notRenders=template.match(notRender);
			if(notRenders){
				template=template.replace(notRender,function(){//防止不必要的解析
					return '<script type="text/tmpl"></script>';
				});
				template=tmpl(template,data);
				var idx=0;
				template=template.replace(notRender,function(){
					return notRenders[idx++];
				});
			}else{
				template=tmpl(template,data);
			}
			return template;
		}
	};
	return Tmpl;
});/**
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
});/**
 * @fileOverview 对magix/view的扩展
 * @version 1.0
 * @author 行列
 */
KISSY.add('mxext/view',function(S,View,Router){
	var WIN=window;
	/*
		queryEvents:{
			click:{
				'#id':function(){
					
				},
				'.title':function(){//  S.one('.title').click(); S.one().delegate(); 
					
				}
			},
			mouseover:{
				'#id':function(e){
					
				}
			}
		}
	 */
	/**
	 * @name MxView
	 * @namespace
	 * @requires View
	 * @augments View
	 */
	return View.extend({
		/**
		 * @lends MxView#
		 */
		/**
		 * 根据选择器来注册事件
		 * @type {Object}
		 * @example
		 * queryEvents:{
		 * 		click:{
		 * 			'#name':function(e){
		 * 				
		 * 			},
		 * 			'#name .label':function(e){
		 * 				
		 * 			}
		 * 		}
		 * }
		 */
		queryEvents:null,
		/**
		 * 调用magix/router的navigate方法
		 * @param {Object|String} params 参数字符串或参数对象
		 */
		navigate:function(params){
			Router.navigate(params);
		},
		/**
		 * 根据选择器添加事件
		 */
		attachQueryEvents:function(){
			var me=this;
			var queryEvents=me.queryEvents;
			if(queryEvents){
				me.$queryEventsCache={};
				for(var p in queryEvents){
					var evts=queryEvents[p];
					for(var q in evts){
						
						S.all('#'+me.id+' '+q).on(p,me.$queryEventsCache[p+'_'+q]=(function(fn){
							return function(e){
								var targetId=View.idIt(e.target);
								var currentId=View.idIt(e.currentTarget);
								Magix.safeExec(fn,{
									view:me,
									targetId:targetId,
									currentId:currentId,
									queryEvents:queryEvents,
									domEvent:e
								},queryEvents);
							}
						}(evts[q])));
					}
				}
			}
			
		},
		/**
		 * 清除根据选择器添加的事件
		 */
		detachQueryEvents:function(){
			var me=this;
			var queryEvents=me.queryEvents;
			if(queryEvents){
				for(var p in queryEvents){
					var evts=queryEvents[p];
					for(var q in evts){
						S.all('#'+me.id+' '+q).detach(p,me.$queryEventsCache[p+'_'+q]);
					}
				}
				delete me.$queryEventsCache;
			}
		},
		setData: function(data) {
	        this.data = data;
	        for (var k in data) {
	            if (data[k]&&data[k].toJSON) {
	                data[k] = data[k].toJSON();
	            }
	        }
	        this.setRenderer();
	    },
	    setRenderer: function() {
	        var self = this,
	            rr = this.renderer,
	            mcName, wrapperName;
	        if (rr) {
	            for (mcName in rr) {
	                for (wrapperName in rr[mcName]) {
	                    (function() {
	                        var mn = mcName,
	                            wn = wrapperName;
	                        var fn = rr[mn][wn];
	                        self.data[mn + "_" + wn] = function() {
	                            return fn.call(this, self, mn);
	                        };
	                    })();
	                }
	            }
	        }
	    }
	},function(){
		var me=this;
		me.bind('created',function(){
			me.attachQueryEvents();
			me.bind('prerender',function(){
				me.detachQueryEvents();
			});
			me.bind('rendered',function(){
				me.attachQueryEvents();
			});
		});
	});
},{
	requires:["magix/view","magix/router"]
});