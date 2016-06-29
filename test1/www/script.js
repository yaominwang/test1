angular.module('ionicApp', ['ionic', 'ngCordova' ])

    .run(function ($rootScope, $ionicPlatform, $cordovaNetwork, $cordovaBatteryStatus, $cordovaLocalNotification, $cordovaPush) {
        $rootScope.baseurl = 'http://114.215.91.56:8080/geocar.api/';

    })
    .config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
        $ionicConfigProvider.platform.ios.tabs.style('standard');
        $ionicConfigProvider.platform.ios.tabs.position('bottom');
        $ionicConfigProvider.platform.android.tabs.style('standard');
        $ionicConfigProvider.platform.android.tabs.position('bottom');
        $ionicConfigProvider.platform.ios.navBar.alignTitle('center');
        $ionicConfigProvider.platform.android.navBar.alignTitle('center');
        $ionicConfigProvider.platform.ios.backButton.previousTitleText('').icon('ion-ios-arrow-thin-left');
        $ionicConfigProvider.platform.android.backButton.previousTitleText('').icon('ion-android-arrow-back');
        $ionicConfigProvider.platform.ios.views.transition('ios');
        $ionicConfigProvider.platform.android.views.transition('android');


        $stateProvider
            .state('tabs', {
                url: "/tab",
                abstract: true,
                templateUrl: "tabs.html"
            })
            .state('tabs.myMsg', {
                url: "/myMsg",
                views: {
                    'myMsg-tab': {
                        templateUrl: "myMsg.html",
                        controller: 'HomeTabCtrl'
                    }
                }
            })
            .state('tabs.sendMsg', {
                url: "/sendMsg",
                views: {
                    'sendMsg-tab': {
                        templateUrl: "sendMsg.html",
                        controller: 'HomeTabCtrl'
                    }
                }
            })
            .state('tabs.myInfo', {
                url: "/myInfo",
                views: {
                    'myInfo-tab': {
                        templateUrl: "myInfo.html",
                        controller: 'HomeTabCtrl'

                    }
                }
            });
        $urlRouterProvider.otherwise("/tab/myMsg");

    })
    .controller('HomeTabCtrl', function ($rootScope, $scope, $cordovaLocalNotification, $timeout, $cordovaGeolocation, $cordovaDevice, $http, $ionicLoading, $ionicPopup) {

        var frame = document.getElementById("mapFrame").contentWindow;
        $scope.sendMsg = {"phoneNbr": ""};
        $scope.roadCondition = {"infoType": ""};
        function callGeolocation(success, error) {
            var posOptions = {timeout: 5000, enableHighAccuracy: true};
            $cordovaGeolocation.getCurrentPosition(posOptions).then(success, function () {
                var posOptions = {timeout: 3000, enableHighAccuracy: false};
                $cordovaGeolocation.getCurrentPosition(posOptions).then(success, error);
            });
        }

        var msgListenFuncs = {
            "carMove": function (data) {
                callGeolocation(this.carMoveCallBack, this.errorCallBack);
            },
            "carMoveCallBack": function (data) {
                var pos = [data.coords.longitude, data.coords.latitude];
                var param = {"msgKey": "carMove", "data": pos};
                frame.postMessage(param, "*");
            },
            "initMap": function (data) {

                callGeolocation(this.initMapCallBack, this.errorCallBack);
            }, "initMapCallBack": function (data) {
                var pos = [data.coords.longitude, data.coords.latitude];
                var param = {"msgKey": "initMap", "data": pos, "uuid": $rootScope.uuid};
                frame.postMessage(param, "*");
            }, "errorCallBack": function (data) {
                alert('code: ' + data.code + '\n' +
                'message: ' + data.message + '\n');
            }
        };

        $scope.show = function () {
            $ionicLoading.show({
                template: 'Loading...'
            });
        };
        $scope.hide = function () {
            $ionicLoading.hide();
        };
        function ajax(type, url, param, success) {
            doAjax(type, $rootScope.baseurl + url, param, success);
        }

        function doAjax(type, url, param, success) {
            var para = {
                method: type,
                url: url,
                data: param,
                params: param
            }
            var promis = $http(para);
            promis.success(success)
            promis.error(function (error) {
                showAlert('操作失败！', error);
                $scope.hide();
            });
        }


        var showAlert = function (title, template) {
            var alertPopup = $ionicPopup.alert({
                title: title,
                template: template
            });
            alertPopup.then(function (res) {
                console.log('showAlert.....');
            });
        };


        $scope.checkBlackCustomer = function () {
            $scope.show();

            var url = 'app/blackCustomer/checkPhoneNbr/' + $scope.sendMsg.phoneNbr;
            var param = {};
            ajax("GET", url, param, function (resp) {
                $scope.hide();
                if (resp.data == null) {
                    showAlert('提示信息!', '该号码未被举报，请放心!');
                } else {
                    showAlert('警告信息!', '该号码已被举报，请注意!');
                }
            });

        }
        function isDigit(s)
        {
            var patrn=/^1[0-9]{10}$/;
            if (!patrn.exec(s)) return false
            return true
        }
        $scope.submitBlackCustomer = function () {
           var phoneNbr =  $scope.sendMsg.phoneNbr;
           if(!isDigit(phoneNbr)) {
               showAlert('号码格式错误!', '请输入正确的手机号码!');
               return;
           }
            $scope.show();
            var url = 'app/blackCustomer';
            var param = {"phoneNumber": phoneNbr, "infoType": "1", "createDeviceId": $rootScope.uuid};
            ajax("POST", url, param, function () {
                $scope.hide();
                showAlert('感谢您上报信息!', '提交成功!');
            });

        }
        $scope.clientSideList = [
            {
                text: "正有麻烦",
                value: "1"
            },
            {
                text: "严重堵车",
                value: "2"
            }
        ];
        $scope.roadCondition.infoType = "1";
        $scope.submitRoadCondition = function () {
            $scope.show();
            callGeolocation(function (data) {
                var pos = {"lng": data.coords.longitude, "lat": data.coords.latitude};
                var url = 'app/RoadCondition';
                var param = {
                    "position": JSON.stringify(pos),
                    "infoType": $scope.roadCondition.infoType,
                    "createDeviceId": $rootScope.uuid
                };
                ajax("POST", url, param, function () {
                    $scope.hide();
                    showAlert('感谢您上报信息!', '提交成功!');
                });
            }, function (data) {
                $scope.hide();
                showAlert('code: ' + data.code,  'message: ' + data.message);
            })


        }

        function onDeviceReady() {
            if(!$rootScope.uuid){
                $rootScope.uuid = $cordovaDevice.getUUID();

                window.addEventListener('message', function (event) {
                    if (event.source == window)
                        return;
                    //确保发送消息的域名是已知的域名
                    var msg = event.data["msgKey"];
                    msgListenFuncs[msg](event.data);

                });

                var webSockUtil = new WebSockUtil();
                var onSockError = function (error) {
                    var webSockUtil = new WebSockUtil();
                    webSockUtil.connect(function (error) {
                        console.log("error..:" + error);
                        window.setTimeout(onSockError, 5000);
                    });
                };
                webSockUtil.connect(function (error) {
                    console.log("error..:" + error);
                    window.setTimeout(onSockError, 5000);
                });
            }

        }

        function WebSockUtil() {
            this.socket = new SockJS($rootScope.baseurl + 'socket');
            this.client = Stomp.over(this.socket);
            this.topic = '/topic/geomsg';
            this.target = '/target/socket';
        }

        //var webSockUtil = new WebSockUtil();
        //var webSockUtil2 = new WebSockUtil();
        //
        //alert(webSockUtil.client == webSockUtil2.client);//false 各个对象不一致
        //alert(webSockUtil.connect == webSockUtil2.connect);//true  一致，静态
        //
        //function WebSockUtilSub(){
        //
        //}
        //
        //WebSockUtilSub.prototype = WebSockUtil.prototype; //继承
        //WebSockUtilSub.prototype.connect =function(){} ;//复写


        WebSockUtil.prototype.connect = function (onError) {
            var util = this;
            this.client.connect({}, function (frame) {
                console.log('Connected: ' + frame);
                util.client.subscribe(util.topic, util.onMessage);
            }, onError);
        };

        WebSockUtil.prototype.onMessage = function (msg) {
            var data = JSON.parse(msg.body);
            $scope.addNotification(data);
        };

        WebSockUtil.prototype.disconnect = function () {
            if (this.client != null) {
                this.client.disconnect();
            }
            console.log("Disconnected");
        };

        WebSockUtil.prototype.send = function (jsonObj) {
            this.client.send(this.target, {}, JSON.stringify(jsonObj));
        }


        $scope.$watch('$viewContentLoaded', function () {
            document.addEventListener("deviceready", onDeviceReady, true);


        });


        $scope.addNotification = function (msgSrc) {
            var msg = msgSrc.data;
            var title = msg.infoType == "1" ? '风险信息' : '拥堵信息';
            var pos = JSON.parse(msg["position"]);
            var transLocalPara = {
                'locations': pos.lng + ',' + pos.lat,
                'key': '1641d880ed8778250a8d78a20fe0c48d',
                'coordsys': 'gps'
            }
            doAjax('GET', "http://restapi.amap.com/v3/assistant/coordinate/convert", transLocalPara, function (locations) {
                var local = locations.locations;
                var chinesePara = {
                    'location': local,
                    'key': '1641d880ed8778250a8d78a20fe0c48d'
                }
                doAjax('GET', "http://restapi.amap.com/v3/geocode/regeo", chinesePara, function (data) {
                    var event = {
                        id: Math.floor(Math.random() * 5 + 1),
                        title: title,
                        text: data.regeocode.formatted_address
                    };
                    document.addEventListener("deviceready", function () {
                        $cordovaLocalNotification.schedule(event).then(function () {
                        });
                    }, false);
                });


            });
            var param = {"msgKey": "notifyRoadInfo", "data": msg};
            frame.postMessage(param, "*");
        };


    })

    .controller('myinfoCtrl', function ($scope, $cordovaLocalNotification, $timeout) {


    }).controller('sendMsg', function ($scope, $cordovaLocalNotification, $timeout) {


    });



;
