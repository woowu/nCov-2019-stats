#!/usr/bin/node --harmony
"use strict"
const fs = require('fs');
const {spawn} = require('child_process');
const moment = require('moment');
const pad = require('pad');
const jsonfile = require('jsonfile');
const argv = require('yargs').argv;

/* own defined fake location IDs */
const locChinaMainland = '999000';

const mainlandHubeiLocs = {
    '999000': {
        title: '中国大陆',
    },
    '420000': {
        title: '湖北',
    },
};

const mainlandExHubeiLocs = {
    '440000': {
        title: '广东',
    },
    '310000': {
        title: '上海',
    },
    '110000': {
        title: '北京',
    },
    '520000': {
        title: '贵州',
    },
    '430000': {
        title: '湖南',
    },
};

const worldLocations = {
    '951002': {
        title: 'Japan',
    },
    '965008': {
        title: 'Italy',
    },
    '971002': {
        title: 'USA',
    },
    '951004': {
        title: 'Korea',
    },
    '952009': {
        title: 'Singapore',
    },
    '810000': {
        title: 'Hongkong',
    },
    /*'710000': {
        title: 'Taiwan',
    },*/
    '955007': {
        title: 'Iran',
    },
    '0': {
        title: 'Diamond Princess Cruise Ship',
    },
};

const compare1Locs = {
    /*
    'Hubei': {
        title: '湖北',
    },
    */
    'Mainland China Ex. Hubei': {
        title: 'Mainland China Ex. Hubei',
    },
    'World Ex. Mainland China': {
        title: 'World Ex. Mainland China',
    },
};

var endDate;

const preProcessHistData = hist => {
    const extracted = []; 
    const byLocation = {};
    const byTag = {};

    const tag = d => {
        if (d.countryEnglishName == 'China') {
            if (d.provinceEnglishName == 'Hubei')
                d.tag = 'Hubei';
            else
                d.tag = 'Mainland China Ex. Hubei';
        } else
            d.tag = 'World Ex. Mainland China';
    };

    const extract = () => {
        hist.results.forEach(d => {
            const p = {};

            p.time = parseInt(d.updateTime / 1000);
            p.localeTime = moment(d.updateTime).format('YYYY-MM-DD HH:mm:ss');
            p.alignedTime = parseInt(moment(
                moment(d.updateTime).format('YYYY-MM-DD') + ' 00:00:00'
            ).valueOf() / 1000);

            if (endDate && p.alignedTime > parseInt(endDate.valueOf() / 1000))
                return;

            /* copy interested fields and normalize data types
             */
            [
                'locationId',
                'countryName',
                'countryEnglishName',
                'provinceName',
                'provinceEnglishName',
            ].forEach(f => {
                if (d.hasOwnProperty(f)) p[f] = d[f];
            });
            [
                'updateTime',
                'confirmedCount',
                'suspectedCount',
                'curedCount',
                'deadCount',
            ].forEach(f => {
                if (d.hasOwnProperty(f)) p[f] = +d[f];
            });

            if (p.hasOwnProperty('locationId'))
                tag(p);

            if (! p.hasOwnProperty('locationId'))
                p.locationId = locChinaMainland;

            extracted.push(p);
        });
    };

    const group = (result, field) => {
        extracted.forEach(d => {
            if (d.deleted) return;
            if (! result[d[field]])
                result[d[field]] = [d];
            else
                result[d[field]].push(d);
        });

        Object.keys(result).forEach(key => {
            result[key] = result[key].sort((a, b) => {
                return a.updateTime - b.updateTime;
            });
        });
    };

    const keepDaily = () => {
        Object.keys(byLocation).forEach(loc => {
            const daily = [];
            var dayLast = null;

            byLocation[loc].forEach(d => {
                const last = daily.slice(-1)[0];
                if (last && d.alignedTime == last.alignedTime) {
                    const e = daily.pop();
                    e.deleted = true;
                }
                daily.push(d);
            });

            byLocation[loc] = daily;
        });
    };

    const derivertive = () => {
        const fields = [
            'confirmedIncr', 'suspectedIncr',
            'curedIncr', 'deadIncr',
        ];
        const fieldsRef = [
            'confirmedCount', 'suspectedCount',
            'curedCount', 'deadCount',
        ];
        Object.keys(byLocation).forEach(loc => {
            byLocation[loc].forEach((d, i) => {
                if (! i)
                    fields.forEach(f => {
                        d[f] = 0;
                    });
                else
                    fields.forEach((f, j) => {
                        d[f] = d[fieldsRef[j]]
                            - byLocation[loc][i - 1][fieldsRef[j]];
                    });
            });
        });
    };

    const tagCombineTime = () => {
        Object.keys(byTag).forEach(tag => {
            const combined  = [];
            var prevTime = null;
            var sum;

            byTag[tag].forEach(d => {
                if (prevTime == null || d.alignedTime != prevTime) {
                    if (prevTime) {
                        combined.push(sum);
                    }
                    sum = {
                        alignedTime: d.alignedTime,
                        time: d.alignedTime,
                        localeTime: moment(d.alignedTime * 1000)
                            .format('YYYY-MM-DD'),
                        confirmedIncr: d.confirmedIncr,
                        deadIncr: d.deadIncr,
                    };
                    prevTime = d.alignedTime;
                } else {
                    sum.confirmedIncr += d.confirmedIncr;
                    sum.deadIncr += d.deadIncr;
                }
            });
            if (sum) combined.push(sum);
            byTag[tag] = combined;
        });
    };

    extract();
    group(byLocation, 'locationId');
    keepDaily();
    derivertive();

    /* Meant to do the tagging only for area orgnized data
     */
    if (hist.results[0].hasOwnProperty('locationId')) {
        group(byTag, 'tag');
        tagCombineTime();
    }

    return {byLocation, byTag};
};

const dataSetToCsv = (series, fields) => {
    var lines = '';
    series.forEach((d, i) => {
        fields.forEach(f => {
            lines += d.alignedTime + ',';
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

const csvOverall = (overall) => {
    const series = overall[locChinaMainland];
    var csv = 'mainland-overall.csv';
    var ws = fs.createWriteStream(csv);
    ws.write('# COVID-19 主要总量指标（中国）\n');
    ws.write('time,name,value\n');
    ws.write(dataSetToCsv(series,
        [
            ['suspectedCount', '疑似'],
            ['confirmedCount', '确诊'],
            ['curedCount', '治愈'],
            ['deadCount', '死亡'],
        ]));
    ws.end();
    plotCsv('./src/plot.R', csv);

    csv = 'mainland-overall-daily.csv';
    ws = fs.createWriteStream(csv);
    ws.write('# COVID-19 主要增量指标（中国）\n');
    ws.write('time,name,value\n');
    ws.write(dataSetToCsv(series,
        [
            ['confirmedIncr', '每日病例'],
            ['curedIncr', '每日治愈'],
            ['deadIncr', '每日死亡'],
        ]));
    ws.end();
    plotCsv('./src/plot.R', csv);
};

const csvArea = (series, locationsTable, fieldName, csvName, csvTitle, rScript) => {
    const locations = Object.keys(locationsTable);
    const csv = csvName + '.csv';
    const ws = fs.createWriteStream(csv);

    ws.write(`# ${csvTitle}\n`);
    ws.write('time,name,value\n');

    Object.keys(series).forEach(loc => {
        if (! locationsTable.hasOwnProperty(loc)) return;
        const locTitle = locationsTable[loc].title;
        ws.write(dataSetToCsv(series[loc],
            [
                [fieldName, locTitle],
            ]));
    });

    ws.end();
    plotCsv(rScript, csv);
};

if (argv.endDate != null) endDate = moment(argv.endDate);

jsonfile.readFile('overall-hist.json', (err, overallHist) => {
    const {byLocation: overall}
        = preProcessHistData(overallHist);

    csvOverall(overall);

    jsonfile.readFile('area-hist.json', (err, areaHist) => {
        const {byLocation: area, byTag: tagged}
            = preProcessHistData(areaHist);

        csvArea(Object.assign({}, area, overall),
            mainlandHubeiLocs,
            'confirmedCount',
            'mainland-hubei',
            'COVID-19 累计确诊（湖北及全国）',
            './src/plot.R');
        csvArea(Object.assign({}, area, overall),
            mainlandHubeiLocs,
            'confirmedIncr',
            'mainland-hubei-daily',
            'COVID-19 每日病例（湖北及全国）',
            './src/plot.R');

        csvArea(area,
            mainlandExHubeiLocs,
            'confirmedCount',
            'mainland-ex-hubei',
            'COVID-19 累计确诊（除湖北外的部分省）',
            './src/plot.R');
        csvArea(area,
            mainlandExHubeiLocs,
            'confirmedIncr',
            'mainland-ex-hubei-daily',
            'COVID-19 每日病例（除湖北外的部分省）',
            './src/plot.R');

        csvArea(area,
            worldLocations,
            'confirmedCount',
            'world-ex-mainland-china',
            'COVID-19 Total Cases: Outside Mainland China',
            './src/plot.R');
        csvArea(area,
            worldLocations,
            'confirmedIncr',
            'world-ex-mainland-china-daily',
            'COVID-19 Daily Cases: Outside Mainland China',
            './src/plot.R');

        jsonfile.writeFile('debug.json', tagged);
        csvArea(tagged,
            compare1Locs,
            'confirmedIncr',
            'compare1-daily',
            'COVID-19 Daily Cases: China vs. World',
            './src/plot.R');
    });
});
