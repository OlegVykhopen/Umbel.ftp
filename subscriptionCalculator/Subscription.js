(function ($, window) {

    window.Subscription = function(opt){
        var self = this;
        self.opt = opt;
        self.cont = opt.cont;
        self.outputArea = opt.outputArea;
        self.templates = opt.templates;
        self.input = opt.input;
        self.init();
    }

    Subscription.prototype = {
        createPool: function(poolData){
            var data = poolData || this.generatePoolData();
            var tmpl = this.templates.pool.tmpl({
                data: this.input,
                pool: data,
                cameras: data ? data.cameras[0] : null
            });
            tmpl.data({
                id: data.id,
                displayName: data.displayName
            }).appendTo(this.cont.find('.poolTarget'));
            this.addPool(tmpl);
            this.initContent(tmpl, data);
        },
        generatePoolData: function(){
            var emptyPool = {
                id: "id" + Date.now(),
                displayName: "name" + Date.now(),
                ttlHrs: 0,
                cameras: [{
                    id: "",
                    count: 0,
                    additional: {
                        bitrate: 0,
                        price: 0,
                        days: 0,
                        storage: 0
                    }
                }]
            };
            return emptyPool;
        },
        removePool: function(tmpl){
            var self = this;
            if (!tmpl) return;
            tmpl.find('.removePool').on("click", function(){
                self.deletePool(tmpl);
                tmpl.remove();
            });
        },
        initEditable: function(tmpl){
            var self = this;
            tmpl.find('[type=text], [type=number]').each(function(){
                $(this).on("change keyup", function(){
                    $(this).parents('.fieldResult').data($(this).data('key'), $(this).val());
                    self.updatePool(tmpl);
                })
            });
        },
        initDropdown: function(tmpl, poolData){
            var self = this,
                dr = tmpl.find('[data-toggle]'),
                par = dr.parent(),
                drM = par.find('.dropdown-menu');
            dr.dropdown();
            drM.find('li').each(function(){
                var _this = $(this);
                _this.on("click", function(){
                    drM.find('.check-mark').hide();
                    par.data($(this).data());
                    $(this).find('.check-mark').show();
                    dr.find('.btn-placeholder').text($(this).text());
                    self.updatePool(tmpl);
                });
            });
            var camId = poolData.cameras[0].id;
            if (camId){
                var chLi = drM.find('[data-id='+ camId +']');
                if (chLi.length > 0) chLi.trigger('click');
            }

        },
        delegEv: function(){
            var self = this;
            this.cont.on('click', function(e){
                e.preventDefault();
                var el = $(e.target);
                if (el.hasClass("createPool")){
                    self.createPool();
                }
            });
        },
        addPool: function(tmpl){
            var ser = this.serializePool(tmpl);
            this.pools.push(ser);
            this.calcTotal(tmpl);
        },
        deletePool: function(tmpl){
            this.pools = this.pools.filter(function(element){ // delete pool from created
                return element.id !== tmpl.data('id');
            });
            this.calcTotal(tmpl);
        },
        updatePool: function(tmpl){ // update pool obj with new info from fields
            var self = this;
            this.pools = this.pools.map(function(element){
                if (element.id === tmpl.data('id')){
                    return self.serializePool(tmpl)
                }else{
                    return element;
                }
            });
            this.calcTotal(tmpl);
        },
        calcPool: function(poolObj){
            if (!poolObj.cameras) return 0;
            var cD = poolObj.cameras[0];
            // Formula to calculate final price for pool
            return cD.count * cD.additional.price / 100 + (cD.count * cD.additional.bitrate / 100 * 450 / 1024 * cD.additional.days * 24) *
                (cD.additional.storage / 100 * this.input.storage.price / 100);
        },
        calcTotal: function(tmpl){
            var total = 0;
            for (var i = 0; i < this.pools.length; i++){
                var pool = this.pools[i],
                    subTotal = this.calcPool(pool);
                this.cont.find('#' + pool.id + ' .poolTotal').html('$' + this.toDecimalPrice(subTotal)); // show converted price in float decimals
                total += subTotal;
            }
            if (!isNaN(total)) this.cont.find('.subscription_result').text("$" + this.toDecimalPrice(total));
            this.createOutput();
        },
        createStorageUnitFeature: function(){
            if (!this.pools || this.pools.length == 0) return null;
            var sum = 0;
            for (var i = 0; i < this.pools.length; i++){
                if (!this.pools[i].cameras) continue;
                var p = this.pools[i].cameras[0],
                    pAd = p.additional,
                    subT = pAd.bitrate * pAd.days * 24 * p.count;
                sum += !isNaN(subT) ? subT : 0;
            }
            return sum > 0 ? {
                feature: "storageGb",
                quantity: sum
            } : null;
        },
        createOutput: function(){
            var output = {
                overcast: {
                    features: [],
                    storagePools: []
                }
            };
            var stF = this.createStorageUnitFeature();
            if (stF) output.overcast.features.push(stF);
            for (var i = 0; i < this.pools.length; i++){
                if (!this.pools[i].cameras) continue;
                var pool = this.pools[i],
                    fPool = new Object(pool);
                // delete fPool.cameras[0].additional;
                output.overcast.storagePools.push(fPool);
            }
            console.log(JSON.stringify(output));
            if (output) this.outputArea.val(JSON.stringify(output));
        },
        toDecimalPrice: function(n){
            return parseFloat(Math.round(n * 100) / 100).toFixed(2);
        },
        serializePool: function(poolDom){ // gather pool properties from fields
            var camId = poolDom.find('.fieldResult[data-id]').data('id'),
                camAm = parseInt(poolDom.find('.fieldResult[data-count]').data('count')),
                camArr = camId && camAm ? [{
                    id: camId,
                    count: camAm,
                    additional: {
                        bitrate: parseInt(poolDom.find('.fieldResult[data-bitrate]').data('bitrate')),
                        price: parseInt(poolDom.find('.fieldResult[data-price]').data('price')),
                        days: parseInt(poolDom.find('.fieldResult[data-days]').data('days')),
                        storage: parseInt(poolDom.find('.fieldResult[data-storage]').data('storage'))
                    }
                }] : null;
            return {
                id: poolDom.data('id'),
                displayName: poolDom.data('displayName'),
                ttlHrs: parseInt(poolDom.find('.fieldResult[data-days]').data('days')) * 24,
                cameras: camArr
            };
        },
        initContent: function(tmpl, poolData){
            this.initEditable(tmpl);
            this.initDropdown(tmpl, poolData);
            this.removePool(tmpl);
        },
        deserializeInput: function(){
            var stP = this.inputData.overcast.storagePools;
            if (stP && stP.length > 0){
                for (var i = 0; i < stP.length; i++){
                    this.createPool(stP[i]);
                }
            }
        },
        checkInput: function(){
            this.inputData = this.outputArea ? this.outputArea.val() : null;
            if (this.inputData){
                if (typeof this.inputData == "string"){
                    var p;
                    try{
                        p = JSON.parse(this.inputData);
                    }catch (e){
                        console.log(e);
                    }
                    if (p) this.inputData = p;
                    if (this.inputData.overcast){
                        this.deserializeInput();
                    }else{
                        console.log("Wrong input data");
                    }
                }
            }else{
                this.createPool();
                delete this.inputData;
            }
        },
        init: function(){
            if (this.cont) this.templates.main.tmpl().appendTo(this.cont);
            this.pools = [];
            this.delegEv();
            this.checkInput();
        }
    };

}( jQuery, window ));