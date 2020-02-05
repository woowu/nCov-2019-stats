#!/usr/bin/node --harmony
"use strict"
const fs = require('fs');
const {spawn} = require('child_process');
const moment = require('moment-timezone');
const pad = require('pad');
const jsonfile = require('jsonfile');

/**
 * The initial series object has the form:
 * {
 *   prev: null,
 *   ymd: null,
 *   resolved: [],
 * }.
 *
 * This function will be call with d's in reversed time order.
 */
const timeSeriesAppend = (series, d) => {
    /* ymd used to check day switch */
    const ymd = moment(d.updateTime).format('YYYY-MM-DD');
    /* time provides a stand time-stamp */
    d.time = parseInt(d.updateTime / 1000);
    d.localeTime = moment(d.updateTime).format('YYYY-MM-DD HH:mm:ss');
    /* date is time converted to the beginning of the day */
    d.date = parseInt(
        moment(moment(d.updateTime).format('YYYY-MM-DDT00:00:00'))
        .valueOf() / 1000
    );

    if (ymd == series.ymd) return;
    series.ymd = ymd;

    if (! series.prev) {
        series.prev = d;
        series.prev.confirmedIncr = 0;
        series.prev.curedIncr = 0;
        series.prev.deadIncr = 0;
        d.confirmedDerivertive = 0;
    } else {
        series.prev.confirmedIncr = series.prev.confirmedCount - d.confirmedCount;
        series.prev.curedIncr = series.prev.curedCount - d.curedCount;
        series.prev.deadIncr = series.prev.deadCount - d.deadCount;
        d.confirmedDerivertive = series.prev.confirmedIncr;
        series.prev = d;
    }
    series.resolved.push(d);
};

const appendCsv = (series, fields, stream) => {
    series.forEach((d, i) => {
        fields.forEach(f => {
            stream.write(d.time + ',');
            stream.write('"' + d.localeTime + '",');
            stream.write(d.date + ',');
            stream.write(f[1] + ',');
            if (typeof f[0] == 'function')
                stream.write(f[0](d) + '\n');
            else
                stream.write(d[f[0]] + '\n');
        });
    });
};

const plotCsv = (script, csv) => {
    const p = spawn(script, [csv])
        .on('data', data => {
            console.log(data);
        })
        .on('error', err => {
            console.log(err);
        })
        .on('exit', code => {
            if (code) console.log(`plot ${csv} failed: ${code}`);
        });
    p.stderr.on('data', data => {
        console.error(data.toString());
    });
};

/**
 * hist is an array, most recent date first
 */
const overall = (hist) => {
    const series = {
        prev: null,
        resolved: [],
    };

    hist.forEach(d => {
        d.title = '';
        timeSeriesAppend(series, d);
    });

    const csv = 'overall-daily.csv';
    const ws = fs.createWriteStream(csv);
    ws.write('# 2019-nCov 全国\n');
    ws.write('time,localeTime,date,name,value\n');
    appendCsv(series.resolved,
        [
            ['suspectedCount', '疑似'],
            ['confirmedCount', '确诊'],
            ['curedCount', '治愈'],
            ['deadCount', '死亡'],
            [d => { return d.confirmedCount + d.suspectedCount; }, '疑似+确诊'],
        ],
        ws);
    ws.end();
    plotCsv('./src/plot.R', csv);
};

const area = (hist) => {
    const provinceData = {
        '420000': {
            title: '湖北',
            prev: null,
            ymd: null,
            resolved: [],
        },
        '440000': {
            title: '广东',
            prev: null,
            ymd: null,
            resolved: [],
        },
        '310000': {
            title: '上海',
            prev: null,
            ymd: null,
            resolved: [],
        },
        '110000': {
            title: '北京',
            prev: null,
            ymd: null,
            resolved: [],
        },
        '520000': {
            title: '贵州',
            prev: null,
            ymd: null,
            resolved: [],
        },
        '430000': {
            title: '湖南',
            prev: null,
            ymd: null,
            resolved: [],
        },
        /*
        '330000': {
            title: '浙江',
            prev: null,
            ymd: null,
            resolved: [],
        },
        */
    };
    const provinceFilter = Object.keys(provinceData);

    hist.forEach(d => {
        d.locationId = d.locationId + '';
        if (! provinceFilter.includes(d.locationId)) return;
        const thisProvince = provinceData[d.locationId]
        d.title = thisProvince.title;
        timeSeriesAppend(thisProvince, d);
    });

    var csv = 'area-daily.csv';
    var ws = fs.createWriteStream(csv);
    ws.write('# 2019-nCov 确诊\n');
    ws.write('time,localeTime,date,name,value\n');
    provinceFilter.forEach(p => {
        appendCsv(provinceData[p].resolved,
            [
                ['confirmedCount', provinceData[p].title],
            ],
            ws);
    });
    ws.end();
    plotCsv('./src/plot.R', csv);

    var csv = 'area-derivertive.csv';
    var ws = fs.createWriteStream(csv);
    ws.write('# 2019-nCov 新增确诊\n');
    ws.write('time,localeTime,date,name,value\n');
    provinceFilter.forEach(p => {
        const noLast = provinceData[p].resolved.slice(1);
        appendCsv(noLast,
            [
                ['confirmedDerivertive', provinceData[p].title],
            ],
            ws);
    });
    ws.end();
    plotCsv('./src/plotl.R', csv);
};

jsonfile.readFile('overall-hist.json', (err, obj) => {
    overall(obj.results);
    overall(obj.results);
});
jsonfile.readFile('area-hist.json', (err, obj) => {
    area(obj.results);
});
