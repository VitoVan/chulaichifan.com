var APP_SESSION = {};

Box.Application.addModule('step-ask-name', function(context) {
    'use strict';
    var moduleEl,mapService;
    return {
        init: function(){
            moduleEl = context.getElement();
            mapService = context.getService('map');
            mapService.initMap();
            if(Cookies.get("name")){
                $(moduleEl).find('input[type="text"]').val(Cookies.get("name"));
            }
            $(moduleEl).find('input[type="text"]').on('input',function(){
                $(this).removeClass('error');
            });
        },
        onclick: function(event, element, elementType) {
            if (elementType === 'step-btn') {
                var name = $(moduleEl).find('input[type="text"]').val().trim();
                if(name.length > 0){
                    console.log("怎么称呼？",name);
                    APP_SESSION.name = name;
                    this.nextStep();
                    $(moduleEl).find('input[type="text"]').removeClass('error');
                }else{
                    $(moduleEl).find('input[type="text"]').addClass('error');                    
                }
            }
        },
        nextStep: function(){
            this.destroy();
            $('[data-module="step-ask-place"]').show();
        },
        destroy: function() {
            $(moduleEl).remove();
            moduleEl = null;
            mapService = null;
        }
    };
});

Box.Application.addModule('step-ask-place', function(context){
    'use strict';
    var moduleEl,mapService,placeId,placeName,placeLocation;
    function addMarkers(poiList){
        APP_SESSION.map.clearMap();
        APP_SESSION.markerClicked = false;
        poiList.map(function(poi){
            var markerOption = {
                map: APP_SESSION.map,
                position: new AMap.LngLat(poi.location.getLng(), poi.location.getLat())
            };
            var marker = new AMap.Marker(markerOption);
            AMap.event.addListener(marker, 'click', function(){
                console.log("CLICK:::",poi);
                APP_SESSION.markerClicked = true;
                mapService.findPlaces({id: poi.id, name: poi.name});
            });
            AMap.event.addListener(marker, 'touchstart', function(){
                APP_SESSION.markerClicked = true;
            });            
            AMap.event.addListener(marker, 'touchmove', function(){
                console.log("TOUCH-MOVE:::",poi);
                APP_SESSION.touchMoved = true;
            });            
            AMap.event.addListener(marker, 'touchend', function(){
                console.log("TOUCH-END:::",poi);
                if(APP_SESSION.touchMoved !== true){
                    mapService.findPlaces({id: poi.id, name: poi.name});
                }
                APP_SESSION.touchMoved = false;
            });            
        });
        if(poiList.length > 1){
            APP_SESSION.map.setZoom(10);
            APP_SESSION.map.setFitView();
        }else{
            APP_SESSION.map.setZoom(13);
            APP_SESSION.map.setCenter(new AMap.LngLat(poiList[0].location.getLng(), poiList[0].location.getLat()));
        }
        
    }
    return {
        messages: ['tipComplete','placeComplete'],
        init: function(){
            moduleEl = context.getElement();
            mapService = context.getService('map');
            //输入事件
            $(moduleEl).find('input[type="text"]').donetyping(function(){
                var keywords = $(moduleEl).find('input[type="text"]').val().trim();
                mapService.findTips(keywords);
            },200);
            $(moduleEl).find('input[type="text"]').on('click touchend',function(){
                $(moduleEl).find('input[type="text"]').attr('readonly',false);
            });
            AMap.event.addListener(APP_SESSION.map, 'click', function(){
                $(moduleEl).find('input[type="text"]').attr('readonly',false);
            });
            AMap.event.addListener(APP_SESSION.map, 'touchstart', function(){
                $(moduleEl).find('input[type="text"]').attr('readonly',false);
            });            
        },
        onmessage: function(name, data){
            if(name === "tipComplete"){
                var keywords = $(moduleEl).find('input[type="text"]').val().trim();
                console.log("message",data);
                if((APP_SESSION.tipLastFireTime !== data.fireTime)
                   || (data.result.tips[0] && keywords == data.result.tips[0].name)){ //如果返回的不是最后一次请求，或者与当前框里的内容一样
                    return;
                }
                var tips = $(moduleEl).find('[data-type="tips"]');
                var tipTemplate = tips.find('.template').clone();
                tips.find('div').not('.template').remove();
                if(data.result.tips.length > 0){
                    $(moduleEl).find('#amap-container').hide();
                    $(moduleEl).find('[data-type="tips"]').show();
                    data.result.tips.map(function(tip){
                        var tmpTip = tipTemplate.clone();
                        tmpTip.removeClass('template');
                        tmpTip.find('[name="name"]').html(tip.name);
                        tmpTip.find('[name="district"]').html(tip.district);
                        tmpTip.on('click',function(){ //点击提示
                            APP_SESSION.markerClicked = false;
                            mapService.findPlaces(tip);
                            $(moduleEl).find('input[type="text"]').val(tip.name);
                            $(moduleEl).find('input[type="text"]').attr('readonly',true);
                            $(moduleEl).find('#amap-container').focus();
                            $(moduleEl).find('[data-type="tips"]').find('div').not('.template').remove();
                        });
                        tips.append(tmpTip);
                    });
                }
            }else if(name === "placeComplete"){
                if(APP_SESSION.placeLastFireTime !== data.fireTime){
                    return;
                }
                if(APP_SESSION.markerClicked === true){//如果是点击Marker，则直接定位
                    APP_SESSION.map.setCenter(new AMap.LngLat(data.result[0].location.getLng(), data.result[0].location.getLat()));
                }else{
                    addMarkers(data.result);
                }
                $(moduleEl).find('#amap-container').show();
                $(moduleEl).find('[data-type="tips"]').hide();
                if(data.result.length === 1){
                    $(moduleEl).find('#amap-container').addClass('map-shrink');
                    $(moduleEl).find('[name="place-selected"]').show();
                    $(moduleEl).find('div[name="place-selected"]>span[name="name"]').
                        html("<div class='tip'><span name='name'>" + data.result[0].name + "</span> <span name='district'>" + data.result[0].tel + "</span><span name='district'>（" + data.result[0].address + "）</span>" + "</div>");
                    placeId = data.result[0].id;
                    placeName = data.result[0].name;
                    placeLocation = data.result[0].location;
                }else{
                    $(moduleEl).find('[name="place-selected"]').hide();
                    $(moduleEl).find('#amap-container').removeClass('map-shrink');
                }
            }
        },
        onclick: function(event, element, elementType){
            if(elementType === 'search-btn'){
                APP_SESSION.markerClicked = false;
                $(moduleEl).find('[data-type="tips"]').find('div').not('.template').remove();
                var keywords = $(moduleEl).find('input[type="text"]').val().trim();
                if(keywords.length > 0){
                    mapService.findPlaces({id: "",name: keywords});                    
                }
            }else if(elementType === 'step-btn'){
                this.destroy();
                APP_SESSION.placeId = placeId;
                APP_SESSION.placeName = placeName;
                APP_SESSION.placeLocation = placeLocation;
                $('[data-module="step-ask-when"]').show();
            }
        },
        destroy: function() {
            $(moduleEl).remove();            
            moduleEl = null;
            mapService = null;
            APP_SESSION.map.destroy();
            APP_SESSION.map = null;
        }
    };
});


Box.Application.addModule('step-ask-when', function(context) {
    'use strict';
    var moduleEl;
    return {
        init: function(){
            moduleEl = context.getElement();
            var me = this;
            //初始化日历
            //TODO Weather
            var picker = new Pikaday({
                disableDayFn: function(date){
                    var today = new Date();
                    var yesterday = new Date(today);
                    yesterday.setDate(today.getDate()-1);
                    return date < yesterday;
                },
                onSelect: function(date) {
                    console.log(date);
                    me.setTime(date);
                },
                i18n: {
                    previousMonth : '上一月',
                    nextMonth     : '下一月',
                    months        : ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
                    weekdays      : ['周日','周一','周二','周三','周四','周五','周六'],
                    weekdaysShort : ['日','一','二','三','四','五','六']
                }
            });
            $(moduleEl).find('div[data-type="calendar"]').html(picker.el);
            //初始化时间输入
            $(moduleEl).find('select[name="hour"]').on('change',function(){
                var val = parseInt($(this).val());
                if(val > -1 && val < 25){
                    APP_SESSION.date.setHours(val);
                }
            });            
            $(moduleEl).find('select[name="minute"]').on('change',function(){
                var val = parseInt($(this).val());
                if(val > -1 && val < 61){
                    APP_SESSION.date.setMinutes(val);
                }
            });
        },
        onclick: function(event, element, elementType){
            if(elementType === 'set-time-link'){
                $(moduleEl).find('span[name="set-time"]').show();
                $(element).remove();
                $(moduleEl).find('span[name="dinner"]').remove();
            }else if(elementType === 'step-btn'){
                if($(moduleEl).find('span[name="set-time"]').is(':visible')){
                    var hour = parseInt($(moduleEl).find('select[name="hour"]').val());
                    var minute = parseInt($(moduleEl).find('select[name="minute"]').val());
                    if(hour > -1 && hour < 25 && minute > -1 && minute < 61){
                        APP_SESSION.date.setHours(hour);
                        APP_SESSION.date.setMinutes(minute);
                    }else{
                        return false;
                    }
                }
                Cookies.set('name', APP_SESSION.name, {expires:365});
                this.destroy();
                $('[data-module="step-ask-who"]').show();
            }
        },
        setTime: function(date){
            APP_SESSION.date = date;
            var dateText = date.pattern('MM 月 dd 日，EE');
            $(moduleEl).find('span[name="time"]').text(dateText);
            $(moduleEl).find('div[name="date-div"]').show();
        },
        destroy: function() {
            $(moduleEl).remove();            
            moduleEl = null;
        }
    };
});

Box.Application.addModule('step-ask-who', function(context) {
    'use strict';
    var moduleEl,who,words;
    return {
        init: function(){
            moduleEl = context.getElement();
            words = '';
            $(moduleEl).find('input[name="name"]').on('input',function(){
                $(this).removeClass('error');
            });
        },
        onclick: function(event, element, elementType) {
            var me = this;
            if(elementType === 'invite-btn' || elementType === 'word-btn'){
                me.invite();
            }else if(elementType === 'extra-link'){
                $(element).hide();
                $(moduleEl).find('div[name="extra-div"]').show();
                $(moduleEl).find('input[name="extra-input"]').on('input',function(){
                    me.addWords($(this).val());
                });
            }
        },
        addWords: function(words){
            var invitationEl = $(moduleEl).find('#invitation');
            invitationEl.find('[name="extra"]').text(words);
            this.words = words;
        },
        invite: function(){
            var nameEl = $(moduleEl).find('input[name="name"]');
            var val = nameEl.val().trim();
            if(val.length>0){
                this.who = val;
                nameEl.removeClass('error');
            }else{
                nameEl.addClass('error');
                return;
            }
            var invitationEl = $(moduleEl).find('#invitation');
            var dateText = APP_SESSION.date.pattern('MM 月 dd 日（EE）') +
                ((APP_SESSION.date.getHours() === 0 && APP_SESSION.date.getMinutes() === 0) ?
                 '晚上 ':APP_SESSION.date.pattern('，HH:mm'));
            invitationEl.find('[name="name"]').text(this.who);
            invitationEl.find('[name="inviter"]').text(APP_SESSION.name);
            invitationEl.find('[name="date"]').text(dateText);
            invitationEl.find('[name="place"]').text(APP_SESSION.placeName);
            var mapUrl = 'http://clcf.la/#' + APP_SESSION.placeId;
            $(moduleEl).find('[name="share-link-a"]').attr('href',mapUrl).text(mapUrl);
            $(moduleEl).find('input[name="name"]').removeClass('error');
            invitationEl.show();
            $(moduleEl).find('[data-type="extra-link"]').show();
            $(moduleEl).find('div[name="extra-div"]').hide();
        },
        destroy: function() {
            $(moduleEl).remove();            
            moduleEl = null;
        }
    }
});

Box.Application.addService('map', function(application){
    'use strict';
    return {
        initMap: function(){
            console.log("Initing map.");
            APP_SESSION.map = new AMap.Map('amap-container', {
	            resizeEnable: true,
                rotateEnable: true,
	            view: new AMap.View2D({
	                resizeEnable: true,
	                zoom:10//地图显示的缩放级别
	            }),
	            keyboardEnable:false
            });
            APP_SESSION.map.getCity(function(result){
                console.log("默认城市", result);
                APP_SESSION.cityName = result.city||result.province;
                APP_SESSION.cityCode = result.citycode;
            });
        },        
        findTips: function(keywords){
            var fireTime = new Date();
            APP_SESSION.tipLastFireTime = fireTime;
            if(keywords.length > 0){ //如果有输入，则匹配
                AMap.service(['AMap.Autocomplete'], function() {
		            var autoOptions = {
                        type: Box.Application.getGlobalConfig('poiList'),
		                city: APP_SESSION.cityName
		            };
		            var auto = new AMap.Autocomplete(autoOptions);
		            auto.search(keywords, function(status, result){
                        console.log("自动匹配结果", status, result);
                        if(status === "complete"){
                            application.broadcast('tipComplete',{result: result,fireTime: fireTime});
                        }else if(status === "error"){
                            console.error(result);
                        }
		            });
	            });            
            }
        },        
        findPlaces: function(tip){
            var fireTime = new Date();
            APP_SESSION.placeLastFireTime = fireTime;
            console.log("map searching...");
            AMap.service(['AMap.PlaceSearch'], function() {
                var msearch = new AMap.PlaceSearch({
                    type: "餐饮服务",
                    city: APP_SESSION.cityCode
                });  //构造地点查询类
                if(tip.id === ""){
                    msearch.search(tip.name, function(status, result){
                        if(status === "complete"){
                            console.log("地图展示结果", result);
                            application.broadcast('placeComplete',{result: result.poiList.pois, fireTime: fireTime});
                        }else if(status === "error"){
                            console.error(result);
                        }
                    });
                }else{
                    APP_SESSION.district = tip.district;
                    msearch.getDetails(tip.id,function(status, result){
                        if(status === "complete"){
                            console.log("地图展示结果", result);
                            application.broadcast('placeComplete',{result: result.poiList.pois, fireTime: fireTime});
                        }else if(status === "error"){
                            console.error(result);
                        }
                    });
                }
            });
        }
    };
});


$(document).ready(function(){
    Box.Application.init({
        debug:true,
        poiList: "050000|050100|050101|050102|050103|050104|050105|050106|050107|050108|050109|050110|050111|050112|050113|050114|050115|050116|050117|050118|050119|050120|050121|050122|050123|050200|050201|050202|050203|050204|050205|050206|050207|050208|050209|050210|050211|050212|050213|050214|050215|050216|050217|050300|050301|050302|050303|050304|050305|050306|050307|050308|050309|050310|050400|050500|050501|050502|050503|050504|050600|050700|050800|050900"
    });
    if($.browser.desktop){
        $(".cover").show();
    }
    document.getElementById('amap-container')
        .addEventListener('touchstart',function(e){
            if($.browser.android){
                e.preventDefault();
            }
        },false);
});
