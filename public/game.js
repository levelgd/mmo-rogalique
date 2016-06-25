/**
 * Created by lvlgd on 03.02.2015.
 */
(function(){
//---------------------------------------------------------------------------------------------------------------------
    var ws;

    window.requestAnimationFrame = (function () { return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) { return window.setTimeout(callback, 1000 / 60); }})();
    window.cancelRequestAnimFrame = (function () { return window.cancelRequestAnimationFrame || window.webkitCancelRequestAnimationFrame || window.mozCancelRequestAnimationFrame || window.oCancelRequestAnimationFrame || window.msCancelRequestAnimationFrame || clearTimeout})();

    var canvas = document.querySelector("canvas"); var context2d = canvas.getContext("2d");

    AutoResizeCanvas(); window.onresize = AutoResizeCanvas;

    var camera = {x:0,y:0};
    var keys = [];
    var redraw = true;

    var showchat = 8;

    var chatform = document.querySelector('#chat'); chatform.style.display = 'none';
    var chatinput = document.querySelector('#chatinput');

    var GAMESTATE = "connect";

    var you = 0;

    var log = [];
    var map = [];
    var players = [];
//---------------------------------------------------------------------------------------------------------------------
    window.requestAnimationFrame(Main);

    function Main(){
        switch (GAMESTATE) {
            case "connect":

                if(redraw) {
                    context2d.clearRect(0, 0, canvas.width, canvas.height);
                    context2d.fillText("Соединение с сервером...",canvas.width/2, canvas.height/2);
                }

                Network();

                if(GAMESTATE === 'connect') { GAMESTATE = 'loading'; redraw = true; }

                break;
            case "loading":

                if(redraw) {
                    context2d.clearRect(0, 0, canvas.width, canvas.height);
                    context2d.fillText("Загрузка данных...",canvas.width/2, canvas.height/2);
                }

                break;
            case "init":

                chatform.onsubmit = function(){
                    if(GAMESTATE === 'run'){
                        if(chatinput.value.length > 0) ws.send(JSON.stringify({message: 'game-chat', text: chatinput.value}));
                        chatinput.value = ''; chatinput.blur(); chatform.style.display = 'none';
                        showchat = 8;
                        redraw = true;
                    }
                    return false;
                };

                window.addEventListener("keydown",KeydownHandler,false); window.addEventListener("keyup",KeyupHandler,false);

                GAMESTATE = 'run';

                break;
            case "run":

                if(redraw) {
                    redraw = false;

                    camera.x = -players[you].x + canvas.width/2; camera.y = -players[you].y + canvas.height/2;//if(typeof you != 'number')

                    context2d.clearRect(0, 0, canvas.width, canvas.height);

                    context2d.save();

                    var ln = map.map.length;
                    for(var j = 0; j < ln; j++){
                        var dx = j%map.width *16 + camera.x;
                        var dy = Math.floor(j/map.width) * 16 + camera.y;
                        if(map.map[j] != ' ') context2d.fillText(map.map[j],dx,dy);
                    }

                    context2d.fillStyle = '#000000';

                    for(var i = 0; i < players.length; i++) {
                        context2d.clearRect(players[i].x + camera.x - 8, players[i].y + camera.y - 8, 16, 16);
                        if(i === you) context2d.strokeText(players[i].s,players[i].x + camera.x,players[i].y + camera.y);
                        context2d.fillText(players[i].s,players[i].x + camera.x,players[i].y + camera.y);
                    }

                    context2d.font = "12px Verdana, sans-serif";
                    context2d.fillStyle = '#333333';
                    context2d.textAlign = "left";

                    i = log.length;
                    var h = canvas.height - showchat;
                    while(--i > -1){
                        context2d.fillText(log[i],0, h);
                        h -= 16;
                    }

                    context2d.restore();
                }

                break;
            case 'closed':
                if(redraw) {
                    context2d.clearRect(0, 0, canvas.width, canvas.height);
                    context2d.fillText("Соединение с сервером потеряно! Обнови страничку, плиз.",canvas.width/2, canvas.height/2);
                }
                break;
        }

        window.requestAnimationFrame(Main);
    }

    function AutoResizeCanvas(){
        canvas.height = window.innerHeight - 24;
        canvas.width = document.body.clientWidth;

        context2d.textAlign = "center";
        context2d.textBaseline = "middle";
        context2d.font = "16px Verdana, sans-serif";
        context2d.fillStyle = '#333333';

        redraw = true;
    }

    function KeydownHandler(event) {

        if(showchat > 8) return;

        var kc = event.keyCode;
        if(keys[kc] === false || keys[kc] === undefined) {
            //if(keys[16] === true) kc += 300;

            keys[kc] = true;

            switch (kc){
                case 13://Enter
                    if(showchat == 8){
                        chatform.style.display = 'block';
                        showchat = 32;
                        setTimeout(function(){chatinput.focus()},100);
                    }else{
                        chatform.style.display = 'none';
                        showchat = 8;
                    }
                    redraw = true;
                    break;
                default :
                    ws.send(JSON.stringify({message: 'game-keydown', keycode: kc}));
                    break;
            }
        }
        //console.log(kc);
    }

    function KeyupHandler(event) {
        //var kc = event.keyCode;
        keys[event.keyCode] = false;
    }
//---------------------------------------------------------------------------------------------------------------------
    function Network(){
        ws = new WebSocket(location.origin.replace(/^http/, 'ws'));

        ws.onopen = function(message) {

            ws.onmessage = function(message) {

                redraw = true;

                try {
                    message = JSON.parse(message.data);
                }catch (e){
                    console.log('сервер прислал хуиту вместо данных: ' + e);
                    message.message = '';
                }

                switch(message.message){
                    case 'game-players':
                        players = message.players;
                        you = message.id;
                        if(GAMESTATE === 'loading') GAMESTATE = 'init';
                        break;
                    case 'game-map':
                        map = message.map;
                        break;
                    case 'game-join':
                        players.push(message.player);
                        break;
                    case 'game-quit':
                        you = (message.index > you)? you : you-1;
                        players.splice(message.index,1);
                        break;
                    case 'game-update':
                        players[message.id] = message.player;
                        break;
                    case 'game-log':
                        log.push(message.text);
                        if(log.length > 32) log.splice(0,1);
                        break;
                }
            };

            ws.onclose = function(message) {
                GAMESTATE = 'closed';
                redraw = true;
            };
        };
    }

})();