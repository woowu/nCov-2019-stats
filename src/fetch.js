#!/usr/bin/node --harmony
"use strict"

/**
 * Data fetched from APIs proviced from https://github.com/BlankerL/DXY-2019-nCoV-Crawler.git 
 */

const fs = require('fs');
const jsonfile = require('jsonfile');
const superagent = require('superagent');

const serviceRoot = 'https://lab.isaaclin.cn/nCoV';

const getOverallHist = (cb) => {
    const url = serviceRoot + '/api/overall';
    console.log(`fetching from url ${url}`);
    superagent
        .get(url)
        .type('json')
        .set('Content-Type', 'application/json')
        .query({latest: 0})
        .end((err, res) => {
            if (err) throw err;
            console.log(`returned from url ${url}. code=${res.status}`);
            if (res.status != 200) throw new Error('status ' + res.status);
            cb(JSON.parse(res.text));
        });
};

const getAreaHist = (cb) => {
    const url = serviceRoot + '/api/area';
    console.log(`fetching from url ${url}`);
    superagent
        .get(url)
        .type('json')
        .set('Content-Type', 'application/json')
        .query({latest: 0})
        .end((err, res) => {
            if (err) throw err;
            console.log(`returned from url ${url}. code=${res.status}`);
            if (res.status != 200) throw new Error('status ' + res.status);
            cb(JSON.parse(res.text));
        });
};

const handleOverallHist = (json) => {
    json.results.forEach(d => {
        d.localeTime = new Date(d.updateTime).toLocaleString();
    });
    const filename = 'overall-hist.json';
    console.log(`saving json file ${filename}`);
    jsonfile.writeFile(filename, json, err => {
        if (err) throw err;
        getAreaHist(handleAreaHist);
    });
};

const handleAreaHist = (json) => {
    const filename = 'area-hist.json';
    console.log(`saving json file ${filename}`);
    jsonfile.writeFile(filename, json, err => {
        if (err) throw err;
    });
};

getOverallHist(handleOverallHist);
