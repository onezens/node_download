/**
 * Created by Zhen on 2016/11/21.
 */



const http = require('http');
const fs = require('fs');
const path = require('path');

var args = process.argv.slice(2);

var videName = args[1] ? args[1] : '' ;
var baseUrl = args[0] ? args[0] : '';

baseUrl = baseUrl + '';
var isCompleted = false;
var dirPath = getDirPath();
var tempPath = path.join(dirPath, 'temp.json');
var saveSuccessArr = initArr();
var maxConnection = 20;

try{
    downloadList();
}catch(error){
    console.log(error);
    saveArr();
}

function initArr() {
    console.log('init arr');
    try {
        fs.statSync(tempPath);
        var data = fs.readFileSync(tempPath);
        var arr = JSON.parse(data);
        console.log(arr);
        return arr;

    }catch(error){
        //console.log(error);
        return [];
    }
}

function saveArr() {
    console.log('save');
    fs.writeFileSync(tempPath, JSON.stringify(saveSuccessArr));
}

var isFirst = true;
//在控制台按下ctrl+c 后会触发这个方法;
process.on('SIGINT', function() {
    //console.log('Hello');
    if(isFirst){
        saveArr();
        console.log('再次按下ctrl+c退出控制台');
        setTimeout(function(){
            isFirst = true;
        },3000);
    }else {
        process.exit();
}
isFirst = false;
});

function download(isStream, url,title, cb){
    http.get(url,function(res){
        //console.log(res.headers['content-type']);
        if(res.headers['content-type'] == 'application/octet-stream' && isStream){
            res.on('data', function(trunk){
                process.stdout.write('*');
                cb(trunk, title);
            });
            res.on('end',function(){
                cb(null, title);
            });
        }else {
            var data = null;
            res.on('data', function(trunk){
                process.stdout.write('*');
                data += trunk;
            });
            res.on('end',function(){
                cb(data, title);
            });
        }
    });
}

function downloadList() {
    analysisM3u8('index.m3u8', function(result){ // result 为最后一个index的值
        var count = parseInt(result[0])+1;
        var startCount = count<maxConnection ? count : maxConnection;
        var currentCount = startCount;
        for(var i=0;i<startCount; i++){
            var title = 'index' + i + '.ts';
            var listUrl = baseUrl + title;
            if(isCompleted) break;
            downloadStream(listUrl, title);
            function downloadStream(listUrl, title) {
                saveStream(listUrl, title, function(saveTitle){
                    var totalCount = saveSuccessArr.length; //已经下载的个数
                    console.log('\ntotal:'+ count + '   current:' + totalCount + '  save title:' + saveTitle);
                    if (count == totalCount){
                        if(!isCompleted){
                            isCompleted = true;
                            console.log('download completed!!!!!!!!!');
                            mergeData();
                        }
                    }else if( currentCount < count) {
                        currentCount++;
                        var title = 'index' + (currentCount-1) + '.ts';
                        var listUrl = baseUrl + title;
                        downloadStream(listUrl, title);
                    }

                });
            }
        }
    });
}

function mergeData() {
    var writePath = path.join(dirPath,videName+'.ts');
    var writeStream = fs.createWriteStream(writePath);
    var count = saveSuccessArr.length;
    var index = 0;
    write();
    function write() {
        var filePath = path.join(dirPath, 'index' + index +'.ts');
        console.log(filePath);
        var readStream = fs.createReadStream(filePath);
        readStream.on('data', function(trunk){
            writeStream.write(trunk);
            //console.log('#');
            process.stdout.write('#');
        });
        readStream.on('end', function(){
            index++;
            if(count == index){
                console.log('merge completed!!!!!!!!');
            }else {
                write();
            }
        });
    }

}


function analysisM3u8(url,cb) {
    console.log(baseUrl + url);
    download(false ,baseUrl + url, null, function(data){
        console.log('analysisM3u8 success!');
        var list = data.split(',');
        list.splice(0,1);
        var first = list[0];
        var last = list[list.length-1];
        //var firstHref = first.substring(first.indexOf('\n'), first.lastIndexOf('\n'));
        var lastHref = last.substring(last.indexOf('\n'), last.lastIndexOf('\n#'));
        //firstHref = firstHref.replace('index', '').replace('.ts', '');
        lastHref = lastHref.replace('index', '').replace('.ts', '');
        console.log(lastHref);
        cb([lastHref]);
    });
}

function getDirPath() {
    var savePath = path.join(__dirname, 'videos', videName);
    try {
        fs.statSync(savePath);
    }catch (error){
        fs.mkdirSync(savePath);
    }
    return savePath;
}


function saveStream(url, title,cb) {
    var savePath = getDirPath();
    savePath = path.join(savePath, title);
    if(saveSuccessArr.indexOf(title) == -1){
        var stream = fs.createWriteStream(savePath);
        console.log(url);
        download(true, url, title, function(data,title){
            if (data){
                stream.write(data);
            }else {
                saveSuccessArr.push(title);
                saveArr();
                cb(title);
            }
        });
    }else {
        cb(title);
    }

}
