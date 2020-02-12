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

    if (ymd == series.ymd) return;
    series.ymd = ymd;

    d.confirmedIncr = 0;
    d.suspectedIncr = 0;
    d.curedIncr = 0;
    d.deadIncr = 0;
    if (series.prev) {
        series.prev.confirmedIncr = series.prev.confirmedCount - d.confirmedCount;
        series.prev.suspectedIncr = series.prev.suspectedCount - d.suspectedCount;
        series.prev.curedIncr = series.prev.curedCount - d.curedCount;
        series.prev.deadIncr = series.prev.deadCount - d.deadCount;
    }
    series.prev = d;
    series.resolved.push(d);
};

const dataSetToCsv = (series, fields) => {
    var lines = '';
    series.forEach((d, i) => {
        fields.forEach(f => {
            lines += d.time + ',';
            lines += f[1] + ',';
            if (typeof f[0] == 'function')
                lines += f[0](d).toString();
            else
                lines += d[f[0]].toString();
            lines += ' #' + d.localeTime + '\n';
        });
    });
    return lines;
};

const dataSetToCsv2 = (series, fields) => {
    var lines = '';
    series.forEach((d, i) => {
        lines += d.time;
        fields.forEach(f => {
            if (typeof f[0] == 'function')
                lines += ',' + f[0](d);
            else
                lines += ',' + d[f[0]];
        });
        lines += '\n';
    });
    return lines;
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

    var csv = 'overall-daily.csv';
    var ws = fs.createWriteStream(csv);
    ws.write('# 2019-nCov 全国\n');
    ws.write('time,name,value\n');
    ws.write(dataSetToCsv(series.resolved,
        [
            ['suspectedCount', '疑似'],
            ['confirmedCount', '确诊'],
            ['curedCount', '治愈'],
            ['deadCount', '死亡'],
            [d => { return d.confirmedCount + d.suspectedCount; }, '疑似+确诊'],
        ]));
    ws.end();
    plotCsv('./src/plot.R', csv);

    csv = 'overall-derivertive.csv';
    ws = fs.createWriteStream(csv);
    ws.write('# 2019-nCov 全国新增\n');
    ws.write('time,name,value\n');
    ws.write(dataSetToCsv(series.resolved,
        [
            /*['suspectedIncr', '新增疑似'],*/
            ['confirmedIncr', '新增确诊'],
            ['curedIncr', '新增治愈'],
            ['deadIncr', '新增死亡'],
            /*[d => { return d.confirmedIncr + d.suspectedIncr; }, '新增疑似+确诊'],*/
        ]));
    ws.end();
    plotCsv('./src/plot.R', csv);
};

const area = hist => {
    const provinceData = {
        '000000': {
            title: '全国',
            prev: null,
            ymd: null,
            resolved: [],
        },
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
    ws.write('time,name,value\n');
    provinceFilter.forEach(p => {
        ws.write(dataSetToCsv(provinceData[p].resolved,
            [
                ['confirmedCount', provinceData[p].title],
            ]));
    });
    ws.end();
    plotCsv('./src/plotl.R', csv);

    var csv = 'area-derivertive.csv';
    var ws = fs.createWriteStream(csv);
    ws.write('# 2019-nCov 地区新增确诊\n');
    ws.write('time,name,value\n');
    provinceFilter.forEach(p => {
        ws.write(dataSetToCsv(provinceData[p].resolved.slice(0, -1),
            [
                ['confirmedIncr', provinceData[p].title],
            ]));
    });
    ws.end();
    plotCsv('./src/plotl.R', csv);
};

jsonfile.readFile('overall-hist.json', (err, overallHist) => {
    overall(overallHist.results);
    jsonfile.readFile('area-hist.json', (err, areaHist) => {
        overallHist.results.forEach(d => {
            d.locationId = '000000';
        });
        area(areaHist.results.concat(overallHist.results));
    });
});
