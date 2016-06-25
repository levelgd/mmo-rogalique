/**
 * Created by lvlgd on 03.02.2015.
 */

var http = require("http");
var express = require('express');
var app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/game.html');
});

app.get('/faq/', function (req, res) {
    res.sendFile(__dirname + '/public/faq.html');
});

app.get('/:file(*.js|*.css|*.ico)', function(req, res){
    res.sendFile(__dirname + '/public/'+req.params.file);
});

app.use(function(req, res, next){
    res.status(404).send("<h1 style='text-align: center'>404 azaza</h1>");
});

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500).send("<h1 style='text-align: center'>500 blyad, processor slomal</h1>");
});

var server = http.createServer(app);
server.listen(process.env.PORT || 5000, function(){
    console.log('server started');
});

//---------------------------------------------------------------------------------------------------------------------
var yatyan = /я тян/i;


var map = require('./map.json');
var id = 0;
var players = [];
var clients = [];
var Player = function(x,y){
    this.s = "a"; this.x = x; this.y = y;
};

function spawnPlayer(){
    var spawned = false; var dx = 0; var dy = 0;

    while(!spawned) {
        var spawnindex = Math.floor(Math.random() * map.map.length);
        if (map.map[spawnindex] === '.') {

            dx = (spawnindex % map.width) * 16; dy = Math.floor(spawnindex / map.width) * 16;

            if(players.length > 0) {
                for (var i = 0; i < players.length; i++) {
                    if (players[i].x == dx && players[i].y == dy) {
                        continue;
                    }
                    spawned = true;
                    break;
                }

                if(spawned == false){
                    dx = dy = 0;
                    spawned = true;
                }
            }else{
                spawned = true;
            }
        }
    }

    return {x:dx, y:dy};
}

function playerIndex(player){
    var tx = Math.floor(player.x / 16); var ty = Math.floor(player.y / 16);
    return ty * map.width + tx;
}

function playerChange(ws,wss,player,s){

    var toall = '';
    var toplayer = '';

    if(player.s == s) return;

    player.s = s;

    switch (s){
        case 't':
            toall = '> На борде обнаружена тян (без пруфов, разумеется)!';
            toplayer = '> Смена класса на ТЯН БЕЗ ПРУФОВ прошла успешно!';
            break;
    }

    ws.send(JSON.stringify({message:'game-log',text:toplayer}), ack);
    wss.broadcast(JSON.stringify({message: 'game-log',text:toall}), ws);

    wss.broadcast(JSON.stringify({message: 'game-update', player: player, id: players.indexOf(player) }), null);
}

function playerMove(ws,wss,player,x,y){
    player.x += x; player.y += y;
    var idx = playerIndex(player);

    var dx = (idx % map.width) * 16; var dy = Math.floor(idx / map.width) * 16;

    if(map.map[idx] === '.') {

        if(players.length > 0) {
            for (var i = 0; i < players.length; i++) {
                if (players[i] != player && (players[i].x == dx && players[i].y == dy)) {
                    player.x -= x; player.y -= y;

                    var toyou = '';
                    var toanon = '';

                    switch (player.s){
                        case 'a':
                            switch (players[i].s){
                                case 'a':
                                    toyou = '> Ты успешно поняшил анона в пукан!';
                                    toanon = '> Анончик поняшил тебя в пукан!';
                                    break;
                                case 't':
                                    toyou = '> Ты успешно попросил у тяночки (без пруфов) пруф того, что она тян с пруфами.';
                                    toanon = '> Анончик попросил у тебя пруф того, что ты тян!';
                                    break;
                            }
                            break;
                        case 't':
                            switch (players[i].s){
                                case 'a':
                                    toyou = '> Ты успешно поняшил(а) анона, возможно в пукан.';
                                    toanon = '> Тян без пруфов поняшила тебя! Однако радость сего события смазывается фактом неопределенности пола этой тян.';
                                    break;
                                case 't':
                                    toyou = '> Ты успешно встретил(а) на борде еще одну тян без пруфов!';
                                    toanon = '> Прямо перед тобой еще одна тян без пруфов! Акт лесбийской любви между безпруфными тнями невозможен.';
                                    break;
                            }
                            break;
                    }

                    ws.send(JSON.stringify({message:'game-log',text:toyou}), ack);
                    clients[i].send(JSON.stringify({message:'game-log',text:toanon}), ack);

                    break;
                }
            }
        }

        wss.broadcast(JSON.stringify({message: 'game-update', player: player, id: players.indexOf(player) }), null);

    }else{
        player.x -= x; player.y -= y;
    }
}
//---------------------------------------------------------------------------------------------------------------------
function ack(error) {
    if(error) console.log(error);
}

var websocket = require('ws').Server;
var wss = new websocket({ server:server });

wss.broadcast = function broadcast(data,without) {
    wss.clients.forEach(function each(client) {
        if(without != client) client.send(data, ack);
    });
};

wss.on('connection', function(ws) {

    console.log(addTime() + 'anon connected');

    var s = spawnPlayer();

    if(s.x == 0 && s.y == 0){
        ws.close(); return;
    }

    var lasttime = (new Date()).getTime(); var ddos = 0;

    var player = new Player(s.x, s.y);
    players.push(player);
    clients.push(ws);

    ws.send(JSON.stringify({message:'game-players',players:players,id:players.indexOf(player)}), ack);
    ws.send(JSON.stringify({message:'game-map',map:map}), ack);
    ws.send(JSON.stringify({message:'game-log',text:'> Добро пожаловать в dvach onlaen rogalique R230915 edition! Список фич игры в FAQ.'}), ack);
    wss.broadcast(JSON.stringify({message:'game-join',player:player}),ws);
    wss.broadcast(JSON.stringify({message:'game-log',text:'> Ловите ньюфага! Анон вкатился в игру.'}),ws);

    ws.on('message', function(message) {

        if(((new Date()).getTime() - lasttime) < 100){
            if(ddos++ > 10) ws.close();
            return;
        }

        lasttime = (new Date()).getTime();

        try {
            message = JSON.parse(message); //console.log('server received a message', message);
        }catch (e){
            console.log(e.name);
            message.message = '';
        }

        switch(message.message){
            case 'game-keydown':
                switch (message.keycode){
                    case 97:
                        playerMove(ws,wss,player,-16,16);
                        break;
                    case 99:
                        playerMove(ws,wss,player,16,16);
                        break;
                    case 103:
                        playerMove(ws,wss,player,-16,-16);
                        break;
                    case 105:
                        playerMove(ws,wss,player,16,-16);
                        break;
                    case 100:
                    case 37:
                        playerMove(ws,wss,player,-16,0);
                        break;
                    case 104:
                    case 38:
                        playerMove(ws,wss,player,0,-16);
                        break;
                    case 102:
                    case 39:
                        playerMove(ws,wss,player,16,0);
                        break;
                    case 98:
                    case 40:
                        playerMove(ws,wss,player,0,16);
                        break;
                }
                break;
            case 'game-chat':
                if(!(/^\s*$/g).test(message.text)){
                    var text = player.s + ': ' + message.text;
                    wss.broadcast(JSON.stringify({message:'game-log',text:text}),null);

                    if(yatyan.test(message.text)){
                        playerChange(ws,wss,player,'t');
                    }
                }
                break;
        }
    });

    ws.on('close', function(message){
        var index = players.indexOf(player);
        players.splice(index,1);
        clients.splice(index,1);
        wss.broadcast(JSON.stringify({message:'game-quit',index:index}),null);
        wss.broadcast(JSON.stringify({message:'game-log',text:'> Анон покинул игру.'}),null);

        console.log(addTime() + 'anon disconnected');
    });
});

function addTime(){
    return new Date().toTimeString().slice(0,8) + " ";
}