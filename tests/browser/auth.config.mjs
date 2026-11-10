import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:['auth.spec.mjs'],workers:1,maxFailures:1,timeout:30000,
 use:{baseURL:'http://127.0.0.1:8899',viewport:{width:402,height:681},screen:{width:402,height:874},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'America/New_York'},
 projects:[{name:'chromium-402',use:{browserName:'chromium',launchOptions:process.env.KETO_CHROMIUM_EXECUTABLE?{executablePath:process.env.KETO_CHROMIUM_EXECUTABLE}:{}}},{name:'webkit-402',use:{browserName:'webkit'}}],
 webServer:{cwd:new URL('../..',import.meta.url).pathname,command:'node tests/browser/serve.mjs',url:'http://127.0.0.1:8899',reuseExistingServer:false},
 outputDir:new URL('../../qa/mobile-browser/c18-results',import.meta.url).pathname,reporter:[['list'],['json',{outputFile:'qa/mobile-browser/c18-results.json'}]]});
