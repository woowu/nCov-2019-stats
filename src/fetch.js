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
    superagent
        .get(serviceRoot + '/api/overall')
        .type('json')
        .set('Content-Type', 'application/json')
        .query({latest: 0})
        .end((err, res) => {
            if (err) throw err;
            if (res.status != 200) throw new Error('status ' + res.status);
            cb(JSON.parse(res.text));
        });
};

const getAreaHist = (cb) => {
    superagent
        .get(serviceRoot + '/api/area')
        .type('json')
        .set('Content-Type', 'application/json')
        .query({latest: 0})
        .end((err, res) => {
            if (err) throw err;
            if (res.status != 200) throw new Error('status ' + res.status);
            cb(JSON.parse(res.text));
        });
};

const handleOverallHist = (json) => {
    json.results.forEach(d => {
        d.localeTime = new Date(d.updateTime).toLocaleString();
    });
    jsonfile.writeFile('overall-hist.json', json, err => {
        if (err) throw err;
    });
};

const handleAreaHist = (json) => {
    jsonfile.writeFile('area-hist.json', json, err => {
        if (err) throw err;
    });
};

getOverallHist(handleOverallHist);
getAreaHist(handleAreaHist);
